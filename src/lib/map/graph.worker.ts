/// <reference lib="webworker" />
/**
 * Calculs de « Ma semaine » hors du fil principal : chargement du graphe routier,
 * exploration depuis le domicile, zones atteignables et destinations.
 */
import { batteryUsed, DETOUR, exploreFrom, nearbyNodes, parseGraph, type Reach, type RangeProfile, type RoadGraph } from "./roadGraph";
import { reachZone } from "./zone";

export type WorkerRequest =
  | { id: number; type: "init"; url: string }
  | { id: number; type: "origin"; lat: number; lon: number }
  | { id: number; type: "zones"; zones: { key: string; profile: RangeProfile; budget: number }[] }
  | { id: number; type: "trips"; points: { lat: number; lon: number }[]; profiles: RangeProfile[]; withPath: boolean };

export interface TripResult {
  /** Kilomètres par la route (aller), part de batterie consommée par profil, tracé simplifié */
  km: number;
  used: number[];
  /** Kilomètres sur autoroute, voie express et route (dernier kilomètre compris) : la batterie
   * consommée par n'importe quel autre profil s'en déduit sans repasser par le worker */
  split: [number, number, number];
  path: [number, number][] | null;
  /** Kilomètres cumulés [autoroute, voie express, route] à chaque point du tracé (planificateur de grand trajet) */
  cum: [number, number, number][] | null;
}

let graph: RoadGraph | null = null;
let reach: Reach | null = null;

/** Nœud d'arrivée le plus « proche » d'un point en tenant compte du dernier kilomètre */
function bestArrival(lat: number, lon: number) {
  if (!graph || !reach) return null;
  let best: { node: number; lastKm: number; total: number } | null = null;
  for (const { node, d } of nearbyNodes(graph, lat, lon, 10_000).slice(0, 12)) {
    if (Number.isNaN(reach.road[node])) continue;
    const lastKm = (d * DETOUR) / 1000;
    const total = reach.hw[node]! + reach.express[node]! + reach.road[node]! + lastKm;
    if (!best || total < best.total) best = { node, lastKm, total };
  }
  return best;
}

function pathTo(node: number): [number, number][] {
  const g = graph!;
  const out: [number, number][] = [];
  for (let v = node; v >= 0; v = reach!.prev[v]!) out.push([g.lon[v]! / 1e5, g.lat[v]! / 1e5]);
  return out.reverse();
}

/** Kilomètres cumulés par type de route le long du même tracé */
function cumTo(node: number): [number, number, number][] {
  const r = reach!;
  const out: [number, number, number][] = [];
  for (let v = node; v >= 0; v = r.prev[v]!) out.push([r.hw[v]!, r.express[v]!, r.road[v]!]);
  return out.reverse();
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  try {
    if (msg.type === "init") {
      const res = await fetch(msg.url);
      if (!res.ok) throw new Error(`Graphe routier indisponible (${res.status})`);
      graph = await parseGraph(await res.arrayBuffer());
      self.postMessage({ id: msg.id, ok: true, nodes: graph.n });
    } else if (msg.type === "origin") {
      if (!graph) throw new Error("Graphe non chargé");
      reach = exploreFrom(graph, msg.lat, msg.lon);
      self.postMessage({ id: msg.id, ok: true, found: reach !== null });
    } else if (msg.type === "zones") {
      if (!graph || !reach) throw new Error("Point de départ manquant");
      const out: Record<string, [number, number][][]> = {};
      for (const z of msg.zones) out[z.key] = reachZone(graph, reach, z.profile, z.budget);
      self.postMessage({ id: msg.id, ok: true, zones: out });
    } else if (msg.type === "trips") {
      const trips: (TripResult | null)[] = msg.points.map(({ lat, lon }) => {
        const a = bestArrival(lat, lon);
        if (!a) return null;
        const used = msg.profiles.map((p) => batteryUsed(reach!, a.node, p) + a.lastKm / p.road);
        const split: [number, number, number] = [reach!.hw[a.node]!, reach!.express[a.node]!, reach!.road[a.node]! + a.lastKm];
        return {
          km: a.total,
          used,
          split,
          path: msg.withPath ? [...pathTo(a.node), [lon, lat]] : null,
          cum: msg.withPath ? [...cumTo(a.node), split] : null,
        };
      });
      self.postMessage({ id: msg.id, ok: true, trips });
    }
  } catch (err) {
    self.postMessage({ id: msg.id, ok: false, error: String(err instanceof Error ? err.message : err) });
  }
};
