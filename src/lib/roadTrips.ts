/**
 * Pages « trajet » (roadmap M5) : chaque axe de data/trips calculé au build pour tout le catalogue,
 * avec le moteur des grands trajets de Ma semaine (lib/map) : itinéraire le plus rapide sur le
 * graphe routier, bornes rapides IRVE à moins de 2 km du tracé, arrêts et minutes de charge sur
 * la courbe de chaque version, 130 km/h sur autoroute, été et hiver (-5 °C).
 *
 * Les itinéraires (graphe de 3 Mo, une exploration par ville de départ) sont mis en cache sur
 * disque (node_modules/.astro, conservé entre deux builds CI) tant que le graphe, les bornes et
 * la liste des axes ne changent pas ; les arrêts sont recalculés à chaque build depuis les fiches.
 * Module serveur : n'est importé que par les pages au build.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import type { Vehicle } from "@/data/schemas";
import { TRIP_AXES, type TripAxis } from "@/data/trips";
import { DETOUR, exploreFrom, haversine, nearbyNodes, parseGraph, type Reach, type RoadGraph } from "@/lib/map/roadGraph";
import { chargersOnRoute, planRoadTrip, type HwSpeed, type RoadPlan, type RouteCharger } from "@/lib/map/roadtrip";
import { weekVersions } from "@/lib/map/versions";
import { getAllVehicles, isStrictUtility } from "@/lib/vehicles";
import { getMarketStatus, getVehicleName } from "@/lib/seo";

const ROOT = process.cwd();
const GRAPH_FILE = path.join(ROOT, "public/carte/routes.bin.gz");
const BORNES_DIR = path.join(ROOT, "public/carte/bornes");
const CACHE_DIR = path.join(ROOT, "node_modules/.astro/evly-trips");
// À incrémenter dès que le calcul des itinéraires change
const ROUTE_VERSION = 1;
const CHARGER_TILE = 0.5;
/** Espacement des points gardés sur le tracé : assez fin pour placer les bornes à 2 km près */
const SPACING_M = 300;
export const TRIP_SPEED: HwSpeed = 130;
const NOT_CARS = new Set(["Fourgon", "Fourgonnette", "Combi utilitaire"]);

interface AxisRoute {
  km: number;
  coords: [number, number][];
  cum: [number, number, number][];
  chargers: RouteCharger[];
}

/* ── Itinéraires (cache disque) ────────────────────────────────── */

function fingerprint(): string {
  const h = crypto.createHash("sha1");
  h.update(String(ROUTE_VERSION));
  h.update(JSON.stringify(TRIP_AXES));
  h.update(fs.readFileSync(GRAPH_FILE));
  for (const f of fs.readdirSync(BORNES_DIR).sort()) h.update(f).update(fs.readFileSync(path.join(BORNES_DIR, f)));
  return h.digest("hex");
}

/** Nœud d'arrivée le plus rapide à rejoindre, dernier kilomètre compris (comme le worker de Ma semaine) */
function arrival(g: RoadGraph, reach: Reach, lat: number, lon: number) {
  let best: { node: number; lastKm: number; total: number } | null = null;
  for (const { node, d } of nearbyNodes(g, lat, lon, 10_000).slice(0, 12)) {
    if (Number.isNaN(reach.road[node])) continue;
    const lastKm = (d * DETOUR) / 1000;
    const total = reach.hw[node]! + reach.express[node]! + reach.road[node]! + lastKm;
    if (!best || total < best.total) best = { node, lastKm, total };
  }
  return best;
}

const round5 = (x: number) => Math.round(x * 1e5) / 1e5;
const round2 = (x: number) => Math.round(x * 100) / 100;

function routeTo(g: RoadGraph, reach: Reach, to: TripAxis["to"]): Omit<AxisRoute, "chargers"> | null {
  const a = arrival(g, reach, to.lat, to.lon);
  if (!a) return null;
  const nodes: number[] = [];
  for (let v = a.node; v >= 0; v = reach.prev[v]!) nodes.push(v);
  nodes.reverse();
  const coords: [number, number][] = [];
  const cum: [number, number, number][] = [];
  let last: [number, number] | null = null;
  nodes.forEach((v, i) => {
    const pt: [number, number] = [g.lon[v]! / 1e5, g.lat[v]! / 1e5];
    if (last && i < nodes.length - 1 && haversine(last[1], last[0], pt[1], pt[0]) < SPACING_M) return;
    coords.push([round5(pt[0]), round5(pt[1])]);
    cum.push([round2(reach.hw[v]!), round2(reach.express[v]!), round2(reach.road[v]!)]);
    last = pt;
  });
  const end = cum.at(-1)!;
  coords.push([to.lon, to.lat]);
  cum.push([end[0], end[1], round2(end[2] + a.lastKm)]);
  return { km: a.total, coords, cum };
}

/** Bornes des tuiles que traverse le tracé, marge de 3 km (comme lib/map/places, lues sur disque) */
function chargersAlong(coords: [number, number][]) {
  const keys = new Set<string>();
  const pad = 0.03;
  for (const [lon, lat] of coords)
    for (const dl of [-pad, pad])
      for (const dn of [-pad, pad]) keys.add(`${Math.floor((lat + dl) / CHARGER_TILE)}_${Math.floor((lon + dn) / CHARGER_TILE)}`);
  const out: { lat: number; lon: number; kw: number; points: number; name: string }[] = [];
  for (const key of keys) {
    const file = path.join(BORNES_DIR, `${key}.json`);
    if (!fs.existsSync(file)) continue;
    for (const [la, lo, kw, points, name] of JSON.parse(fs.readFileSync(file, "utf8")) as [number, number, number, number, string][])
      out.push({ lat: la / 1e4, lon: lo / 1e4, kw, points, name });
  }
  return out;
}

let routesCache: Record<string, AxisRoute> | null = null;

async function getAxisRoutes(): Promise<Record<string, AxisRoute>> {
  if (routesCache) return routesCache;
  const key = fingerprint();
  const file = path.join(CACHE_DIR, `${key}.json`);
  if (fs.existsSync(file)) return (routesCache = JSON.parse(fs.readFileSync(file, "utf8")));

  const t0 = Date.now();
  const raw = zlib.gunzipSync(fs.readFileSync(GRAPH_FILE));
  const graph = await parseGraph(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer);
  const routes: Record<string, AxisRoute> = {};
  // Une exploration par ville de départ sert tous ses axes
  const origins = new Map<string, TripAxis[]>();
  for (const a of TRIP_AXES) origins.set(a.from.name, [...(origins.get(a.from.name) ?? []), a]);
  for (const axes of origins.values()) {
    const from = axes[0]!.from;
    const reach = exploreFrom(graph, from.lat, from.lon);
    if (!reach) continue;
    for (const a of axes) {
      const r = routeTo(graph, reach, a.to);
      if (!r) continue;
      routes[a.slug] = { ...r, chargers: chargersOnRoute({ coords: r.coords, cum: r.cum }, chargersAlong(r.coords)) };
    }
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(routes));
  console.log(`[roadTrips] ${Object.keys(routes).length} itinéraires calculés en ${Math.round((Date.now() - t0) / 1000)} s`);
  return (routesCache = routes);
}

/* ── Le catalogue sur chaque axe ───────────────────────────────── */

export interface TripLeg {
  stops: number;
  chargeMin: number;
  driveMin: number;
  totalMin: number;
  /** Batterie à destination (0-1) */
  arrive: number;
  list: { name: string; kw: number; km: number; minutes: number; arrive: number; leave: number }[];
}

export interface TripRow {
  vehicle: Vehicle;
  name: string;
  /** Version retenue : la plus rapide du modèle sur ce trajet (identifiant de configuration pour le lien) */
  configId: string;
  version: string;
  price: number | null;
  /** Autonomie mesurée sur route, courbe de charge relevée */
  measured: boolean;
  curveMeasured: boolean;
  summer: TripLeg;
  /** null : par -5 °C, un tronçon sans borne rapide assez proche */
  winter: TripLeg | null;
}

export interface TripResult {
  axis: TripAxis;
  km: number;
  /** Temps de route seul, à 130 km/h sur autoroute */
  driveMin: number;
  rows: TripRow[];
  /** Modèles qui ne font pas ce trajet par les grands axes : pas de charge rapide, ou tronçon sans borne */
  unable: { name: string; slug: string; reason: "no-dc" | "gap" }[];
}

const legOf = (p: RoadPlan): TripLeg => ({
  stops: p.stops.length,
  chargeMin: p.chargeMinutes,
  driveMin: p.driveMinutes,
  totalMin: p.driveMinutes + p.chargeMinutes,
  arrive: p.arrive,
  list: p.stops.map((s) => ({ name: s.name, kw: s.kw, km: s.km, minutes: s.minutes, arrive: s.arrive, leave: s.leave })),
});

let resultsCache: Promise<TripResult[]> | null = null;

/** Tous les axes, chaque modèle dans sa version la plus rapide, du plus rapide au plus lent (été) */
export function getTripResults(): Promise<TripResult[]> {
  resultsCache ??= (async () => {
    const routes = await getAxisRoutes();
    const cars = getAllVehicles().filter((v) => !isStrictUtility(v) && !NOT_CARS.has(v.bodyType) && getMarketStatus(v) !== "discontinued");
    const versionsOf = new Map(cars.map((v) => [v.slug, weekVersions(v).versions]));
    const out: TripResult[] = [];
    for (const axis of TRIP_AXES) {
      const route = routes[axis.slug];
      if (!route) continue;
      const profile = { coords: route.coords, cum: route.cum };
      const rows: TripRow[] = [];
      const unable: TripResult["unable"] = [];
      for (const v of cars) {
        const name = getVehicleName(v);
        const fast = versionsOf.get(v.slug)!.filter((x) => x.charging.dcPeakKW > 0);
        if (!fast.length) {
          unable.push({ name, slug: v.slug, reason: "no-dc" });
          continue;
        }
        let best: { version: (typeof fast)[number]; plan: RoadPlan; price: number | null } | null = null;
        for (const version of fast) {
          const plan = planRoadTrip(profile, route.chargers, version.range, version.charging, "summer", TRIP_SPEED);
          if (plan.gapKm !== null) continue;
          const prices = v.configurations.filter((c) => version.configs.includes(c.id) && c.price_EUR).map((c) => c.price_EUR!);
          const price = prices.length ? Math.min(...prices) : null;
          const total = plan.driveMinutes + plan.chargeMinutes;
          const bestTotal = best ? best.plan.driveMinutes + best.plan.chargeMinutes : Infinity;
          if (!best || total < bestTotal - 0.5 || (Math.abs(total - bestTotal) <= 0.5 && (price ?? Infinity) < (best.price ?? Infinity)))
            best = { version, plan, price };
        }
        if (!best) {
          unable.push({ name, slug: v.slug, reason: "gap" });
          continue;
        }
        const winter = planRoadTrip(profile, route.chargers, best.version.range, best.version.charging, "winter", TRIP_SPEED);
        rows.push({
          vehicle: v,
          name,
          configId: best.version.configs[0] ?? best.version.id,
          version: best.version.label,
          price: best.price,
          measured: best.version.measured,
          curveMeasured: v.configurations.some((c) => best!.version.configs.includes(c.id) && c.chargingDC_confidence === "tested"),
          summer: legOf(best.plan),
          winter: winter.gapKm === null ? legOf(winter) : null,
        });
      }
      rows.sort((a, b) => a.summer.totalMin - b.summer.totalMin || (a.price ?? Infinity) - (b.price ?? Infinity));
      out.push({ axis, km: route.km, driveMin: rows[0]?.summer.driveMin ?? 0, rows, unable });
    }
    return out;
  })();
  return resultsCache;
}

export async function getTripResult(slug: string): Promise<TripResult | undefined> {
  return (await getTripResults()).find((r) => r.axis.slug === slug);
}

/* ── Textes ────────────────────────────────────────────────────── */

/** « 4 h 35 », « 45 min » (arrondi aux 5 minutes, comme Ma semaine) */
export function duration(min: number): string {
  const m = Math.max(5, Math.ceil(min / 5) * 5);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

export const stopsText = (n: number) => (n === 0 ? "sans arrêt" : `${n} ${n > 1 ? "arrêts" : "arrêt"}`);

export const tripTitle = (a: TripAxis) => `${a.from.name} → ${a.to.name}`;
