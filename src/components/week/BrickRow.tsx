/**
 * Une brique de la semaine type : ses jours et son lieu, dépliés sur place. Le lieu se
 * cherche par la barre en tête ; champ vide, elle propose les plus proches de la catégorie.
 * Le travail se règle par son adresse et ne se retire pas.
 */
import { useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import AddressField from "./AddressField";
import { CategoryIcon } from "./icons";
import { daysLabel, kindOf, type Brick } from "./bricks";
import type { Place } from "./types";
import type { PoiPlace } from "@/lib/map/places";
import { DAYS, DAYS_SHORT } from "@/lib/map/week";
import { formatKm, formatNumber } from "@/lib/format";

interface Props {
  brick: Brick;
  place: Place | null;
  /** Lieux proposés, du plus proche au plus loin */
  options: PoiPlace[];
  /** Aller simple par la route */
  km: number | null;
  active: boolean;
  /** Point autour duquel chercher un autre lieu (domicile) */
  near: { lat: number; lon: number } | null;
  /** Dépliée à l'arrivée (brique tout juste ajoutée, travail sans adresse) */
  initiallyOpen?: boolean;
  /** Remplace le choix du lieu (travail : son adresse) */
  placeField?: ReactNode;
  /** Sous le lieu quand il manque (travail : trajet de « Mon trajet ») */
  fallback?: ReactNode;
  onDays: (days: number[]) => void;
  onPick: (place: Place | null) => void;
  onRemove?: () => void;
}

const shortKm = (km: number) => (km < 10 ? `${formatNumber(km, 1)} km` : formatKm(km));

export default function BrickRow({ brick, place, options, km, active, near, initiallyOpen = false, placeField, fallback, onDays, onPick, onRemove }: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const kind = kindOf(brick.cat);
  const when = `${daysLabel(brick.days)}${kind.note ? `, ${kind.note}` : ""}`;

  return (
    <li className="week-brick" data-active={active ? "1" : undefined} data-new={initiallyOpen ? "1" : undefined}>
      <div className="week-brick-head">
        <span className="week-outing-icon">
          <CategoryIcon cat={brick.cat} size={15} />
        </span>
        <button type="button" className="week-brick-main" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="week-brick-title">
            <b>{kind.label}</b>
            <span className="truncate">{when}</span>
          </span>
          <span className="week-brick-place">
            <span className="truncate">{place ? place.label : brick.cat === "travail" ? "Ajouter l'adresse" : options.length ? "Choisir un lieu" : "Aucun lieu proche"}</span>
            {km !== null && <span className="tabular shrink-0">{shortKm(km)}</span>}
          </span>
        </button>
        <ChevronDown size={15} className="week-chevron shrink-0" data-open={open ? "1" : undefined} aria-hidden="true" />
        {onRemove && (
          <button type="button" className="week-brick-remove" onClick={onRemove} aria-label={`Retirer ${kind.label.toLowerCase()} (${when})`}>
            <X size={15} strokeWidth={2.25} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="week-unfold" data-open={open ? "1" : undefined}>
        <div className="week-brick-body">
          <div className="week-days-pick" role="group" aria-label={`Jours : ${kind.label.toLowerCase()}`}>
            {DAYS_SHORT.map((d, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={brick.days.includes(i)}
                aria-label={DAYS[i]}
                title={DAYS[i]}
                onClick={() => onDays(brick.days.includes(i) ? brick.days.filter((x) => x !== i) : [...brick.days, i].sort())}
              >
                {d}
              </button>
            ))}
          </div>

          {placeField ?? (
            <AddressField
              label={`Lieu : ${kind.label.toLowerCase()}`}
              hideLabel
              inline
              near={near}
              value={null}
              selected={place}
              autoFocus={initiallyOpen}
              suggestions={options.slice(0, 6).map((o) => ({ label: o.name, detail: "", lat: o.lat, lon: o.lon, d: o.d }))}
              placeholder="Chercher un lieu : nom, adresse, commune"
              onChange={(p) => {
                if (!p) return;
                onPick(p);
                setOpen(false);
              }}
            />
          )}
          {fallback}
        </div>
      </div>
    </li>
  );
}
