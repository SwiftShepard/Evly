/**
 * Hypothèses de coût communes au calculateur de coût réel, à Ma semaine, aux fiches et à l'accueil.
 * Ne dépend que de données datées (data/electricity, data/fuelPrices, data/runningCosts) : le
 * calculateur (components/tco) et lib/map/fuel en dépendent tous deux sans boucle d'import.
 */
import { TARIF_BLEU } from "@/data/electricity";
import { FUEL_PRICES } from "@/data/fuelPrices";
import { INSURANCE, MAINTENANCE, RESALE_3Y } from "@/data/runningCosts";

export const COST_DEFAULTS = {
  km_per_year: 15000,
  years: 5,
  /** Tarif réglementé de base d'EDF, arrondi au centime */
  elec_home_eur_kwh: Math.round(TARIF_BLEU.base * 100) / 100,
  elec_fast_eur_kwh: 0.45,
  fast_charge_pct: 20,
  /** Moyennes nationales du flux officiel des prix des carburants */
  diesel_eur_l: FUEL_PRICES.gazole,
  essence_eur_l: FUEL_PRICES.e10,
  /** Thermique type, quand le modèle n'a pas de jumeau thermique relevé (data/iceTwins) */
  ice_conso_l_100: 6.5,
  ice_price: 30000,
  /** Moyennes du parc (data/runningCosts) */
  ice_maintenance_eur_yr: MAINTENANCE.iceMonthly * 12,
  ev_maintenance_eur_yr: MAINTENANCE.evMonthly * 12,
  insurance_ev_eur_yr: INSURANCE.ev,
  insurance_ice_eur_yr: INSURANCE.essence,
  tvs_ice_eur_yr: 0,
};

/** Pertes de recharge : l'énergie prise au réseau dépasse celle qui entre dans la batterie */
export const CHARGING_LOSSES = 1.1;

/**
 * Valeur de revente par défaut après `years` ans, en % du prix catalogue : le point mesuré à 3 ans
 * (data/runningCosts), prolongé au même rythme annuel avant et après (décote géométrique).
 */
export function residualPct(kind: "ev" | "ice", years: number): number {
  const r3 = RESALE_3Y[kind] / 100;
  return Math.round(100 * r3 ** (years / 3));
}
