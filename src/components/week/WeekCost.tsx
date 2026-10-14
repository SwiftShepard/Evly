/**
 * Coût de l'énergie, électrique contre essence, pour la semaine et sur un an
 * (52 semaines comme celle-ci), en colonnes serrées dans la barre du bas. Pendant la
 * lecture, les compteurs montent depuis lundi et la colonne de l'année s'efface.
 */
import { formatNumber } from "@/lib/format";
import type { FuelPrice } from "@/lib/map/fuel";
import { ICE_L_100 } from "@/lib/map/fuel";
import { WEEKS_PER_YEAR } from "@/lib/map/mileage";

interface Props {
  /** Kilomètres et énergie (kWh prélevés au réseau) de la semaine, ou depuis lundi pendant la lecture */
  km: number;
  kwh: number;
  /** Prix moyen du kWh de la semaine (maison, travail, borne) */
  eurPerKwh: number;
  fuel: FuelPrice | null;
  live: boolean;
}

/** Montant à deux décimales fixes (« 7,30 € »), sans décimales au-delà de 100 € */
const money = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = (n: number) => (Math.abs(n) < 100 ? `${money.format(n)} €` : `${formatNumber(Math.round(n))} €`);

export default function WeekCost({ km, kwh, eurPerKwh, fuel, live }: Props) {
  if (!fuel) return null;
  const elec = kwh * eurPerKwh;
  const petrol = ((km * ICE_L_100) / 100) * fuel.eur;
  const saved = petrol - elec;
  const updated = fuel.updated ? new Date(fuel.updated).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;
  const year = (n: number) => n * WEEKS_PER_YEAR;
  const basis = `${money.format(eurPerKwh)} €/kWh ; essence ${money.format(fuel.eur)} €/l${fuel.stations ? `, moyenne nationale${updated ? ` du ${updated}` : ""}` : ""}, ${formatNumber(ICE_L_100, 1)} l/100 km. Un an = 52 semaines comme celle-ci, hors vacances.`;

  return (
    <section className="week-stat week-cost" data-live={live ? "1" : undefined} aria-label="Coût de l'énergie" title={basis}>
      <span className="week-stat-label">Énergie</span>
      <span className="week-stat-col">{live ? "depuis lundi" : "semaine"}</span>
      {!live && <span className="week-stat-col">an</span>}

      <span className="week-stat-key"><i data-kind="ev" aria-hidden="true" />Électrique</span>
      <b className="tabular">{eur(elec)}</b>
      {!live && <b className="tabular">{eur(year(elec))}</b>}

      <span className="week-stat-key"><i data-kind="ice" aria-hidden="true" />Essence</span>
      <b className="tabular">{eur(petrol)}</b>
      {!live && <b className="tabular">{eur(year(petrol))}</b>}

      {saved > 0.005 && (
        <>
          <span className="week-stat-key week-stat-strong">Économie</span>
          <b className="tabular week-cost-saved">{eur(saved)}</b>
          {!live && <b className="tabular week-cost-saved">{eur(year(saved))}</b>}
        </>
      )}
    </section>
  );
}
