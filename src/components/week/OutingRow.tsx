/**
 * Une sortie de la semaine : lieu proposé (le plus proche), remplaçable par un
 * autre lieu de la même catégorie ou par une adresse ; dépliée sur place.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import AddressField from "./AddressField";
import { CategoryIcon } from "./icons";
import type { Place } from "./types";
import type { PoiPlace } from "@/lib/map/places";
import { formatKm, formatNumber } from "@/lib/format";

interface Props {
  cat: string;
  label: string;
  when: string;
  on: boolean;
  place: Place | null;
  /** Lieux proposés, du plus proche au plus loin */
  options: PoiPlace[];
  /** Aller simple par la route */
  km: number | null;
  active: boolean;
  onToggle: (on: boolean) => void;
  onPick: (place: Place | null) => void;
}

const shortKm = (km: number) => (km < 10 ? `${formatNumber(km, 1)} km` : formatKm(km));

export default function OutingRow({ cat, label, when, on, place, options, km, active, onToggle, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);

  return (
    <li className="week-outing" data-off={on ? undefined : "1"} data-active={active ? "1" : undefined}>
      <div className="week-outing-head">
        <span className="week-outing-icon">
          <CategoryIcon cat={cat} size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-[14.5px]">{label}</span>
            <span className="text-[12.5px] text-[var(--color-text-faint)] truncate">{when}</span>
          </div>
          {on && (
            <button
              type="button"
              className="week-outing-place"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <span className="truncate">{place ? place.label : options.length ? "Recherche…" : "Aucun lieu proche"}</span>
              {km !== null && <span className="tabular text-[var(--color-text-faint)] shrink-0">{shortKm(km)}</span>}
              <ChevronDown size={14} className="shrink-0 week-chevron" aria-hidden="true" />
            </button>
          )}
        </div>
        <label className="week-switch">
          <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} aria-label={`${label} ${when}`} />
          <span aria-hidden="true" />
        </label>
      </div>

      <div className="week-unfold" data-open={open && on ? "1" : undefined}>
        <div>
          <p className="week-options-note">À vol d'oiseau depuis chez vous</p>
          <ul className="week-options" role="listbox" aria-label={`Autres lieux : ${label.toLowerCase()}`}>
            {options.slice(0, 6).map((o) => {
              const selected = !!place && Math.abs(place.lat - o.lat) < 1e-5 && Math.abs(place.lon - o.lon) < 1e-5;
              return (
                <li key={`${o.lat},${o.lon}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onPick({ label: o.name, lat: o.lat, lon: o.lon });
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{o.name}</span>
                    <span className="tabular text-[var(--color-text-faint)] shrink-0">{o.d < 1000 ? `${Math.round(o.d / 50) * 50} m` : shortKm(o.d / 1000)}</span>
                  </button>
                </li>
              );
            })}
            <li>
              <button type="button" className="text-[var(--color-accent)] font-semibold" onClick={() => setCustom((c) => !c)}>
                Un autre lieu…
              </button>
            </li>
          </ul>
          {custom && (
            <div className="pt-1 pb-2">
              <AddressField
                label="Adresse du lieu"
                value={null}
                placeholder="Adresse ou nom du lieu"
                onChange={(p) => {
                  if (!p) return;
                  onPick(p);
                  setCustom(false);
                  setOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
