/**
 * Graphe routier principal français (jusqu'aux routes de desserte) (généré par scripts/map/build-road-graph.py)
 * et calcul de portée sur ce graphe, entièrement dans le navigateur.
 * Fonctions pures : utilisables dans un Web Worker comme dans les tests.
 */

/** Classes d'arête du fichier : 0 autoroute, 1 voie express, 2 route, 3 bretelle */
export const CLASS_SPEED = [120, 100, 70, 50];

export interface RoadGraph {
  n: number;
  /** Coordonnées en 1e-5 degré */
  lat: Int32Array;
  lon: Int32Array;
  /** Adjacence (CSR, chaque arête dans les deux sens) */
  offsets: Int32Array;
  targets: Int32Array;
  /** Longueur en mètres */
  lengths: Float32Array;
  classes: Uint8Array;
  /** Index spatial : cellules de GRID degrés, nœuds triés par cellule */
  cellStart: Map<number, [number, number]>;
  cellNodes: Int32Array;
}

const GRID = 0.05;
const cellKey = (lat: number, lon: number) => Math.floor(lat / GRID) * 100_000 + Math.floor(lon / GRID);

/** Décode le fichier (gzip ou déjà décompressé par le serveur) */
export async function parseGraph(buf: ArrayBuffer): Promise<RoadGraph> {
  let bytes = new Uint8Array(buf);
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== "EVRG") throw new Error("Graphe routier illisible");
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  const n = view.getUint32(5, true);
  const m = view.getUint32(9, true);
  let p = 13;
  const read = () => {
    let v = 0;
    let shift = 1;
    let b: number;
    do {
      b = bytes[p++]!;
      v += (b & 0x7f) * shift;
      shift *= 128;
    } while (b & 0x80);
    return v;
  };
  const unzig = (v: number) => (v % 2 ? -(v + 1) / 2 : v / 2);

  const lat = new Int32Array(n);
  const lon = new Int32Array(n);
  let la = 0;
  let lo = 0;
  for (let i = 0; i < n; i++) {
    la += unzig(read());
    lo += unzig(read());
    lat[i] = la;
    lon[i] = lo;
  }

  // Arêtes stockées une fois (i < j) : on lit, on compte les degrés, puis on remplit les deux sens
  const ea = new Int32Array(m);
  const eb = new Int32Array(m);
  const el = new Float32Array(m);
  const ec = new Uint8Array(m);
  const degree = new Int32Array(n + 1);
  let e = 0;
  for (let i = 0; i < n; i++) {
    const count = read();
    for (let k = 0; k < count; k++) {
      const j = i + read();
      const packed = read();
      ea[e] = i;
      eb[e] = j;
      el[e] = Math.floor(packed / 4) * 10;
      ec[e] = packed % 4;
      degree[i]!++;
      degree[j]!++;
      e++;
    }
  }
  const offsets = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) offsets[i + 1] = offsets[i]! + degree[i]!;
  const fill = offsets.slice(0, n);
  const targets = new Int32Array(2 * m);
  const lengths = new Float32Array(2 * m);
  const classes = new Uint8Array(2 * m);
  for (let k = 0; k < m; k++) {
    const a = ea[k]!;
    const b = eb[k]!;
    let s = fill[a]!++;
    targets[s] = b;
    lengths[s] = el[k]!;
    classes[s] = ec[k]!;
    s = fill[b]!++;
    targets[s] = a;
    lengths[s] = el[k]!;
    classes[s] = ec[k]!;
  }

  // Index spatial
  const keys = new Float64Array(n);
  for (let i = 0; i < n; i++) keys[i] = cellKey(lat[i]! / 1e5, lon[i]! / 1e5);
  const order = Int32Array.from({ length: n }, (_, i) => i).sort((a, b) => keys[a]! - keys[b]!);
  const cellStart = new Map<number, [number, number]>();
  for (let s = 0; s < n; ) {
    const key = keys[order[s]!]!;
    let t = s;
    while (t < n && keys[order[t]!] === key) t++;
    cellStart.set(key, [s, t]);
    s = t;
  }
  return { n, lat, lon, offsets, targets, lengths, classes, cellStart, cellNodes: order };
}

/** Distance à vol d'oiseau en mètres */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 6371008.8;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = p2 - p1;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

/** Nœuds du graphe à moins de `radiusM` mètres, du plus proche au plus loin */
export function nearbyNodes(g: RoadGraph, lat: number, lon: number, radiusM: number) {
  const span = Math.ceil(radiusM / 111_000 / GRID / Math.cos((lat * Math.PI) / 180)) + 1;
  const ci = Math.floor(lat / GRID);
  const cj = Math.floor(lon / GRID);
  const found: { node: number; d: number }[] = [];
  for (let di = -span; di <= span; di++) {
    for (let dj = -span; dj <= span; dj++) {
      const range = g.cellStart.get((ci + di) * 100_000 + cj + dj);
      if (!range) continue;
      for (let s = range[0]; s < range[1]; s++) {
        const node = g.cellNodes[s]!;
        const d = haversine(lat, lon, g.lat[node]! / 1e5, g.lon[node]! / 1e5);
        if (d <= radiusM) found.push({ node, d });
      }
    }
  }
  return found.sort((a, b) => a.d - b.d);
}

/**
 * Kilomètres parcourus par classe d'énergie le long de l'itinéraire le plus rapide
 * depuis un point. Une seule exploration sert ensuite pour tous les véhicules et saisons.
 */
export interface Reach {
  /** Kilomètres sur autoroute, voie express et route, par nœud (NaN = non atteint) */
  hw: Float32Array;
  express: Float32Array;
  road: Float32Array;
  /** Nœud précédent sur l'itinéraire (-1 = départ) */
  prev: Int32Array;
}

/** Facteur de détour des petites routes absentes du graphe (premier et dernier kilomètres) */
export const DETOUR = 1.3;

export function exploreFrom(g: RoadGraph, lat: number, lon: number): Reach | null {
  // Départ : les grands axes à moins de 15 km, rejoints par les petites routes
  let seeds = nearbyNodes(g, lat, lon, 8_000).slice(0, 12);
  if (!seeds.length) seeds = nearbyNodes(g, lat, lon, 15_000).slice(0, 4);
  if (!seeds.length) return null;

  const n = g.n;
  const time = new Float64Array(n).fill(Infinity);
  const hw = new Float32Array(n).fill(NaN);
  const express = new Float32Array(n).fill(NaN);
  const road = new Float32Array(n).fill(NaN);
  const prev = new Int32Array(n).fill(-1);

  // Tas binaire minimal sur le temps (insertions paresseuses)
  let heapNode = new Int32Array(1 << 16);
  let heapKey = new Float64Array(1 << 16);
  let size = 0;
  const push = (node: number, key: number) => {
    if (size === heapNode.length) {
      const a = new Int32Array(size * 2);
      a.set(heapNode);
      heapNode = a;
      const b = new Float64Array(size * 2);
      b.set(heapKey);
      heapKey = b;
    }
    let i = size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heapKey[parent]! <= key) break;
      heapNode[i] = heapNode[parent]!;
      heapKey[i] = heapKey[parent]!;
      i = parent;
    }
    heapNode[i] = node;
    heapKey[i] = key;
  };
  const pop = () => {
    const node = heapNode[0]!;
    const lastNode = heapNode[--size]!;
    const lastKey = heapKey[size]!;
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= size) break;
      if (c + 1 < size && heapKey[c + 1]! < heapKey[c]!) c++;
      if (heapKey[c]! >= lastKey) break;
      heapNode[i] = heapNode[c]!;
      heapKey[i] = heapKey[c]!;
      i = c;
    }
    heapNode[i] = lastNode;
    heapKey[i] = lastKey;
    return node;
  };

  for (const { node, d } of seeds) {
    const km = (d * DETOUR) / 1000;
    const t = km / 40;
    if (t < time[node]!) {
      time[node] = t;
      hw[node] = 0;
      express[node] = 0;
      road[node] = km;
      push(node, t);
    }
  }
  const done = new Uint8Array(n);
  while (size > 0) {
    const v = pop();
    if (done[v]) continue;
    done[v] = 1;
    for (let s = g.offsets[v]!; s < g.offsets[v + 1]!; s++) {
      const w = g.targets[s]!;
      if (done[w]) continue;
      const km = g.lengths[s]! / 1000;
      const cls = g.classes[s]!;
      const t = time[v]! + km / CLASS_SPEED[cls]!;
      if (t < time[w]!) {
        time[w] = t;
        prev[w] = v;
        hw[w] = hw[v]! + (cls === 0 ? km : 0);
        express[w] = express[v]! + (cls === 1 ? km : 0);
        road[w] = road[v]! + (cls >= 2 ? km : 0);
        push(w, t);
      }
    }
  }
  return { hw, express, road, prev };
}

/** Autonomies du véhicule par type de route, pour une saison */
export interface RangeProfile {
  hw: number;
  express: number;
  road: number;
}

/** Part de batterie consommée pour atteindre un nœud (0 à 1+, NaN = non atteint) */
export const batteryUsed = (r: Reach, node: number, p: RangeProfile) =>
  r.hw[node]! / p.hw + r.express[node]! / p.express + r.road[node]! / p.road;
