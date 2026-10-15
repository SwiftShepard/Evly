/**
 * Un grand trajet de l'année : destination, allers-retours par an, saison, et ce que ça donne
 * avec le modèle choisi (arrêts de recharge à l'aller, minutes, coût d'un aller-retour).
 * Toucher la ligne montre le trajet sur la carte.
 */
import { Minus, Plus, Snowflake, Sun, X } from "lucide-react";
import type { HolidayResult, HolidayTrip } from "@/lib/map/holiday";
import type { Season } from "@/lib/map/energy";
import { formatKm, formatNumber } from "@/lib/format";

interface Props {
  trip: HolidayTrip;
  result: HolidayResult | null;
  /** Coût de l'électricité d'un aller-retour (€) */
  cost: number | null;
  active: boolean;
  onFocus: () => void;
  onTimes: (times: number) => void;
  onSeason: (season: Season) => void;
  onRemove: () => void;
}

const duration = (min: number) => {
  const m = Math.max(5, Math.ceil(min / 5) * 5);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};

export default function HolidayRow({ trip, result, cost, active, onFocus, onTimes, onSeason, onRemove }: Props) {
  const name = trip.label.split(",")[0];
  return (
    <li className="week-trip" data-active={active ? "1" : undefined}>
      <button type="button" className="week-trip-main" aria-pressed={active} onClick={onFocus}>
        <b className="truncate">{name}</b>
        <span className="week-trip-sub">
          {result ? (
            <>
              {formatKm(Math.round(result.kmReturn))} aller-retour ·{" "}
              {result.stops === 0 ? "sans arrêt" : `${result.stops} ${result.stops > 1 ? "arrêts" : "arrêt"} à l'aller, ${duration(result.minutes)}`}
              {cost !== null && <> · {formatNumber(Math.round(cost))} €</>}
            </>
          ) : (
            "Calcul de la route…"
          )}
        </span>
      </button>
      <div className="week-trip-controls">
        <span className="week-stepper" role="group" aria-label={`Allers-retours par an vers ${name}`}>
          <button type="button" onClick={() => onTimes(Math.max(1, trip.times - 1))} disabled={trip.times <= 1} aria-label="Un de moins">
            <Minus size={13} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <span className="tabular">{trip.times}× par an</span>
          <button type="button" onClick={() => onTimes(Math.min(24, trip.times + 1))} aria-label="Un de plus">
            <Plus size={13} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </span>
        <span className="week-seg week-seg-sm" role="radiogroup" aria-label={`Saison du trajet vers ${name}`}>
          <button type="button" role="radio" aria-checked={trip.season === "summer"} onClick={() => onSeason("summer")} title="En été">
            <Sun size={13} strokeWidth={2.4} aria-hidden="true" />
            <span className="sr-only">Été</span>
          </button>
          <button type="button" role="radio" aria-checked={trip.season === "winter"} onClick={() => onSeason("winter")} title="En hiver (-5 °C)">
            <Snowflake size={13} strokeWidth={2.4} aria-hidden="true" />
            <span className="sr-only">Hiver</span>
          </button>
        </span>
        <button type="button" className="week-brick-remove" onClick={onRemove} aria-label={`Retirer le trajet vers ${name}`}>
          <X size={15} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
