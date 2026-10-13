/**
 * Accès au worker de calcul (graphe routier) depuis la page « Ma semaine ».
 * Un seul worker par page, requêtes numérotées.
 */
import type { RangeProfile } from "./roadGraph";
import type { TripResult, WorkerRequest } from "./graph.worker";

type Ring = [number, number][];
type Body<T> = T extends unknown ? Omit<T, "id"> : never;

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

function call<T>(req: Body<WorkerRequest>): Promise<T> {
  if (!worker) {
    worker = new Worker(new URL("./graph.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
      const { id, ok, error, ...rest } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (ok) p.resolve(rest);
      else p.reject(new Error(error));
    };
  }
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage({ ...req, id });
  });
}

let ready: Promise<unknown> | null = null;

/** Charge le graphe une seule fois */
export function loadRoads(url: string) {
  ready ??= call({ type: "init", url }).catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/** Explore le réseau depuis le domicile ; false si aucun grand axe à proximité */
export async function setOrigin(lat: number, lon: number) {
  const { found } = await call<{ found: boolean }>({ type: "origin", lat, lon });
  return found;
}

export async function computeZones(zones: { key: string; profile: RangeProfile; budget: number }[]) {
  const res = await call<{ zones: Record<string, Ring[]> }>({ type: "zones", zones });
  return res.zones;
}

/** Trajets depuis le domicile : kilomètres et batterie consommée pour chaque profil */
export async function computeTrips(points: { lat: number; lon: number }[], profiles: RangeProfile[], withPath = false) {
  const res = await call<{ trips: (TripResult | null)[] }>({ type: "trips", points, profiles, withPath });
  return res.trips;
}
