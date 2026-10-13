"""
Lieux de « Ma semaine », extraits de l'OpenStreetMap France (Geofabrik) :
  - lieux du quotidien (courses, boulangerie, bricolage, restaurant, école, sport…),
    découpés en tuiles de 0,2° chargées autour du domicile ;
  - destinations (villes, sites touristiques notables, c'est-à-dire décrits sur
    Wikipédia ou Wikidata) pour les balades et la liste « où aller ».

Usage :
  python scripts/map/build-places.py scratch/osm/france.osm.pbf public/carte

Dépendances : pip install osmium
Les lieux cartographiés en surface (bâtiment d'un supermarché…) sont placés sur
leur premier nœud : quelques dizaines de mètres d'écart au plus.
"""

import json
import math
import os
import sys
import time
from collections import defaultdict

import osmium

BBOX = (-5.3, 41.3, 9.7, 51.2)
TILE = 0.2
# En ville, au plus 3 lieux d'une même catégorie par carré d'environ 1 km : assez pour choisir
PER_KM = 3

# Catégories du quotidien : (clé, valeurs) -> code court
DAILY = [
    ("shop", {"supermarket"}, "courses"),
    ("shop", {"bakery"}, "boulangerie"),
    ("shop", {"doityourself", "hardware", "garden_centre"}, "bricolage"),
    ("amenity", {"restaurant"}, "restaurant"),
    ("amenity", {"school"}, "ecole"),
    ("amenity", {"cinema"}, "cinema"),
    ("leisure", {"sports_centre", "fitness_centre", "swimming_pool"}, "sport"),
    ("amenity", {"marketplace"}, "marche"),
    ("amenity", {"pharmacy"}, "pharmacie"),
]
# Sites de balade locaux et destinations
SIGHTS = [
    ("tourism", {"attraction", "museum", "zoo", "theme_park", "viewpoint", "aquarium"}),
    ("historic", {"castle", "monument", "abbey", "fort", "archaeological_site", "ruins", "church"}),
    ("natural", {"beach", "peak", "waterfall", "cave_entrance", "gorge"}),
    ("leisure", {"park", "nature_reserve", "beach_resort"}),
]
SIGHT_KIND = {
    "attraction": "site", "museum": "musee", "zoo": "zoo", "theme_park": "parc", "viewpoint": "panorama",
    "aquarium": "zoo", "castle": "chateau", "monument": "monument", "abbey": "patrimoine", "fort": "patrimoine",
    "archaeological_site": "patrimoine", "ruins": "patrimoine", "church": "patrimoine", "beach": "plage",
    "peak": "sommet", "waterfall": "nature", "cave_entrance": "nature", "gorge": "nature", "park": "parc",
    "nature_reserve": "nature", "beach_resort": "plage",
}


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def classify(tags):
    """(type, catégorie, notable) ou None"""
    for key, values, code in DAILY:
        if tags.get(key) in values:
            return ("daily", code, False)
    notable = "wikidata" in tags or "wikipedia" in tags
    for key, values in SIGHTS:
        v = tags.get(key)
        if v in values:
            # Seulement les sites notables, sinon des dizaines de milliers de sommets et chapelles
            return ("sight", SIGHT_KIND[v], True) if notable else None
    place = tags.get("place")
    if place in ("city", "town"):
        return ("town", place, True)
    return None


def main(src, dst):
    t0 = time.time()
    found = []  # (type, catégorie, notable, nom, lat, lon, population, ref du premier nœud)
    keys = ["shop", "amenity", "leisure", "tourism", "historic", "natural", "place"]
    fp = osmium.FileProcessor(src, osmium.osm.NODE | osmium.osm.WAY).with_filter(osmium.filter.KeyFilter(*keys))
    for obj in fp:
        tags = obj.tags
        name = tags.get("name")
        if not name:
            continue
        c = classify(tags)
        if not c:
            continue
        try:
            pop = int(str(tags.get("population", "0")).replace(" ", "").split(";")[0])
        except ValueError:
            pop = 0
        if obj.is_node():
            found.append((*c, name, obj.location.lat, obj.location.lon, pop, None))
        elif len(obj.nodes):
            found.append((*c, name, None, None, pop, obj.nodes[0].ref))
    log(f"{len(found):,} lieux trouvés, positions des surfaces…")

    need = {f[7] for f in found if f[7] is not None}
    loc = {}
    for n in osmium.FileProcessor(src, osmium.osm.NODE).with_filter(osmium.filter.IdFilter(need)):
        loc[n.id] = (n.location.lat, n.location.lon)

    tiles = defaultdict(list)
    destinations = []
    seen = set()
    density = defaultdict(int)
    for kind, cat, notable, name, lat, lon, pop, ref in found:
        if lat is None:
            if ref not in loc:
                continue
            lat, lon = loc[ref]
        if not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
            continue
        # Doublons nœud + bâtiment pour un même lieu
        key = (cat, name.lower(), round(lat, 3), round(lon, 3))
        if key in seen:
            continue
        seen.add(key)
        qlat, qlon = round(lat * 1e4), round(lon * 1e4)
        if kind == "daily":
            cell = (cat, round(lat, 2), round(lon, 2))
            density[cell] += 1
            if density[cell] > PER_KM:
                continue
            tiles[(math.floor(lat / TILE), math.floor(lon / TILE))].append([cat, qlat, qlon, name])
        elif kind == "sight":
            destinations.append([cat, qlat, qlon, name, 0])
        else:
            destinations.append(["ville", qlat, qlon, name, pop])

    out_dir = os.path.join(dst, "lieux")
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, f))
    for (i, j), items in tiles.items():
        with open(os.path.join(out_dir, f"{i}_{j}.json"), "w", encoding="utf-8") as fh:
            json.dump(items, fh, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(dst, "destinations.json"), "w", encoding="utf-8") as fh:
        json.dump(destinations, fh, ensure_ascii=False, separators=(",", ":"))

    counts = defaultdict(int)
    for items in tiles.values():
        for it in items:
            counts[it[0]] += 1
    log(f"{len(tiles)} tuiles : " + ", ".join(f"{k} {v:,}" for k, v in sorted(counts.items(), key=lambda kv: -kv[1])))
    log(f"{len(destinations):,} destinations en {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
