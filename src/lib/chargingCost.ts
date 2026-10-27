/**
 * Ce que coûte une recharge (roadmap E11) : à la maison selon l'option du compteur, et sur borne
 * rapide, pour une batterie et une autonomie réelle données. Les 10 % de pertes de recharge du
 * reste du site sont comptés (on paie plus que ce qui entre dans la batterie).
 */
import { FAST_EUR_KWH, TARIF_BLEU } from "@/data/electricity";
import { CHARGING_LOSSES } from "@/lib/costDefaults";

export interface ChargeCostRow {
  label: string;
  /** De combien à combien on recharge */
  window: string;
  /** €/kWh, ou fourchette */
  price: number | [number, number];
  /** Coût de la recharge et aux 100 km (fourchette pour la borne rapide) */
  charge: number | [number, number];
  per100: number | [number, number];
}

const HOME_SHARE = 0.9; // de 10 à 100 %
const FAST_SHARE = 0.7; // de 10 à 80 %

/** Consommation réelle (kWh/100 km, batterie) tirée de l'autonomie mixte */
export const realConsumption = (batteryKWh: number, mixedKm: number) => (batteryKWh / mixedKm) * 100;

export function chargeCosts(batteryKWh: number, mixedKm: number): ChargeCostRow[] {
  const conso = realConsumption(batteryKWh, mixedKm);
  const home = (label: string, price: number): ChargeCostRow => ({
    label,
    window: "de 10 à 100 %",
    price,
    charge: batteryKWh * HOME_SHARE * CHARGING_LOSSES * price,
    per100: conso * CHARGING_LOSSES * price,
  });
  const range = (f: (p: number) => number): [number, number] => [f(FAST_EUR_KWH[0]), f(FAST_EUR_KWH[1])];
  return [
    home("À la maison, heures creuses", TARIF_BLEU.hc),
    home("À la maison, tarif de base", TARIF_BLEU.base),
    home("Tempo, jour bleu, heures creuses", TARIF_BLEU.tempo.blueHc),
    {
      label: "Borne rapide",
      window: "de 10 à 80 %",
      price: FAST_EUR_KWH,
      charge: range((p) => batteryKWh * FAST_SHARE * CHARGING_LOSSES * p),
      per100: range((p) => conso * CHARGING_LOSSES * p),
    },
  ];
}

const money = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
/** « 7,80 € », « 11,39 € » ; une fourchette en euros ronds (« 18 à 31 € ») */
export function eur(v: number | [number, number]): string {
  const fix = (s: string) => s.replace(/ /g, " ");
  if (Array.isArray(v)) return `${fix(whole.format(Math.round(v[0])))} à ${fix(whole.format(Math.round(v[1])))} €`;
  return `${fix(v < 100 ? money.format(v) : whole.format(Math.round(v)))} €`;
}

/** « 0,1589 €/kWh », « 0,40 à 0,70 €/kWh » */
export function eurKwh(v: number | [number, number]): string {
  const f = (x: number) => x.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return Array.isArray(v) ? `${f(v[0])} à ${f(v[1])} €/kWh` : `${f(v)} €/kWh`;
}

/** « 1er août 2026 » : date d'effet des tarifs */
export function tariffDate(): string {
  const d = new Date(`${TARIF_BLEU.since}T12:00:00`);
  const day = d.getDate();
  return `${day === 1 ? "1er" : day} ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
}
