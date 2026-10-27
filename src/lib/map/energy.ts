/**
 * Autonomie d'un véhicule selon le type de route et la saison, à partir de son
 * autonomie réelle (fiche) : autoroute à 130, voie express ≈ mixte (90 / 120 km/h),
 * route ≈ entre mixte et urbain (80-90 km/h). L'hiver (-5 °C) applique le rapport
 * hiver / mixte de la fiche (modèle de src/lib/winter.js) à tous les types de route.
 */
import type { RangeProfile } from "./roadGraph";

export interface RangeSource {
  mixed_km: number;
  highway_130_km: number;
  urban_km: number;
  winter_minus5_km: number;
}

export type Season = "summer" | "winter";
/** Saison, ou température extérieure en °C (grands trajets) */
export type Climate = Season | number;

/** Batterie gardée en réserve à l'arrivée (ne jamais finir à 0 %) */
export const RESERVE = 0.1;

/**
 * Part de l'autonomie mixte qui reste à une saison ou une température. Entre 20 °C et -5 °C, la
 * perte suit la même droite que le modèle de froid (lib/winter.js) jusqu'au rapport hiver / mixte
 * de la fiche ; au-delà de 25 °C, la climatisation retire jusqu'à 8 % par 15 °C.
 */
export function climateRatio(r: RangeSource, c: Climate): number {
  if (c === "summer") return 1;
  const winter = r.winter_minus5_km / r.mixed_km;
  if (c === "winter") return winter;
  if (c >= 20 && c <= 25) return 1;
  if (c > 25) return Math.max(0.8, 1 - 0.08 * ((c - 25) / 15));
  return Math.max(0.4, 1 - (1 - winter) * ((20 - c) / 25));
}

export function rangeProfile(r: RangeSource, season: Climate): RangeProfile {
  const k = climateRatio(r, season);
  return {
    hw: (r.highway_130_km || r.mixed_km * 0.75) * k,
    express: r.mixed_km * k,
    road: ((r.mixed_km + r.urban_km) / 2) * k,
  };
}

/** Part de batterie utilisable pour un aller simple, ou pour l'aller d'un aller-retour */
export const budgetFor = (trip: "oneway" | "return") => (trip === "oneway" ? 1 - RESERVE : (1 - RESERVE) / 2);
