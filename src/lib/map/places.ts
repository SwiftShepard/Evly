/**
 * Lieux du quotidien, destinations et bornes de recharge de « Ma semaine »
 * (fichiers statiques générés par scripts/map/build-places.py et build-chargers.py).
 */
import { url } from "@/lib/url";
import { haversine } from "./roadGraph";

export type DailyCategory =
  | "courses"
  | "boulangerie"
  | "bricolage"
  | "restaurant"
  | "ecole"
  | "cinema"
  | "sport"
  | "marche"
  | "pharmacie";

export interface PoiPlace {
  cat: string;
  name: string;
  lat: number;
  lon: number;
  /** Distance à vol d'oiseau depuis le point de recherche (m) */
  d: number;
}

export interface Charger {
  lat: number;
  lon: number;
  kw: number;
  points: number;
  name: string;
  /** Accès libre 24 h/24 */
  open: boolean;
  d: number;
}

const PLACE_TILE = 0.2;
const CHARGER_TILE = 0.5;
const cache = new Map<string, Promise<unknown[]>>();

function tile(path: string): Promise<unknown[]> {
  let p = cache.get(path);
  if (!p) {
    p = fetch(url(path))
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
    cache.set(path, p);
  }
  return p;
}

/** Tuiles couvrant un rayon autour d'un point */
function tilesAround(lat: number, lon: number, radiusKm: number, size: number) {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const out: string[] = [];
  for (let i = Math.floor((lat - dLat) / size); i <= Math.floor((lat + dLat) / size); i++)
    for (let j = Math.floor((lon - dLon) / size); j <= Math.floor((lon + dLon) / size); j++) out.push(`${i}_${j}`);
  return out;
}

/** Lieux d'une catégorie autour d'un point, du plus proche au plus loin */
export async function placesAround(lat: number, lon: number, cats: string[], radiusKm = 15): Promise<PoiPlace[]> {
  const tiles = await Promise.all(tilesAround(lat, lon, radiusKm, PLACE_TILE).map((t) => tile(`/carte/lieux/${t}.json`)));
  const out: PoiPlace[] = [];
  for (const items of tiles)
    for (const [cat, la, lo, name] of items as [string, number, number, string][]) {
      if (!cats.includes(cat)) continue;
      const d = haversine(lat, lon, la / 1e4, lo / 1e4);
      if (d <= radiusKm * 1000) out.push({ cat, name, lat: la / 1e4, lon: lo / 1e4, d });
    }
  return out.sort((a, b) => a.d - b.d);
}

export async function chargersAround(lat: number, lon: number, radiusKm = 5): Promise<Charger[]> {
  const tiles = await Promise.all(tilesAround(lat, lon, radiusKm, CHARGER_TILE).map((t) => tile(`/carte/bornes/${t}.json`)));
  const out: Charger[] = [];
  for (const items of tiles)
    for (const [la, lo, kw, points, name, open] of items as [number, number, number, number, string, number][]) {
      const d = haversine(lat, lon, la / 1e4, lo / 1e4);
      if (d <= radiusKm * 1000) out.push({ lat: la / 1e4, lon: lo / 1e4, kw, points, name, open: open === 1, d });
    }
  return out.sort((a, b) => a.d - b.d);
}

export interface Destination {
  kind: string;
  name: string;
  lat: number;
  lon: number;
  population: number;
}

let destinations: Promise<Destination[]> | null = null;

export function loadDestinations(): Promise<Destination[]> {
  destinations ??= tile("/carte/destinations.json").then((items) =>
    (items as [string, number, number, string, number][]).map(([kind, la, lo, name, population]) => ({
      kind,
      name,
      lat: la / 1e4,
      lon: lo / 1e4,
      population,
    }))
  );
  return destinations;
}

/** Libellés des catégories, au singulier */
export const CATEGORY_LABEL: Record<string, string> = {
  travail: "Travail",
  courses: "Courses",
  boulangerie: "Boulangerie",
  bricolage: "Bricolage",
  restaurant: "Restaurant",
  ecole: "École",
  cinema: "Cinéma",
  sport: "Sport",
  marche: "Marché",
  pharmacie: "Pharmacie",
  balade: "Balade",
  ville: "Ville",
  chateau: "Château",
  musee: "Musée",
  zoo: "Zoo ou aquarium",
  parc: "Parc",
  panorama: "Point de vue",
  patrimoine: "Patrimoine",
  plage: "Plage",
  sommet: "Sommet",
  nature: "Site naturel",
  site: "Site touristique",
  monument: "Monument",
};
