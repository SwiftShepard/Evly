/**
 * Coût de l'énergie de la semaine, électrique contre essence. Pendant la lecture, les
 * deux compteurs montent au fil des trajets ; sinon ils donnent le total de la semaine.
 */
import { Fuel, Zap } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { FuelPrice } from "@/lib/map/fuel";
import { ICE_L_100 } from "@/lib/map/fuel";

interface Props {
  /** Kilomètres et énergie (kWh prélevés au réseau) depuis lundi */
  km: number;
  kwh: number;
  /** Prix moyen du kWh de la semaine (maison, travail, borne) */
  eurPerKwh: number;
  fuel: FuelPrice | null;
  live: boolean;
}

/** Montant à deux décimales fixes (« 7,30 € »), sans décimales au-delà de 100 € */
const money = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = (n: number) => (n < 100 ? `${money.format(n)} €` : `${formatNumber(n)} €`);

export default function WeekCost({ km, kwh, eurPerKwh, fuel, live }: Props) {
  if (!fuel) return null;
  const elec = kwh * eurPerKwh;
  const petrol = ((km * ICE_L_100) / 100) * fuel.eur;
  const top = Math.max(elec, petrol, 0.01);
  const saved = petrol - elec;
  const updated = fuel.updated ? new Date(fuel.updated).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;

  return (
    <section className="week-cost" aria-label="Coût de l'énergie">
      <div className="week-cost-head">
        <span className="label-eyebrow">Énergie {live ? "depuis lundi" : "de la semaine"}</span>
        {saved > 0.005 && <b className="week-cost-saved tabular">{eur(saved)} de moins qu'en essence</b>}
      </div>
      <dl className="week-cost-bars">
        <div>
          <dt>
            <Zap size={13} strokeWidth={2.4} aria-hidden="true" /> Électrique
          </dt>
          <dd className="tabular">{eur(elec)}</dd>
          <span className="week-cost-bar" data-kind="ev" style={{ "--share": elec / top } as React.CSSProperties} aria-hidden="true" />
        </div>
        <div>
          <dt>
            <Fuel size={13} strokeWidth={2.4} aria-hidden="true" /> Essence
          </dt>
          <dd className="tabular">{eur(petrol)}</dd>
          <span className="week-cost-bar" data-kind="ice" style={{ "--share": petrol / top } as React.CSSProperties} aria-hidden="true" />
        </div>
      </dl>
      <p className="week-cost-note">
        {money.format(eurPerKwh)}&nbsp;€/kWh · essence {money.format(fuel.eur)}&nbsp;€/l
        {fuel.stations ? `, moyenne nationale${updated ? ` du ${updated}` : ""}` : ""} · {formatNumber(ICE_L_100, 1)}&nbsp;l/100&nbsp;km
      </p>
    </section>
  );
}
