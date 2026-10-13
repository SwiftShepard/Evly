"""
Graphe routier compact de la France métropolitaine pour « Ma semaine ».

Lit l'extrait OpenStreetMap France (Geofabrik) et ne garde que les grands axes
(autoroutes, voies express, nationales et départementales principales). Le
navigateur calcule ensuite lui-même, sur ce graphe, jusqu'où va une voiture :
aucun serveur ni service de calcul d'itinéraire externe.

Usage :
  python scripts/map/build-road-graph.py scratch/osm/france.osm.pbf public/carte/routes.bin.gz

Dépendances : pip install osmium numpy

Format (little-endian, puis gzip) :
  "EVRG" | u8 version | u32 nœuds | u32 arêtes
  nœuds  : varint zigzag des écarts de lat/lon (1e-5 degré), triés sur une courbe de Hilbert
  arêtes : par nœud i, varint du nombre d'arêtes vers j > i, puis pour chacune
           varint (j - i), varint (longueur en dizaines de mètres × 4 + classe)
  Classes : 0 autoroute, 1 voie express, 2 route principale, 3 bretelle
"""

import gzip
import math
import struct
import sys
import time
from array import array

import numpy as np
import osmium

# highway OSM -> (classe d'énergie, vitesse moyenne retenue en km/h)
HIGHWAYS = {
    "motorway": (0, 120),
    "trunk": (1, 100),
    "primary": (2, 75),
    "secondary": (2, 65),
    "motorway_link": (3, 60),
    "trunk_link": (3, 50),
    "primary_link": (3, 45),
    "secondary_link": (3, 40),
}
# France métropolitaine et Corse
BBOX = (-5.3, 41.3, 9.7, 51.2)
# Au-delà, une arête est coupée par un nœud intermédiaire (tracé de la zone et des trajets)
MAX_EDGE_M = 3000
# Composantes plus petites ignorées (îlots de routes non reliés au réseau)
MIN_COMPONENT = 300


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def haversine(lat1, lon1, lat2, lon2):
    r = 6371008.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def read_ways(path):
    """Voies retenues : liste de (classe, tableau d'identifiants de nœuds)."""
    ways = []
    fp = osmium.FileProcessor(path, osmium.osm.WAY).with_filter(osmium.filter.KeyFilter("highway"))
    for w in fp:
        hw = w.tags.get("highway")
        if hw not in HIGHWAYS:
            continue
        if w.tags.get("access") in ("no", "private") or w.tags.get("motor_vehicle") in ("no", "private"):
            continue
        if w.tags.get("area") == "yes":
            continue
        refs = array("q", (n.ref for n in w.nodes))
        if len(refs) >= 2:
            ways.append((HIGHWAYS[hw][0], refs))
    return ways


def read_locations(path, ids):
    """Coordonnées des nœuds utilisés, indexées comme `ids` (trié)."""
    lat = np.full(len(ids), np.nan)
    lon = np.full(len(ids), np.nan)
    fp = osmium.FileProcessor(path, osmium.osm.NODE).with_filter(osmium.filter.IdFilter(ids.tolist()))
    for n in fp:
        k = np.searchsorted(ids, n.id)
        lat[k] = n.location.lat
        lon[k] = n.location.lon
    return lat, lon


def hilbert_index(x, y, order=16):
    """Index de Hilbert de coordonnées entières (0 .. 2^order - 1), vectorisé."""
    x = x.astype(np.int64).copy()
    y = y.astype(np.int64).copy()
    d = np.zeros_like(x)
    s = 1 << (order - 1)
    while s > 0:
        rx = ((x & s) > 0).astype(np.int64)
        ry = ((y & s) > 0).astype(np.int64)
        d += s * s * ((3 * rx) ^ ry)
        # rotation
        flip = ry == 0
        swap_x = np.where(flip & (rx == 1), s - 1 - x, x)
        swap_y = np.where(flip & (rx == 1), s - 1 - y, y)
        x = np.where(flip, swap_y, swap_x)
        y = np.where(flip, swap_x, swap_y)
        s >>= 1
    return d


def varint(out, v):
    while v >= 0x80:
        out.append((v & 0x7F) | 0x80)
        v >>= 7
    out.append(v)


def zigzag(v):
    return (v << 1) ^ (v >> 63)


def main(src, dst):
    t0 = time.time()
    log("Lecture des voies…")
    ways = read_ways(src)
    log(f"{len(ways):,} voies retenues")

    all_refs = np.concatenate([np.frombuffer(r, dtype=np.int64) for _, r in ways])
    ids, counts = np.unique(all_refs, return_counts=True)
    log(f"{len(ids):,} nœuds référencés, lecture des coordonnées…")
    lat, lon = read_locations(src, ids)
    log("Coordonnées lues")

    # Nœuds du graphe : extrémités de voies et croisements
    keep = counts >= 2
    for _, refs in ways:
        keep[np.searchsorted(ids, refs[0])] = True
        keep[np.searchsorted(ids, refs[-1])] = True

    # Arêtes entre nœuds gardés, longueur réelle le long de la voie
    edges = {}
    extra_lat, extra_lon = [], []  # nœuds intermédiaires créés sur les longues arêtes
    graph_id = np.full(len(ids), -1, dtype=np.int64)
    graph_id[keep] = np.arange(int(keep.sum()))
    n_base = int(keep.sum())

    def add_edge(a, b, length, cls):
        if a == b:
            return
        key = (a, b) if a < b else (b, a)
        cur = edges.get(key)
        if cur is None or length < cur[0]:
            edges[key] = (length, cls)

    for cls, refs in ways:
        idx = np.searchsorted(ids, np.frombuffer(refs, dtype=np.int64))
        if np.isnan(lat[idx]).any():
            continue  # voie coupée par le bord de l'extrait
        start = graph_id[idx[0]]
        acc = 0.0
        for k in range(1, len(idx)):
            p, q = idx[k - 1], idx[k]
            acc += haversine(lat[p], lon[p], lat[q], lon[q])
            if keep[q]:
                add_edge(start, graph_id[q], acc, cls)
                start, acc = graph_id[q], 0.0
            elif acc >= MAX_EDGE_M:
                nid = n_base + len(extra_lat)
                extra_lat.append(lat[q])
                extra_lon.append(lon[q])
                add_edge(start, nid, acc, cls)
                start, acc = nid, 0.0

    node_lat = np.concatenate([lat[keep], np.array(extra_lat)])
    node_lon = np.concatenate([lon[keep], np.array(extra_lon)])
    del ways, all_refs
    log(f"{len(node_lat):,} nœuds, {len(edges):,} arêtes avant simplification")

    # Contraction des nœuds de degré 2 (voie découpée sans croisement)
    adj = [dict() for _ in range(len(node_lat))]
    for (a, b), (length, cls) in edges.items():
        adj[a][b] = (length, cls)
        adj[b][a] = (length, cls)
    changed = True
    while changed:
        changed = False
        for v in range(len(adj)):
            nb = adj[v]
            if len(nb) != 2:
                continue
            (a, (la, ca)), (b, (lb, cb)) = nb.items()
            if ca != cb or la + lb > MAX_EDGE_M or a == b or b in adj[a]:
                continue
            del adj[a][v], adj[b][v]
            adj[a][b] = adj[b][a] = (la + lb, ca)
            adj[v] = {}
            changed = True

    # Composantes connexes et emprise métropolitaine
    alive = np.array([len(nb) > 0 for nb in adj])
    inside = (node_lon >= BBOX[0]) & (node_lon <= BBOX[2]) & (node_lat >= BBOX[1]) & (node_lat <= BBOX[3])
    comp = np.full(len(adj), -1, dtype=np.int64)
    sizes = []
    for s in range(len(adj)):
        if comp[s] >= 0 or not alive[s]:
            continue
        c = len(sizes)
        stack, size = [s], 0
        comp[s] = c
        while stack:
            v = stack.pop()
            size += 1
            for w in adj[v]:
                if comp[w] < 0:
                    comp[w] = c
                    stack.append(w)
        sizes.append(size)
    sizes = np.array(sizes)
    good = alive & inside & (comp >= 0) & (sizes[np.maximum(comp, 0)] >= MIN_COMPONENT)
    log(f"{len(sizes):,} composantes, {int((sizes >= MIN_COMPONENT).sum())} gardées, {int(good.sum()):,} nœuds")

    # Tri spatial (courbe de Hilbert) : voisins proches, écarts petits, meilleure compression
    old = np.nonzero(good)[0]
    qlat = np.round(node_lat[old] * 1e5).astype(np.int64)
    qlon = np.round(node_lon[old] * 1e5).astype(np.int64)
    hx = ((node_lon[old] - BBOX[0]) / (BBOX[2] - BBOX[0]) * 65535).astype(np.int64)
    hy = ((node_lat[old] - BBOX[1]) / (BBOX[3] - BBOX[1]) * 65535).astype(np.int64)
    order = np.argsort(hilbert_index(hx, hy))
    old = old[order]
    qlat, qlon = qlat[order], qlon[order]
    new_id = np.full(len(adj), -1, dtype=np.int64)
    new_id[old] = np.arange(len(old))

    out = bytearray(b"EVRG")
    out += struct.pack("<BII", 1, len(old), 0)  # nombre d'arêtes réécrit plus bas
    plat = plon = 0
    for la, lo in zip(qlat.tolist(), qlon.tolist()):
        varint(out, zigzag(la - plat))
        varint(out, zigzag(lo - plon))
        plat, plon = la, lo
    n_edges = 0
    for i, v in enumerate(old.tolist()):
        fwd = sorted((int(new_id[w]), length, cls) for w, (length, cls) in adj[v].items() if new_id[w] > i)
        varint(out, len(fwd))
        for j, length, cls in fwd:
            varint(out, j - i)
            varint(out, max(1, round(length / 10)) * 4 + cls)
            n_edges += 1
    struct.pack_into("<I", out, 9, n_edges)

    with gzip.open(dst, "wb", compresslevel=9) as f:
        f.write(out)
    total_km = sum(length for v in old.tolist() for w, (length, _) in adj[v].items() if new_id[w] > new_id[v]) / 1000
    log(f"{len(old):,} nœuds, {n_edges:,} arêtes, {total_km:,.0f} km de routes")
    log(f"Brut {len(out) / 1e6:.1f} Mo -> {dst} en {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
