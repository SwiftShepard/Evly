/**
 * Contour de la zone atteignable : chaque nœud atteint « rayonne » sur les petites
 * routes absentes du graphe avec ce qu'il reste de batterie, puis on trace la
 * courbe de niveau du champ obtenu (d3-contour). Les trous intérieurs sont
 * comblés : entre deux grands axes, le réseau local mène partout.
 */
import { contours } from "d3-contour";
import { batteryUsed, DETOUR, type Reach, type RangeProfile, type RoadGraph } from "./roadGraph";

/** Taille d'une cellule de la grille en km */
const CELL_KM = 1.5;
/** Portée maximale autour d'un grand axe en km */
const MAX_SPREAD_KM = 7;

export type Ring = [number, number][];

/**
 * Zone où l'on arrive en consommant au plus `budget` de la batterie (0 à 1).
 * Renvoie des polygones [lon, lat] sans trous.
 */
export function reachZone(g: RoadGraph, r: Reach, p: RangeProfile, budget: number): Ring[] {
  // Emprise des nœuds atteints
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  const reached: number[] = [];
  for (let v = 0; v < g.n; v++) {
    const used = batteryUsed(r, v, p);
    if (!(used <= budget)) continue;
    reached.push(v);
    const la = g.lat[v]! / 1e5;
    const lo = g.lon[v]! / 1e5;
    if (la < minLat) minLat = la;
    if (la > maxLat) maxLat = la;
    if (lo < minLon) minLon = lo;
    if (lo > maxLon) maxLon = lo;
  }
  if (!reached.length) return [];

  const kmLat = 111.2;
  const kmLon = 111.2 * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const pad = MAX_SPREAD_KM + 2 * CELL_KM;
  const lat0 = minLat - pad / kmLat;
  const lon0 = minLon - pad / kmLon;
  const w = Math.ceil(((maxLon - minLon) * kmLon + 2 * pad) / CELL_KM) + 1;
  const h = Math.ceil(((maxLat - minLat) * kmLat + 2 * pad) / CELL_KM) + 1;
  const field = new Float32Array(w * h).fill(-1);

  for (const v of reached) {
    const rem = ((budget - batteryUsed(r, v, p)) * p.road) / DETOUR;
    const spread = Math.min(rem, MAX_SPREAD_KM);
    const x = ((g.lon[v]! / 1e5 - lon0) * kmLon) / CELL_KM;
    const y = ((g.lat[v]! / 1e5 - lat0) * kmLat) / CELL_KM;
    const cells = Math.ceil(spread / CELL_KM);
    for (let j = Math.max(0, Math.floor(y) - cells); j <= Math.min(h - 1, Math.ceil(y) + cells); j++) {
      for (let i = Math.max(0, Math.floor(x) - cells); i <= Math.min(w - 1, Math.ceil(x) + cells); i++) {
        const d = Math.hypot(i - x, j - y) * CELL_KM;
        const val = spread - d;
        const k = j * w + i;
        if (val > field[k]!) field[k] = val;
      }
    }
  }

  const [level] = contours().size([w, h]).thresholds([0])(Array.from(field));
  if (!level) return [];
  // Anneaux extérieurs seulement ; un îlot posé dans un trou disparaît avec le trou
  const outers = level.coordinates.map((poly) => poly[0]!);
  const kept = outers.filter((ring, k) => !outers.some((other, o) => o !== k && contains(other, ring[0]!)));
  // Grille -> [lon, lat]
  return kept.map((ring) =>
    ring.map(([i, j]) => [lon0 + (i! * CELL_KM) / kmLon, lat0 + (j! * CELL_KM) / kmLat] as [number, number])
  );
}

/** Point dans un polygone (lancer de rayon) */
function contains(ring: number[][], [x, y]: number[]) {
  if (x === undefined || y === undefined) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi = 0, yi = 0] = ring[i]!;
    const [xj = 0, yj = 0] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
