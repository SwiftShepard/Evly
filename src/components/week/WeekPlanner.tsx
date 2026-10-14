/**
 * « Ma semaine » : une semaine type avec un modèle du catalogue, depuis l'adresse
 * du visiteur (sorties, batterie jour par jour, recharges), et jusqu'où il va
 * sans recharger. Tout est calculé dans le navigateur ; rien n'est envoyé à Evly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapView, { type MapHandle, type Pin, type RouteLine, type ZoneLayer } from "./MapView";
import AddressField from "./AddressField";
import VehiclePicker from "./VehiclePicker";
import BrickRow from "./BrickRow";
import WeekTimeline from "./WeekTimeline";
import WeekCost from "./WeekCost";
import WeekMileage from "./WeekMileage";
import { CHARGING_LOSSES, ELEC_EUR_KWH, PUBLIC_EUR_KWH, fuelPrice, type FuelPrice } from "@/lib/map/fuel";
import ReachList from "./ReachList";
import { CategoryIcon } from "./icons";
import ShareBox from "./ShareBox";
import { BRICK_KINDS, DEFAULT_BRICKS, fromLegacy, newBrick, sanitizeBricks, type Brick } from "./bricks";
import { readShared, type SharedWeek } from "@/lib/map/share";
import type { Driven, Place, WeekVehicle } from "./types";
import { budgetFor, rangeProfile, type Season } from "@/lib/map/energy";
import { computeTrips, computeZones, loadRoads, setOrigin } from "@/lib/map/client";
import { chargersAround, loadDestinations, placesAround, type Charger, type PoiPlace } from "@/lib/map/places";
import { departurePoint, roadRoute } from "@/lib/map/route";
import { haversine } from "@/lib/map/roadGraph";
import { DAYS, simulateWeek, type Outing, type Scenario, type WeekResult } from "@/lib/map/week";
import { readTrip, writeTrip } from "@/lib/trip";
import { formatKm, formatNumber } from "@/lib/format";
import { url } from "@/lib/url";
import { ArrowDown, ChevronDown, PanelLeftClose, Plus } from "lucide-react";

interface Props {
  vehicles: WeekVehicle[];
}

type Tab = "week" | "reach";
type TripKind = "return" | "oneway";
type Status = "idle" | "loading" | "ready" | "far" | "error";

/** Grandes enseignes, préférées tant qu'elles ne sont pas beaucoup plus loin (facteur de distance) */
const BRANDS: Record<string, RegExp> = {
  courses: /carrefour|leclerc|intermarch|lidl|aldi|super u|hyper u|auchan|casino|netto|monoprix|grand frais|match|cora/i,
  bricolage: /leroy merlin|castorama|brico|weldom|gedimat|tout faire|point p|bricorama/i,
};
const BRAND_PULL: Record<string, number> = { courses: 0.6, bricolage: 0.3 };

/** Sites de balade, par ordre de préférence */
const BALADE_KINDS = ["chateau", "site", "nature", "parc", "panorama", "plage", "zoo", "musee", "patrimoine", "sommet", "monument"];

const STORE_KEY = "evly-semaine";
const ROUTES_URL = "/carte/routes.bin.gz";

interface Saved {
  home: Place | null;
  work: Place | null;
  vehicles: string[];
  /** Version choisie par modèle (slug -> identifiant de version) */
  versions: Record<string, string>;
  /** Volet des réglages ouvert (ordinateur) */
  drawer: boolean;
  /** Une borne au travail */
  workCharging: boolean;
  /** Prix du kWh payé à la maison et au travail (€) */
  prices: { home: number; work: number };
  /** Lieu choisi par brique (identifiant de brique -> lieu) */
  places: Record<string, Place>;
  /** Semaine type : briques empilées, travail en tête */
  items: Brick[];
  scenario: Scenario | null;
  season: Season;
  tab: Tab;
}

const DEFAULT_SAVED: Saved = { home: null, work: null, vehicles: [], versions: {}, drawer: true, workCharging: false, prices: { home: ELEC_EUR_KWH, work: ELEC_EUR_KWH }, places: {}, items: DEFAULT_BRICKS, scenario: null, season: "winter", tab: "week" };

function readSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // Réglages d'avant les briques : interrupteurs d'une liste fixe
      const items = sanitizeBricks(s.items) ?? (s.on ? fromLegacy(s.on) : DEFAULT_BRICKS);
      return { ...DEFAULT_SAVED, ...s, items };
    }
  } catch {
    /* stockage indisponible */
  }
  return DEFAULT_SAVED;
}

function writeSaved(s: Saved) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* stockage indisponible : le réglage vaut pour la page en cours */
  }
}

/** Résultat d'un trajet domicile -> lieu : aller simple, batterie par modèle et saison (« slug:saison »), tracé */
interface Leg {
  km: number;
  used: Record<string, number>;
  coords: [number, number][] | null;
}

/** Ce que veut dire chaque façon de recharger, sous la bascule */
const SCENARIO_HINT: Record<Scenario, string> = {
  nightly: "Branchée chaque soir à la maison, jusqu'à 80 %.",
  weekly: "Branchée à la maison seulement quand il le faut.",
  topup: "Pas de prise chez vous : une recharge d'appoint sur une borne publique.",
};

/** Couleurs des modèles comparés : olive (le premier), terre cuite, bleu ardoise */
const COMPARE_COLORS = ["#3a5c12", "#b4532a", "#2f6a8a"];
const MAX_COMPARED = 3;
/** Puissance à partir de laquelle une borne compte comme rapide (kW) */
const FAST_KW = 43;

const pct = (v: number) => `${Math.round(Math.max(0, v) * 100)} %`;
const dayName = (d: number) => (DAYS[d] ?? "").toLowerCase();
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function WeekPlanner({ vehicles }: Props) {
  const bySlug = useMemo(() => new Map(vehicles.map((v) => [v.slug, v])), [vehicles]);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [origin, setOriginKey] = useState(0);
  const [options, setOptions] = useState<Record<string, PoiPlace[]>>({});
  const [legs, setLegs] = useState<Record<string, Leg>>({});
  const [stopCharger, setStopCharger] = useState<{ charger: Charger; atShop: boolean } | null>(null);
  const [zones, setZones] = useState<ZoneLayer[]>([]);
  const [tripKind, setTripKind] = useState<TripKind>("return");
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [live, setLive] = useState<number | null>(null);
  /** Kilomètres et batterie consommée depuis lundi, pendant la lecture */
  const [liveTotals, setLiveTotals] = useState<{ km: number; used: number } | null>(null);
  const [fuel, setFuel] = useState<FuelPrice | null>(null);
  const [sharedView, setSharedView] = useState(false);
  const [focus, setFocus] = useState<{ key: string; place: Place; coords: [number, number][] | null } | null>(null);
  const mapRef = useRef<MapHandle>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [desktop, setDesktop] = useState(false);
  const playToken = useRef(0);
  const workChanged = useRef(false);
  /** Champ « Comparer avec un autre modèle » ouvert */
  const [adding, setAdding] = useState(false);
  /** Brique tout juste ajoutée : elle s'ouvre pour qu'on choisisse ses jours et son lieu */
  const [fresh, setFresh] = useState<string | null>(null);

  // Réglages enregistrés, semaine partagée (#semaine=…) ou modèle demandé par la fiche (?v=slug)
  const loadOwn = useCallback(() => {
    const s = readSaved();
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get("v");
    let list = s.vehicles.filter((slug) => bySlug.has(slug));
    let versions = s.versions;
    if (fromUrl && bySlug.has(fromUrl)) {
      list = [fromUrl];
      // Version choisie sur la fiche (?config=…)
      const config = params.get("config");
      const version = config ? bySlug.get(fromUrl)!.versions.find((x) => x.configs.includes(config)) : undefined;
      if (version) versions = { ...versions, [fromUrl]: version.id };
    }
    const scenario = s.scenario ?? (readTrip().homeCharging ? "weekly" : "topup");
    setSaved({ ...s, vehicles: list.slice(0, MAX_COMPARED), versions, scenario });
  }, [bySlug]);

  useEffect(() => {
    const shared = readShared();
    if (shared) {
      setSharedView(true);
      setSaved({
        ...DEFAULT_SAVED,
        home: shared.home,
        work: shared.work,
        vehicles: shared.vehicle && bySlug.has(shared.vehicle) ? [shared.vehicle] : [],
        versions: shared.versions,
        places: shared.places,
        items: sanitizeBricks(shared.items) ?? fromLegacy(shared.on ?? {}),
        scenario: (["nightly", "weekly", "topup"] as const).find((k) => k === shared.scenario) ?? "weekly",
        season: shared.season as Season,
        tab: shared.tab as Tab,
        workCharging: shared.workCharging,
      });
    } else loadOwn();
    loadRoads(url(ROUTES_URL)).catch(() => setStatus("error"));
  }, [bySlug, loadOwn]);

  // Une semaine partagée se consulte sans écraser la sienne
  useEffect(() => {
    if (saved && !sharedView) writeSaved(saved);
  }, [saved, sharedView]);

  const update = useCallback((patch: Partial<Saved>) => setSaved((s) => (s ? { ...s, ...patch } : s)), []);

  // Le volet ne se replie que sur ordinateur ; sur mobile, réglages et carte s'empilent
  useEffect(() => {
    const mq = matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const drawerOpen = !desktop || (saved?.drawer ?? true);
  // Place que le volet ouvert prend sur la carte : les cadrages la laissent libre
  const drawerOpenRef = useRef(drawerOpen);
  drawerOpenRef.current = drawerOpen;
  const leftInset = useCallback(() => {
    const el = drawerRef.current;
    if (!el || !drawerOpenRef.current || !matchMedia("(min-width: 1024px)").matches) return 0;
    return el.getBoundingClientRect().right;
  }, []);

  const home = saved?.home ?? null;
  // Modèles choisis, chacun dans sa version (celle de la fiche par défaut)
  const chosen: Driven[] = useMemo(
    () =>
      (saved?.vehicles ?? []).flatMap((slug) => {
        const v = bySlug.get(slug);
        if (!v) return [];
        // Version mémorisée (ou configuration de la fiche, regroupée dans une version)
        const picked = saved?.versions[slug];
        const version =
          v.versions.find((x) => x.id === picked || (!!picked && x.configs.includes(picked))) ??
          v.versions.find((x) => x.id === v.defaultVersion) ??
          v.versions[0]!;
        return [{ ...v, key: `${slug}@${version.id}`, version, range: version.range, charging: version.charging, measured: version.measured }];
      }),
    [saved?.vehicles, saved?.versions, bySlug]
  );
  const vehicle = chosen[0];
  const chosenKey = chosen.map((v) => v.key).join(",");
  const season: Season = saved?.season ?? "winter";
  const scenario: Scenario = saved?.scenario ?? "weekly";
  const tab: Tab = saved?.tab ?? "week";
  const workCharging = saved?.workCharging ?? false;

  // Exploration du réseau depuis le domicile
  useEffect(() => {
    if (!home) return;
    let stale = false;
    setStatus("loading");
    loadRoads(url(ROUTES_URL))
      .then(() => setOrigin(home.lat, home.lon))
      .then((found) => {
        if (stale) return;
        setStatus(found ? "ready" : "far");
        if (found) setOriginKey((n) => n + 1);
      })
      .catch(() => !stale && setStatus("error"));
    return () => {
      stale = true;
    };
  }, [home]);

  // Lieux proposés autour du domicile
  useEffect(() => {
    if (!home) return;
    let stale = false;
    const cats = BRICK_KINDS.filter((k) => k.cat !== "travail" && k.cat !== "balade").map((k) => k.cat);
    Promise.all([
      ...cats.map(async (cat) => {
        let found = await placesAround(home.lat, home.lon, [cat], 12);
        if (found.length < 3) found = await placesAround(home.lat, home.lon, [cat], 30);
        // Une grande enseigne un peu plus loin passe avant la petite boutique d'à côté
        const brands = BRANDS[cat];
        const weight = (p: PoiPlace) => (brands?.test(p.name) ? p.d * BRAND_PULL[cat]! : p.d);
        return [cat, found.sort((a, b) => weight(a) - weight(b)).slice(0, 8)] as const;
      }),
      loadDestinations().then((all) => {
        const rank = (k: string) => BALADE_KINDS.indexOf(k);
        const near = all
          .filter((d) => d.kind !== "ville" && rank(d.kind) >= 0)
          .map((d) => ({ cat: d.kind, name: d.name, lat: d.lat, lon: d.lon, d: haversine(home.lat, home.lon, d.lat, d.lon) }))
          .filter((d) => d.d >= 8_000 && d.d <= 45_000)
          // Un bon but de balade : à une petite demi-heure ; un site de chaque type, du plus parlant au moins parlant
          .sort((a, b) => Math.abs(a.d - 22_000) - Math.abs(b.d - 22_000));
        const picked: PoiPlace[] = [];
        for (let round = 0; picked.length < 8 && round < 4; round++)
          for (const kind of BALADE_KINDS) {
            const next = near.filter((d) => d.cat === kind && !picked.includes(d))[0];
            if (next && picked.length < 8) picked.push(next);
          }
        return ["balade", picked] as const;
      }),
    ]).then((entries) => {
      if (!stale) setOptions(Object.fromEntries(entries));
    });
    return () => {
      stale = true;
    };
  }, [home]);

  // Semaine type : briques empilées, travail en tête
  const items: Brick[] = saved?.items ?? DEFAULT_BRICKS;
  const itemsKey = JSON.stringify(items);

  // Lieu retenu pour chaque brique : celui choisi, sinon le plus proche proposé qu'aucune
  // autre brique de la même catégorie n'occupe (deux séances de sport : deux salles)
  const places = useMemo(() => {
    const out: Record<string, Place | null> = {};
    const taken = new Set<string>();
    const keyOf = (pl: { lat: number; lon: number }) => `${pl.lat.toFixed(5)},${pl.lon.toFixed(5)}`;
    for (const b of items) if (saved?.places[b.id]) taken.add(keyOf(saved.places[b.id]!));
    for (const b of items) {
      if (b.id === "travail") out[b.id] = saved?.work ?? null;
      else if (saved?.places[b.id]) out[b.id] = saved.places[b.id]!;
      else {
        const free = options[b.cat]?.find((o) => !taken.has(keyOf(o)));
        if (free) taken.add(keyOf(free));
        out[b.id] = free ? { label: free.name, lat: free.lat, lon: free.lon } : null;
      }
    }
    return out;
  }, [saved?.places, saved?.work, options, itemsKey]);
  const placeKey = JSON.stringify(places);
  // Recharge d'appoint : pendant les premières courses de la semaine (dernier jour coché)
  const shopping = items.find((b) => b.cat === "courses" && b.days.length);

  // Trajets domicile -> lieux : batterie (grands axes, local) et tracé précis (Valhalla)
  useEffect(() => {
    if (!origin || !vehicle || !home) return;
    let stale = false;
    const ids = items.filter((b) => places[b.id]).map((b) => b.id);
    const points = ids.map((id) => places[id]!);
    const keys = chosen.flatMap((v) => [`${v.key}:summer`, `${v.key}:winter`]);
    const profiles = chosen.flatMap((v) => [rangeProfile(v.range, "summer"), rangeProfile(v.range, "winter")]);
    Promise.all([
      computeTrips(points, profiles, true),
      // Tous les trajets partent du même point de la route, celui du domicile
      departurePoint(home).then((start) =>
        Promise.all(points.map((p) => (haversine(home.lat, home.lon, p.lat, p.lon) < 120_000 ? roadRoute(start, p) : null)))
      ),
    ]).then(([trips, routes]) => {
      if (stale) return;
      const next: Record<string, Leg> = {};
      ids.forEach((id, k) => {
        const t = trips[k];
        const r = routes[k];
        if (!t) return;
        // Kilomètres du tracé précis quand on l'a, consommation au rythme des grands axes
        const km = r?.km ?? t.km;
        const scale = t.km > 0 ? km / t.km : 1;
        // Le tracé part du repère du domicile et finit sur celui du lieu, quel que soit le point d'accroche
        const line = r?.coords ?? t.path;
        const place = places[id]!;
        const coords: [number, number][] | null = line ? [[home.lon, home.lat], ...line, [place.lon, place.lat]] : null;
        next[id] = { km, used: Object.fromEntries(keys.map((key, i) => [key, (t.used[i] ?? 0) * scale])), coords };
      });
      setLegs(next);
      // « Mon trajet » prend la vraie distance domicile-travail
      if (workChanged.current && next.travail) {
        workChanged.current = false;
        writeTrip({ dailyKm: Math.round(Math.min(200, Math.max(10, 2 * next.travail.km))) });
      }
    });
    return () => {
      stale = true;
    };
  }, [origin, chosenKey, placeKey]);

  // Recharge d'appoint : une borne rapide au supermarché, sinon la borne rapide la plus proche de chez soi,
  // sinon la borne (lente) du supermarché
  useEffect(() => {
    const shop = shopping ? places[shopping.id] : null;
    if (!home || scenario !== "topup") return;
    let stale = false;
    (async () => {
      const atShop = shop ? (await chargersAround(shop.lat, shop.lon, 0.6)).sort((a, b) => b.kw - a.kw)[0] : undefined;
      if (atShop && atShop.kw >= FAST_KW) return { charger: atShop, atShop: true };
      const fast = (await chargersAround(home.lat, home.lon, 15)).find((c) => c.kw >= FAST_KW);
      if (fast) return { charger: fast, atShop: false };
      return atShop ? { charger: atShop, atShop: true } : null;
    })().then((r) => !stale && setStopCharger(r));
    return () => {
      stale = true;
    };
  }, [home, scenario, placeKey]);

  // Sorties de la semaine pour la simulation
  const dailyKm = useMemo(() => readTrip().dailyKm, [saved?.work]);
  const outingsFor = useCallback(
    (v: Driven): Outing[] => {
      const list: Outing[] = [];
      for (const b of items) {
        if (!b.days.length) continue;
        const used = legs[b.id]?.used[`${v.key}:${season}`];
        if (used !== undefined && places[b.id]) list.push({ id: b.id, cat: b.cat, days: b.days, perDay: b.perDay, km: legs[b.id]!.km, used });
        else if (b.id === "travail" && !places.travail) {
          // Sans adresse de travail : le trajet quotidien de « Mon trajet »
          const km = dailyKm / 2;
          list.push({ id: b.id, cat: b.cat, days: b.days, perDay: 1, km, used: km / rangeProfile(v.range, season).road });
        }
      }
      return list;
    },
    [legs, season, itemsKey, placeKey, dailyKm]
  );
  const outings: Outing[] = useMemo(() => (vehicle ? outingsFor(vehicle) : []), [vehicle, outingsFor]);

  // La même semaine pour chaque modèle choisi (le premier mène la carte et la frise)
  const weeks = useMemo(
    () =>
      chosen.map((v) => {
        const list = outingsFor(v);
        if (!list.length) return null;
        const stop =
          stopCharger && shopping && list.some((o) => o.id === shopping.id)
            ? { kw: stopCharger.charger.kw, day: shopping.days.at(-1)!, outingId: shopping.id }
            : null;
        return simulateWeek(list, scenario, stop, v.charging, { workCharging, workOutingId: "travail" });
      }),
    [chosen, outingsFor, scenario, stopCharger, workCharging]
  );
  const week = weeks[0] ?? null;

  // Zones « Jusqu'où ? » : hiver posé sur l'été, comme la règle d'autonomie
  useEffect(() => {
    if (!origin || !vehicle || tab !== "reach") return;
    let stale = false;
    const budget = budgetFor(tripKind);
    // Plusieurs modèles : une zone par modèle, pour la saison choisie
    const request =
      chosen.length === 1
        ? [
            { key: "summer", profile: rangeProfile(vehicle.range, "summer"), budget },
            { key: "winter", profile: rangeProfile(vehicle.range, "winter"), budget },
          ]
        : chosen.map((v) => ({ key: v.key, profile: rangeProfile(v.range, season), budget }));
    computeZones(request).then((z) => {
      if (stale) return;
      setZones(
        chosen.length === 1
          ? [
              { id: "summer", rings: z.summer ?? [], fill: "#6f9130", fillOpacity: 0.16, line: "#6f9130" },
              { id: "winter", rings: z.winter ?? [], fill: "#3a5c12", fillOpacity: 0.22, line: "#3a5c12" },
            ]
          : chosen.map((v, i) => ({ id: v.key, rings: z[v.key] ?? [], fill: COMPARE_COLORS[i]!, fillOpacity: 0.1, line: COMPARE_COLORS[i]! }))
      );
    });
    return () => {
      stale = true;
    };
  }, [origin, chosenKey, tripKind, tab, season]);

  // Destination choisie dans « Jusqu'où ? » : son itinéraire sur la carte
  const selectDestination = useCallback(
    (target: { key: string; place: Place } | null) => {
      if (!target || !home || !vehicle) return setFocus(null);
      setFocus({ ...target, coords: null });
      const near = haversine(home.lat, home.lon, target.place.lat, target.place.lon) < 120_000;
      Promise.all([
        near ? departurePoint(home).then((start) => roadRoute(start, target.place)) : null,
        computeTrips([target.place], [rangeProfile(vehicle.range, "summer")], true),
      ]).then(([route, [trip]]) => {
        const line = route?.coords ?? trip?.path ?? null;
        const coords: [number, number][] | null = line ? [[home.lon, home.lat], ...line, [target.place.lon, target.place.lat]] : null;
        setFocus((f) => (f?.key === target.key ? { ...f, coords } : f));
      }
      );
    },
    [home, vehicle]
  );
  useEffect(() => setFocus(null), [home, vehicle, tripKind, tab]);

  // Carte de la semaine : tracés et repères, le jour choisi en avant
  const dayOutings = activeDay === null ? null : new Set(items.filter((b) => b.days.includes(activeDay)).map((b) => b.id));
  const routes: RouteLine[] = useMemo(() => {
    if (tab !== "week") return focus?.coords ? [{ id: "focus", coords: focus.coords, active: true }] : [];
    return outings
      .filter((o) => legs[o.id]?.coords)
      .map((o) => ({ id: o.id, coords: legs[o.id]!.coords!, active: dayOutings ? dayOutings.has(o.id) : false }));
  }, [tab, outings, legs, activeDay, focus]);
  const pins: Pin[] = useMemo(() => {
    if (tab !== "week") return focus ? [{ id: "focus", cat: "balade", lat: focus.place.lat, lon: focus.place.lon, label: focus.place.label, active: true }] : [];
    const list: Pin[] = outings
      .filter((o) => places[o.id])
      .map((o) => ({ id: o.id, cat: o.cat, lat: places[o.id]!.lat, lon: places[o.id]!.lon, label: places[o.id]!.label, active: dayOutings?.has(o.id) }));
    if (scenario === "topup" && stopCharger && !stopCharger.atShop)
      list.push({ id: "borne", cat: "borne", lat: stopCharger.charger.lat, lon: stopCharger.charger.lon, label: stopCharger.charger.name, active: activeDay === 5 });
    return list;
  }, [tab, outings, placeKey, activeDay, scenario, stopCharger, focus]);

  // Prix de l'essence du jour pour comparer (moyenne nationale, aucune position envoyée)
  useEffect(() => {
    fuelPrice().then(setFuel);
  }, []);

  // Prix moyen du kWh de la semaine : maison et travail à 0,20 €, borne publique au tarif rapide
  const prices = saved?.prices ?? DEFAULT_SAVED.prices;
  const eurPerKwh = useMemo(() => {
    if (!week) return prices.home;
    let kwh = 0;
    let cost = 0;
    for (const d of week.days)
      for (const c of d.charges) {
        kwh += c.added;
        cost += c.added * (c.kind === "stop" ? PUBLIC_EUR_KWH : c.kind === "work" ? prices.work : prices.home);
      }
    return kwh > 0 ? cost / kwh : prices.home;
  }, [week, prices.home, prices.work]);

  // Lecture de la semaine : la voiture fait chaque aller-retour, la jauge suit
  const stop = useCallback(() => {
    playToken.current++;
    setPlaying(false);
    setLive(null);
    setLiveTotals(null);
    mapRef.current?.parkCar();
  }, []);

  const play = useCallback(async () => {
    if (!week) return;
    const token = ++playToken.current;
    setPlaying(true);
    const alive = () => playToken.current === token;
    // Compteurs de la semaine : kilomètres et batterie consommée depuis lundi
    const acc = { km: 0, used: 0 };
    setLiveTotals({ ...acc });
    const tweenLevel = (from: number, to: number, ms: number, km = 0, used = 0) =>
      new Promise<void>((resolve) => {
        const t0 = performance.now();
        const step = (now: number) => {
          if (!alive()) return resolve();
          const t = Math.min(1, (now - t0) / ms);
          const e = ease(t);
          setLive(from + (to - from) * e);
          if (km || used) setLiveTotals({ km: acc.km + km * e, used: acc.used + used * e });
          if (t < 1) requestAnimationFrame(step);
          else {
            acc.km += km;
            acc.used += used;
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    for (let d = 0; d < 7 && alive(); d++) {
      const day = week.days[d]!;
      setActiveDay(d);
      let level = day.start;
      setLive(level);
      await sleep(600);
      for (const [k, t] of day.trips.entries()) {
        if (!alive()) return;
        const coords = legs[t.outingId]?.coords;
        const stopHere = day.charges.find((c) => (c.kind === "stop" || c.kind === "work") && c.trip === k);
        // Un trajet se lit : 1,6 s pour le coin de la rue, jusqu'à 4,5 s pour une balade
        const ms = coords ? Math.min(4500, 1600 + (legs[t.outingId]?.km ?? 0) * 45) : 1200;
        const half = t.used / 2;
        const legKm = outings.find((o) => o.id === t.outingId)?.km ?? 0;
        // La caméra cadre le trajet avant que la voiture parte
        if (coords) await mapRef.current?.frame(coords);
        if (!alive()) return;
        await Promise.all([coords ? mapRef.current?.drive(coords, ms) : sleep(ms), tweenLevel(level, level - half, ms, legKm, half)]);
        level -= half;
        await sleep(450);
        if (stopHere && alive()) {
          await tweenLevel(level, level + stopHere.added, 1400);
          level += stopHere.added;
          await sleep(300);
        }
        if (!alive()) return;
        await Promise.all([coords ? mapRef.current?.drive([...coords].reverse(), ms) : sleep(ms), tweenLevel(level, level - half, ms, legKm, half)]);
        level -= half;
        await sleep(300);
      }
      const night = day.charges.find((c) => c.kind === "home");
      if (night && alive()) {
        await sleep(300);
        await tweenLevel(level, level + night.added, 1100);
      }
      await sleep(500);
    }
    if (alive()) {
      setPlaying(false);
      setLive(null);
      setLiveTotals(null);
      mapRef.current?.parkCar();
    }
  }, [week, legs, outings]);

  // Toute modification arrête la lecture
  useEffect(() => stop, [week, stop]);

  if (!saved) return <div className="week-app" aria-busy="true" />;

  const shareData: SharedWeek | null = home
    ? {
        home,
        work: saved.work,
        vehicle: vehicle?.slug ?? null,
        versions: vehicle ? { [vehicle.slug]: vehicle.version.id } : {},
        workCharging,
        places: saved.places,
        items,
        scenario,
        season,
        tab,
      }
    : null;

  const seasonSeg = (
    <div className="week-seg week-seg-sm" role="radiogroup" aria-label="Saison">
      {(
        [
          ["winter", "Hiver"],
          ["summer", "Été"],
        ] as const
      ).map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={season === k} onClick={() => update({ season: k })} title={k === "winter" ? "Hiver, -5 °C" : undefined}>
          {l}
        </button>
      ))}
    </div>
  );
  // Dans « Jusqu'où ? » avec un seul modèle, l'été et l'hiver sont dessinés ensemble
  const seasonShown = tab === "week" || chosen.length > 1;

  return (
    <div className="week-app" data-drawer={drawerOpen ? "open" : "closed"}>
      <div className="week-stage">
        <MapView
          ref={mapRef}
          home={home}
          zones={tab === "reach" ? zones : []}
          routes={routes}
          pins={pins}
          frame={tab === "reach" ? "zones" : "week"}
          autoFrame={!playing}
          leftInset={leftInset}
          className="week-map-box"
        />
        {tab === "week" && week && vehicle && (
          // Une seule barre en bas de la carte : le verdict, puis la frise et les chiffres côte à côte
          <div className="week-hud">
            <div className="week-bar">
              <Verdict week={week} scenario={scenario} stopCharger={stopCharger} ready />
              <div className="week-bar-row">
                <WeekTimeline
                  days={week.days}
                  active={activeDay}
                  live={live}
                  playing={playing}
                  onSelect={(d) => {
                    stop();
                    setActiveDay(d);
                  }}
                  onPlay={play}
                  onStop={stop}
                />
                <WeekMileage km={liveTotals?.km ?? week.km} live={!!liveTotals} />
                <WeekCost
                  km={liveTotals?.km ?? week.km}
                  kwh={(liveTotals?.used ?? week.used) * vehicle.charging.usableKWh * CHARGING_LOSSES}
                  eurPerKwh={eurPerKwh}
                  fuel={fuel}
                  live={!!liveTotals}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Volet des réglages (ordinateur) : un seul défilement, onglets collés en haut */}
      <div className="week-drawer" ref={drawerRef}>
        <div className="week-drawer-scroll" id="week-drawer-content" inert={desktop && !drawerOpen ? true : undefined}>
          <section className="week-intro">
            <h1 className="week-title">Ma semaine en électrique</h1>

            {sharedView && (
              <div className="week-shared">
                <p>Vous regardez une semaine qu'on vous a partagée. Vos modifications ne sont pas enregistrées.</p>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    history.replaceState(null, "", location.pathname + location.search);
                    setSharedView(false);
                    loadOwn();
                  }}
                >
                  Revenir à ma semaine
                </button>
              </div>
            )}

            <AddressField label="Mon domicile" value={home} placeholder="Adresse, rue ou commune" onChange={(p) => update({ home: p })} />
            {(!home || status === "loading" || status === "far" || status === "error") && (
              <p className="week-status" aria-live="polite">
                {!home && "Votre adresse reste sur cet appareil : tout est calculé dans votre navigateur."}
                {home && status === "loading" && "Calcul des routes depuis chez vous…"}
                {status === "far" && "Aucune route principale à moins de 15 km de cette adresse : la carte couvre la France métropolitaine."}
                {status === "error" && "Le réseau routier n'a pas pu être chargé. Réessayez dans un instant."}
              </p>
            )}

            <div className="week-field">
              <span className="label-eyebrow">{chosen.length > 1 ? "Les modèles comparés" : "Le modèle"}</span>
              {chosen.map((v, i) => (
                <div key={v.slug} className="week-vehicle">
                  {chosen.length > 1 && <i className="week-dot" style={{ background: COMPARE_COLORS[i] }} aria-hidden="true" />}
                  {v.image && <img src={v.image} alt="" width={72} height={42} className="vehicle-photo" />}
                  <div className="min-w-0 flex-1">
                    <a href={url(`/vehicules/${v.slug}/`)} className="font-semibold leading-tight truncate block hover:underline">
                      {v.brand} {v.model}
                    </a>
                    {/* Ce que la version choisie change au calcul, en clair */}
                    <p className="week-version-facts">
                      <span>
                        <b>{formatKm(v.range.mixed_km)}</b> réels, <b>{formatKm(v.range.winter_minus5_km)}</b> en hiver
                      </span>
                      <span className="card-confidence" data-level={v.measured ? "measured" : "estimated"}>
                        {v.measured ? "mesurée" : "estimée"}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => update({ vehicles: saved.vehicles.filter((s) => s !== v.slug) })}
                    aria-label={chosen.length > 1 ? `Retirer ${v.brand} ${v.model}` : undefined}
                  >
                    {chosen.length > 1 ? "Retirer" : "Changer"}
                  </button>
                  {v.versions.length > 1 ? (
                    <label className="week-version">
                      <span>Version</span>
                      <select
                        value={v.version.id}
                        onChange={(e) => update({ versions: { ...saved.versions, [v.slug]: e.target.value } })}
                        aria-label={`Version de ${v.brand} ${v.model}`}
                        title={v.version.detail ?? undefined}
                      >
                        {v.versions.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} strokeWidth={2.25} aria-hidden="true" />
                    </label>
                  ) : (
                    <p className="week-version-single">{v.version.label}{v.version.detail && <> · {v.version.detail}</>}</p>
                  )}
                </div>
              ))}
              {chosen.length === 0 ? (
                <VehiclePicker vehicles={vehicles} exclude={saved.vehicles} label="Chercher un modèle" onPick={(v) => update({ vehicles: [v.slug] })} />
              ) : (
                chosen.length < MAX_COMPARED &&
                (adding ? (
                  <VehiclePicker
                    vehicles={vehicles}
                    exclude={saved.vehicles}
                    label="Comparer avec un autre modèle"
                    onPick={(v) => {
                      setAdding(false);
                      update({ vehicles: [...saved.vehicles, v.slug].slice(0, MAX_COMPARED) });
                    }}
                  />
                ) : (
                  <button type="button" className="week-add" onClick={() => setAdding(true)}>
                    <Plus size={14} strokeWidth={2.4} aria-hidden="true" />
                    Comparer avec un autre modèle
                  </button>
                ))
              )}
            </div>

          </section>

          {/* Onglets et saison : collés en haut du volet pendant le défilement */}
          <div className="week-tabbar">
            <div className="week-tabs" role="tablist" aria-label="Affichage">
              <button type="button" role="tab" aria-selected={tab === "week"} onClick={() => update({ tab: "week" })}>
                Ma semaine
              </button>
              <button type="button" role="tab" aria-selected={tab === "reach"} onClick={() => { stop(); update({ tab: "reach" }); }}>
                Jusqu'où ?
              </button>
            </div>
            {seasonShown && seasonSeg}
          </div>

          <aside className="week-panel" role="tabpanel">
            {tab === "week" ? (
              <>
                {/* Le verdict vit dans la barre de la carte ; ici, seulement ce qu'il manque */}
                {!(week && vehicle) && <Verdict week={week} scenario={scenario} stopCharger={stopCharger} ready={!!vehicle && !!home} />}
                {chosen.length > 1 && (
                  <ul className="week-compare" aria-label="Les autres modèles, même semaine">
                    {chosen.slice(1).map((v, k) => {
                      const w = weeks[k + 1];
                      return (
                        <li key={v.slug}>
                          <i className="week-dot" style={{ background: COMPARE_COLORS[k + 1] }} aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{v.model}</span>
                          <b className="tabular" data-warn={w && !w.ok ? "1" : undefined}>
                            {w ? verdictLines(w, scenario, stopCharger).big : "…"}
                          </b>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <section className="week-block" aria-labelledby="week-charge-title">
                  <h2 id="week-charge-title" className="week-block-title">Recharge</h2>
                  <div className="week-seg week-seg-fill" role="radiogroup" aria-label="Recharge">
                    {(
                      [
                        ["nightly", "Chaque soir"],
                        ["weekly", "Au besoin"],
                        ["topup", "Sans prise"],
                      ] as const
                    ).map(([k, l]) => (
                      <button key={k} type="button" role="radio" aria-checked={scenario === k} title={SCENARIO_HINT[k]} onClick={() => update({ scenario: k })}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {scenario !== "nightly" && (
                    <label className="trip-toggle week-work-toggle">
                      <input type="checkbox" checked={workCharging} onChange={(e) => update({ workCharging: e.target.checked })} />
                      <span className="trip-toggle-ui" aria-hidden="true"></span>
                      <span>Je peux recharger au travail</span>
                    </label>
                  )}
                  <div className="week-prices">
                    <span className="week-prices-label">Prix du kWh</span>
                    {scenario !== "topup" && (
                      <PriceInput label="Maison" value={prices.home} onChange={(home) => update({ prices: { ...prices, home } })} />
                    )}
                    {workCharging && scenario !== "nightly" && (
                      <PriceInput label="Travail" value={prices.work} onChange={(work) => update({ prices: { ...prices, work } })} />
                    )}
                    {scenario === "topup" && (
                      <span className="week-price-fixed">
                        Borne rapide <b>{formatNumber(PUBLIC_EUR_KWH, 2)}&nbsp;€</b>
                      </span>
                    )}
                  </div>
                </section>

                <section className="week-block" aria-labelledby="week-outings-title">
                  <div className="week-outings-head">
                    <h2 id="week-outings-title" className="week-block-title">Votre semaine type</h2>
                  </div>
                  <ul className="week-bricks">
                    {items.map((b) => {
                      const isWork = b.id === "travail";
                      return (
                        <BrickRow
                          key={b.id}
                          brick={b}
                          place={places[b.id] ?? null}
                          options={options[b.cat] ?? []}
                          near={home}
                          km={legs[b.id]?.km ?? null}
                          active={activeDay !== null && b.days.includes(activeDay)}
                          initiallyOpen={b.id === fresh || (isWork && !!home && !saved.work)}
                          onDays={(days) => update({ items: items.map((x) => (x.id === b.id ? { ...x, days } : x)) })}
                          onPick={(pl) => {
                            if (isWork) {
                              workChanged.current = !!pl;
                              return update({ work: pl });
                            }
                            const next = { ...saved.places };
                            if (pl) next[b.id] = pl;
                            else delete next[b.id];
                            update({ places: next });
                          }}
                          onRemove={
                            isWork
                              ? undefined
                              : () => {
                                  const next = { ...saved.places };
                                  delete next[b.id];
                                  update({ items: items.filter((x) => x.id !== b.id), places: next });
                                }
                          }
                          placeField={
                            isWork ? (
                              <AddressField
                                label="Lieu de travail"
                                hideLabel
                                inline
                                near={home}
                                value={saved.work}
                                placeholder="Nom ou adresse, ex. : Hôpital Édouard-Herriot"
                                onChange={(w) => {
                                  workChanged.current = !!w;
                                  update({ work: w });
                                }}
                              />
                            ) : undefined
                          }
                          fallback={
                            isWork && !places.travail ? (
                              <p className="mt-1.5 text-[12.5px] leading-snug text-[var(--color-text-faint)]">
                                Sans adresse, on compte {formatKm(dailyKm)} par jour, d'après « Mon trajet ».
                              </p>
                            ) : undefined
                          }
                        />
                      );
                    })}
                  </ul>
                  {/* Palette : on ajoute une brique, elle s'ouvre pour choisir ses jours et son lieu */}
                  <div className="week-palette" role="group" aria-label="Ajouter à ma semaine">
                    <span className="week-palette-label">Ajouter</span>
                    {BRICK_KINDS.filter((k) => k.cat !== "travail").map((k) => (
                      <button
                        key={k.cat}
                        type="button"
                        className="week-palette-chip"
                        onClick={() => {
                          const brick = newBrick(k.cat, items);
                          setFresh(brick.id);
                          update({ items: [...items, brick] });
                        }}
                      >
                        <CategoryIcon cat={k.cat} size={13} />
                        {k.label}
                        <Plus size={13} strokeWidth={2.4} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                <div className="week-seg week-seg-fill" role="radiogroup" aria-label="Type de trajet">
                  {(
                    [
                      ["return", "Aller-retour"],
                      ["oneway", "Aller simple"],
                    ] as const
                  ).map(([k, l]) => (
                    <button key={k} type="button" role="radio" aria-checked={tripKind === k} onClick={() => setTripKind(k)}>
                      {l}
                    </button>
                  ))}
                </div>
                <div className="week-legend">
                  {chosen.length > 1 ? (
                    chosen.map((v, i) => (
                      <span key={v.slug}>
                        <i className="week-key" style={{ background: `color-mix(in srgb, ${COMPARE_COLORS[i]} 22%, transparent)`, boxShadow: `inset 0 0 0 1.5px ${COMPARE_COLORS[i]}` }} />
                        {v.model}
                      </span>
                    ))
                  ) : (
                    <>
                      <span><i className="week-key" data-season="winter" /> En hiver (-5 °C)</span>
                      <span><i className="week-key" data-season="summer" /> En été</span>
                    </>
                  )}
                </div>
                <p className="text-[13px] leading-snug text-[var(--color-text-faint)]">
                  {tripKind === "return"
                    ? "Là où l'on va et revient sans recharger, en gardant 10 % de batterie."
                    : "Là où l'on arrive sans recharger, avec 10 % de batterie."}{" "}
                  Par les vraies routes, à 130 km/h sur autoroute.
                </p>
                {vehicle && home && status === "ready" && (
                  <ReachList
                    key={`${origin}-${vehicle.key}-${tripKind}`}
                    vehicle={vehicle}
                    home={home}
                    tripKind={tripKind}
                    selected={focus?.key ?? null}
                    onSelect={selectDestination}
                  />
                )}
              </>
            )}
          </aside>

          {/* Pied du volet : partage, méthode et guide, chacun déplié sur place */}
          <footer className="week-foot">
            <div className="week-foot-row">
              {home && <ShareBox week={shareData} />}
              <details className="week-method">
                <summary>Méthode</summary>
                <ul>
                  <li>
                    Les distances suivent les vraies routes : le réseau d'OpenStreetMap jusqu'aux routes de desserte pour les zones et
                    les destinations, et le tracé exact pour les petits trajets de la semaine.
                  </li>
                  <li>
                    La consommation dépend de la route : autonomie mesurée à 130 km/h sur autoroute, autonomie mixte sur voie express,
                    entre mixte et ville sur les routes. L'hiver applique l'écart mesuré à -5 °C de chaque modèle.
                  </li>
                  <li>On garde toujours 10 % de batterie en réserve. Les recharges du quotidien s'arrêtent à 80 %.</li>
                  <li>
                    Coût : électricité au prix que vous indiquez à la maison et au travail (0,20 €/kWh par défaut),{" "}
                    {formatNumber(PUBLIC_EUR_KWH, 2)} €/kWh sur borne publique, 10 % de pertes de recharge comprises. En face, une
                    voiture essence de 6,5 l/100 km au prix moyen national du SP95-E10 du jour (flux officiel des prix carburants).
                    L'année compte 52 semaines comme celle-ci, sans les vacances.
                  </li>
                  <li>
                    Recharge au travail (si vous l'indiquez) : borne de parking de 7 kW, jusqu'à 80 % pendant la journée,
                    utilisée en priorité.
                  </li>
                  <li>
                    Recharge d'appoint : la borne la plus puissante près de vos courses (Base nationale des IRVE), sinon la borne
                    rapide la plus proche, à la puissance que la voiture accepte vraiment.
                  </li>
                  <li>
                    L'autonomie de chaque modèle est celle de sa fiche, mesurée quand un essai existe, estimée sinon :{" "}
                    {vehicle ? (vehicle.measured ? `mesurée pour ${vehicle.model}.` : `estimée pour ${vehicle.model}.`) : "voir la fiche."}{" "}
                    <a href={url("/methodologie/")} className="underline">Méthodologie</a>
                  </li>
                  <li>
                    Votre adresse reste sur cet appareil. Pour la localiser, elle passe par le service public d'adresses (IGN) et,
                    pour tracer les petits trajets, par un serveur OpenStreetMap ; Evly n'en garde rien.{" "}
                    <a href={url("/confidentialite/")} className="underline">Confidentialité</a>
                  </li>
                </ul>
              </details>
              <a href="#guide" className="week-guide-link">
                Le guide
                <ArrowDown size={14} strokeWidth={2.25} aria-hidden="true" />
              </a>
            </div>
          </footer>
        </div>
        <button
          type="button"
          className="week-drawer-toggle"
          aria-expanded={drawerOpen}
          aria-controls="week-drawer-content"
          aria-label={drawerOpen ? "Replier les réglages" : "Ouvrir les réglages"}
          onClick={() => update({ drawer: !drawerOpen })}
        >
          <PanelLeftClose size={18} strokeWidth={2} className="week-drawer-icon" aria-hidden="true" />
          <span className="week-drawer-label" aria-hidden="true">
            <span>Réglages</span>
          </span>
        </button>
      </div>
    </div>
  );
}

/** Prix du kWh en euros, saisi au centime (0 : recharge gratuite, au travail par exemple) */
const cents = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PriceInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(cents.format(value));
  useEffect(() => setText(cents.format(value)), [value]);
  const commit = () => {
    const v = Number(text.replace(",", ".").replace(/[^\d.]/g, ""));
    if (Number.isFinite(v) && v >= 0 && v <= 2) onChange(Math.round(v * 100) / 100);
    else setText(cents.format(value));
  };
  return (
    <label className="week-price">
      <span>{label}</span>
      <span className="week-price-box">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          aria-label={`Prix du kWh ${label.toLowerCase()}, en euros`}
        />
        <span aria-hidden="true">€</span>
      </span>
    </label>
  );
}

interface VerdictProps {
  week: WeekResult | null;
  scenario: Scenario;
  stopCharger: { charger: Charger; atShop: boolean } | null;
  ready: boolean;
}

/** « lundi », « lundi et jeudi », « lundi, mardi et jeudi » */
function joinDays(days: number[], suffix = "") {
  const names = days.map((d) => `${dayName(d)}${suffix}`);
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const roundTo5 = (m: number) => Math.max(5, Math.ceil(m / 5) * 5);
const roundMin = (m: number) => `${formatNumber(roundTo5(m))} min`;

/** La phrase qui rassure (ou qui prévient), chiffres à l'appui */
function verdictLines(week: WeekResult, scenario: Scenario, stopCharger: VerdictProps["stopCharger"]) {
  const km = formatKm(week.km);
  const lowestDay = week.days.findIndex((d) => d.low === week.lowest);
  if (scenario === "topup" && !week.stops.length && !week.workDays.length)
    return {
      big: "Une recharge à prévoir",
      small: stopCharger
        ? "Sans prise à la maison, la batterie baisse de semaine en semaine : ajoutez des courses à votre semaine pour recharger pendant ce temps."
        : "Aucune borne près de vos courses ni de borne rapide à moins de 15 km.",
    };
  if (!week.ok)
    return {
      big: `À sec ${dayName(lowestDay)}`,
      small: `Même en rechargeant, la journée de ${dayName(lowestDay)} demande plus que la batterie, réserve comprise. Un modèle plus autonome serait plus serein.`,
    };
  if (week.workDays.length && scenario !== "nightly") {
    const w = week.workDays.length;
    const minutes = week.stops.reduce((sum, s) => sum + roundTo5(s.minutes), 0);
    const extras = [
      week.homeNights.length && `à la maison ${joinDays(week.homeNights, " soir")}`,
      week.stops.length && `${formatNumber(minutes)} min sur borne publique`,
    ].filter(Boolean);
    return {
      big: extras.length
        ? `${w} ${w > 1 ? "jours" : "jour"} au travail${week.homeNights.length ? `, ${week.homeNights.length} à la maison` : ""}${week.stops.length ? ` + ${formatNumber(minutes)} min de borne` : ""}`
        : `Rechargée au travail, ${w} ${w > 1 ? "jours" : "jour"} par semaine`,
      small: `Branchée au bureau ${joinDays(week.workDays)}${extras.length ? `, et ${extras.join(" et ")}` : ""} : vos ${km} passent sans descendre sous ${pct(week.lowest)}.${
        extras.length ? "" : scenario === "topup" ? " Aucune borne publique nécessaire." : " Aucune recharge à la maison."
      }`,
    };
  }
  if (scenario === "nightly")
    return {
      big: `Jamais sous ${pct(week.lowest)}`,
      small: `En rebranchant chaque soir jusqu'à 80 %, vos ${km} de la semaine ne font jamais baisser la batterie bien bas.`,
    };
  if (scenario === "weekly") {
    const n = week.homeNights.length;
    return {
      big: n === 1 ? "1 recharge par semaine" : `${n} recharges par semaine`,
      small:
        n === 1
          ? `Branchée le dimanche soir, la voiture fait vos ${km} de la semaine. Au plus bas : ${pct(week.lowest)}.`
          : `À la maison, ${joinDays(week.homeNights, " soir")} : vos ${km} passent sans jamais descendre sous ${pct(week.lowest)}.`,
    };
  }
  const c = stopCharger!.charger;
  const station = stopCharger!.atShop
    ? `à la borne de ${c.name} (${formatNumber(c.kw)} kW)`
    : `à la borne rapide ${c.name} (${formatNumber(c.kw)} kW, à ${formatKm(c.d / 1000)} de chez vous)`;
  const total = week.stops.reduce((sum, s) => sum + roundTo5(s.minutes), 0);
  return {
    big: `${formatNumber(total)} min de recharge par semaine`,
    small:
      week.stops.length === 1
        ? `${capitalize(dayName(week.stops[0]!.day))}, ${station}${stopCharger!.atShop ? ", pendant les courses" : ""} : de quoi couvrir vos ${km}. Au plus bas : ${pct(week.lowest)}.`
        : `En ${week.stops.length} passages (${week.stops.map((s) => `${dayName(s.day)} ${roundMin(s.minutes)}`).join(", ")}), ${station} : de quoi couvrir vos ${km}.`,
  };
}

function Verdict({ week, scenario, stopCharger, ready }: VerdictProps) {
  if (!ready) return <p className="week-verdict" data-empty="1">Choisissez votre adresse et un modèle : on déroule votre semaine.</p>;
  if (!week) return <p className="week-verdict" data-empty="1">Calcul de votre semaine…</p>;
  const { big, small } = verdictLines(week, scenario, stopCharger);
  const warn = !week.ok || (scenario === "topup" && !week.stops.length && !week.workDays.length);
  return (
    <div className="week-verdict" data-warn={warn ? "1" : undefined}>
      <p className="week-verdict-big">{big}</p>
      <p className="week-verdict-small">{small}</p>
    </div>
  );
}
