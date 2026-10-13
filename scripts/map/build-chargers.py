"""
Bornes de recharge de « Ma semaine », depuis la Base nationale des IRVE (data.gouv.fr,
schéma statique consolidé). Une ligne par point de charge dans la source ; on
regroupe par station et on découpe en tuiles de 0,5°, comme les lieux.

Usage :
  python scripts/map/build-chargers.py scratch/irve/irve.csv public/carte

Sortie par station : [lat × 1e4, lon × 1e4, puissance max (kW), points de charge, nom, accès]
  accès : 1 = libre et 24 h/24, 0 = horaires ou accès restreints
"""

import csv
import json
import math
import os
import sys
from collections import defaultdict

BBOX = (-5.3, 41.3, 9.7, 51.2)
TILE = 0.5


def main(src, dst):
    stations = {}
    with open(src, encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            try:
                lon = float(row["consolidated_longitude"])
                lat = float(row["consolidated_latitude"])
                kw = float(row["puissance_nominale"] or 0)
            except ValueError:
                continue
            if not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
                continue
            if row["station_deux_roues"].strip().lower() == "true":
                continue
            # Certains opérateurs déclarent en watts
            if kw > 1000:
                kw /= 1000
            key = row["id_station_itinerance"] if row["id_station_itinerance"] not in ("", "Non concerné") else f"{lat:.5f},{lon:.5f}"
            s = stations.get(key)
            if s is None:
                name = (row["nom_enseigne"] or row["nom_station"] or row["nom_operateur"]).strip()
                free = "libre" in row["condition_acces"].lower() and row["horaires"].strip() in ("24/7", "")
                s = stations[key] = {"lat": lat, "lon": lon, "kw": 0.0, "pdc": 0, "name": name[:60], "free": free}
            s["kw"] = max(s["kw"], kw)
            s["pdc"] += 1

    tiles = defaultdict(list)
    for s in stations.values():
        tiles[(math.floor(s["lat"] / TILE), math.floor(s["lon"] / TILE))].append(
            [round(s["lat"] * 1e4), round(s["lon"] * 1e4), round(s["kw"]), s["pdc"], s["name"], 1 if s["free"] else 0]
        )
    out_dir = os.path.join(dst, "bornes")
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, f))
    for (i, j), items in tiles.items():
        with open(os.path.join(out_dir, f"{i}_{j}.json"), "w", encoding="utf-8") as fh:
            json.dump(items, fh, ensure_ascii=False, separators=(",", ":"))
    fast = sum(1 for s in stations.values() if s["kw"] >= 50)
    print(f"{len(stations):,} stations ({fast:,} rapides 50 kW et plus) en {len(tiles)} tuiles")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
