/**
 * Un grand trajet de l'année : destination, allers-retours par an, saison, et ce que ça donne
 * avec le modèle choisi (arrêts de recharge à l'aller, minutes, coût d'un aller-retour).
 * Toucher la ligne montre le trajet sur la carte et déplie sur place le détail de l'aller :
 * vitesse sur autoroute, arrêts posés sur les bornes du tracé, heure de route et de recharge.
 */
import { Minus, Plus, Snowflake, Sun, X } from "lucide-react";
import type { HolidayResult, HolidayTrip } from "@/lib/map/holiday";
import type { Season } from "@/lib/map/energy";
import { HW_SPEEDS, type HwSpeed } from "@/lib/map/roadtrip";
import { formatKm, formatNumber } from "@/lib/format";
import { drawTripCard, type TripCard } from "@/lib/shareCard";
import ShareImage from "@/components/ui/ShareImage";

interface Props {
  trip: HolidayTrip;
  result: HolidayResult | null;
  /** Coût de l'électricité d'un aller-retour (€) */
  cost: number | null;
  active: boolean;
  onFocus: () => void;
  onTimes: (times: number) => void;
  onSeason: (season: Season) => void;
  onSpeed: (speed: HwSpeed) => void;
  onRemove: () => void;
  /** Image du trajet à partager (sans adresse), quand le trajet est calculé */
  card?: TripCard | null;
}

const duration = (min: number) => {
  const m = Math.max(5, Math.ceil(min / 5) * 5);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};
const pct = (x: number) => `${Math.round(x * 100)} %`;

export default function HolidayRow({ trip, result, cost, active, onFocus, onTimes, onSeason, onSpeed, onRemove, card }: Props) {
  const name = trip.label.split(",")[0];
  const plan = result?.plan ?? null;
  const speed = trip.speed ?? 130;
  return (
    <li className="week-trip" data-active={active ? "1" : undefined}>
      <button type="button" className="week-trip-main" aria-pressed={active} aria-expanded={active} onClick={onFocus}>
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

      {/* Détail de l'aller, déplié sur place quand le trajet est montré sur la carte */}
      <div className="week-trip-plan" data-open={active && plan ? "1" : undefined} aria-hidden={!(active && plan)}>
        <div className="week-trip-plan-inner">
          {plan && (
            <>
              <div className="week-trip-plan-head">
                <span className="week-seg week-seg-sm" role="radiogroup" aria-label="Vitesse sur autoroute">
                  {HW_SPEEDS.map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={speed === s} tabIndex={active ? 0 : -1} onClick={() => onSpeed(s)}>
                      {s}
                    </button>
                  ))}
                </span>
                <span>km/h sur autoroute</span>
              </div>
              {plan.gapKm !== null ? (
                <p className="week-trip-plan-gap">
                  Aucune borne rapide repérée à portée après le km {plan.gapKm} : à cette vitesse, ce trajet demande un arrêt hors des
                  grands axes.
                </p>
              ) : (
                <ol className="week-trip-stops">
                  {plan.stops.map((s, k) => (
                    <li key={k}>
                      <span className="week-trip-stop-km">km {s.km}</span>
                      <span className="week-trip-stop-name">
                        <b>{s.name}</b> {s.kw} kW
                      </span>
                      <span className="week-trip-stop-charge">
                        {pct(s.arrive)} → {pct(s.leave)}, <b>{duration(s.minutes)}</b>
                      </span>
                    </li>
                  ))}
                  <li className="week-trip-stop-end">
                    <span className="week-trip-stop-km">arrivée</span>
                    <span className="week-trip-stop-name">
                      {duration(plan.driveMinutes)} de route{plan.stops.length > 0 && <>, {duration(plan.chargeMinutes)} de recharge</>}
                    </span>
                    <span className="week-trip-stop-charge">{pct(plan.arrive)}</span>
                  </li>
                </ol>
              )}
              {card && active && (
                <ShareImage
                  className="mt-3"
                  label="Image de ce trajet"
                  draw={() => drawTripCard(card)}
                  version={JSON.stringify(card)}
                  fileName={`trajet-${(name ?? "trajet").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}-evly.png`}
                  shareTitle={`${card.from ? `${card.from} → ` : ""}${card.to} en électrique`}
                  shareText={`${card.from ? `${card.from} → ` : "Vers "}${card.to} en ${card.vehicle} : ${card.stopCount ? `${card.stopCount} ${card.stopCount > 1 ? "arrêts" : "arrêt"} de recharge` : "sans arrêt"}.`}
                  shareUrl={`${location.origin}${location.pathname}`}
                  note="Seule la commune de départ figure sur l'image. Elle est créée sur votre appareil."
                />
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}
