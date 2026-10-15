/**
 * Grands trajets de l'année (vacances, famille, ski) : par la route depuis le domicile, avec
 * les kilomètres par type de route (graphe local), la batterie du modèle dans la saison du
 * trajet, et les arrêts de recharge rapide qu'il faut. Fonctions pures.
 *
 * Hypothèses, dites dans « Méthode » : on part batterie pleine (rechargée la veille, et sur
 * place avant le retour), on arrive avec 10 % au moins, chaque arrêt sur borne rapide (150 kW)
 * ne recharge que ce qu'il faut, au plus jusqu'à 80 %.
 */
import { RESERVE, rangeProfile, type RangeSource, type Season } from "./energy";
import { chargeMinutes, type VehicleCharging } from "./week";

/** Borne rapide type des grands axes (kW) */
export const ROAD_CHARGER_KW = 150;
/** Plafond d'un arrêt : au-delà de 80 %, la recharge ralentit trop */
const STOP_TARGET = 0.8;

export interface HolidayTrip {
  id: string;
  label: string;
  lat: number;
  lon: number;
  /** Allers-retours par an */
  times: number;
  season: Season;
}

/** Trajet aller par la route : kilomètres et répartition autoroute / voie express / route */
export interface HolidayLeg {
  km: number;
  split: [number, number, number];
  coords: [number, number][] | null;
}

export interface HolidayResult {
  /** Kilomètres d'un aller-retour */
  kmReturn: number;
  /** Arrêts et minutes de recharge, par aller (le retour est identique) */
  stops: number;
  minutes: number;
  /** Énergie d'un aller-retour : totale (kWh batterie) et part rechargée sur borne rapide */
  kwh: number;
  kwhRoad: number;
}

/** Un aller-retour avec un modèle */
export function holidayFor(leg: HolidayLeg, range: RangeSource, charging: VehicleCharging, season: Season): HolidayResult {
  const p = rangeProfile(range, season);
  const used = leg.split[0] / p.hw + leg.split[1] / p.express + leg.split[2] / p.road;
  // Ce que la batterie pleine ne couvre pas, réserve gardée à l'arrivée
  let missing = Math.max(0, used - (1 - RESERVE));
  let stops = 0;
  let minutes = 0;
  const perStop = STOP_TARGET - RESERVE;
  while (missing > 1e-6 && stops < 20) {
    const amount = Math.min(perStop, missing);
    minutes += chargeMinutes(RESERVE, RESERVE + amount, ROAD_CHARGER_KW, charging);
    missing -= amount;
    stops++;
  }
  const road = Math.max(0, used - (1 - RESERVE));
  return {
    kmReturn: 2 * leg.km,
    stops,
    minutes,
    kwh: 2 * used * charging.usableKWh,
    kwhRoad: 2 * road * charging.usableKWh,
  };
}
