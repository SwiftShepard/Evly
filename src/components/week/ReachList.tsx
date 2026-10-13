/**
 * « Jusqu'où ? » en noms de lieux : villes et sites notables accessibles sans
 * recharger depuis le domicile, même en hiver ou seulement en été.
 */
import { useEffect, useState } from "react";
import { CategoryIcon } from "./icons";
import type { Driven, Place } from "./types";
import { budgetFor, rangeProfile } from "@/lib/map/energy";
import { computeTrips } from "@/lib/map/client";
import { CATEGORY_LABEL, loadDestinations, type Destination } from "@/lib/map/places";
import { haversine } from "@/lib/map/roadGraph";
import { formatKm } from "@/lib/format";

interface Props {
  vehicle: Driven;
  home: Place;
  tripKind: "return" | "oneway";
  selected: string | null;
  onSelect: (target: { key: string; place: Place } | null) => void;
}

interface Reached extends Destination {
  km: number;
  /** Batterie de l'aller-retour (ou de l'aller) en hiver et en été */
  winter: number;
  summer: number;
}

const SIGHTS = new Set(["chateau", "site", "nature", "parc", "panorama", "plage", "zoo", "musee", "patrimoine", "monument"]);

export default function ReachList({ vehicle, home, tripKind, selected, onSelect }: Props) {
  const [list, setList] = useState<Reached[] | null>(null);
  const budget = budgetFor(tripKind);
  const factor = tripKind === "return" ? 2 : 1;

  useEffect(() => {
    let stale = false;
    const summer = rangeProfile(vehicle.range, "summer");
    const winter = rangeProfile(vehicle.range, "winter");
    // Au-delà de cette distance à vol d'oiseau, rien n'est atteignable
    const maxM = budget * Math.max(summer.road, summer.express, summer.hw) * 1000;
    loadDestinations()
      .then((all) => {
        const near = all.filter((d) => {
          const dist = haversine(home.lat, home.lon, d.lat, d.lon);
          return dist > 5_000 && dist <= maxM;
        });
        return computeTrips(near, [summer, winter]).then((trips) => ({ near, trips }));
      })
      .then(({ near, trips }) => {
        if (stale) return;
        const out: Reached[] = [];
        near.forEach((d, k) => {
          const t = trips[k];
          const [s = Infinity, w = Infinity] = t?.used ?? [];
          if (t && s <= budget) out.push({ ...d, km: t.km, summer: s, winter: w });
        });
        setList(out);
      });
    return () => {
      stale = true;
    };
  }, [vehicle, home, budget]);

  if (!list) return <p className="text-[13px] text-[var(--color-text-faint)]">Recherche des destinations…</p>;

  const groups = [
    { title: "Même en hiver", season: "winter" as const, items: list.filter((d) => d.winter <= budget) },
    { title: "En été seulement", season: "summer" as const, items: list.filter((d) => d.winter > budget) },
  ];

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => {
        // Les villes qui comptent, hors proche banlieue ; puis les sites les plus lointains, deux par type au plus
        const towns = g.items
          .filter((d) => d.kind === "ville" && d.km >= 20)
          .sort((a, b) => b.population - a.population)
          .slice(0, 5);
        const perKind = new Map<string, number>();
        const sights = g.items
          .filter((d) => SIGHTS.has(d.kind))
          .sort((a, b) => b.km - a.km)
          .filter((d, i, arr) => arr.findIndex((x) => x.name === d.name) === i)
          .filter((d) => {
            const n = perKind.get(d.kind) ?? 0;
            perKind.set(d.kind, n + 1);
            return n < 2;
          })
          .slice(0, 5);
        if (!towns.length && !sights.length) return null;
        return (
          <section key={g.title}>
            <h2 className="label-data mb-2">{g.title}</h2>
            <ul className="week-reach">
              {[...towns, ...sights].map((d) => {
                const key = `${d.kind}-${d.name}-${d.lat}`;
                return (
                  <li key={key}>
                    <button type="button" aria-pressed={selected === key} onClick={() => onSelect(selected === key ? null : { key, place: { label: d.name, lat: d.lat, lon: d.lon } })}>
                      <span className="week-outing-icon" aria-hidden="true">
                        <CategoryIcon cat={d.kind} size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-[14px]">{d.name}</span>
                        <span className="block text-[12px] text-[var(--color-text-faint)]">{CATEGORY_LABEL[d.kind] ?? "Lieu"}</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block tabular text-[13.5px] font-semibold">{formatKm(d.km)}</span>
                        <span className="block tabular text-[11.5px] text-[var(--color-text-faint)]">
                          {Math.round((g.season === "winter" ? d.winter : d.summer) * factor * 100)} % {g.season === "winter" ? "en hiver" : "en été"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
