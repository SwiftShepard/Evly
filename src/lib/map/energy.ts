/**
 * Autonomie d'un véhicule selon le type de route et la saison, à partir de son
 * autonomie réelle (fiche) : autoroute à 130, voie express ≈ mixte (90 / 120 km/h),
 * route ≈ entre mixte et urbain (80-90 km/h). L'hiver (-5 °C) applique le rapport
 * hiver / mixte de la fiche à tous les types de route.
 */
import type { RangeProfile } from "./roadGraph";

export interface RangeSource {
  mixed_km: number;
  highway_130_km: number;
  urban_km: number;
  winter_minus5_km: number;
}

export type Season = "summer" | "winter";

/** Batterie gardée en réserve à l'arrivée (ne jamais finir à 0 %) */
export const RESERVE = 0.1;

export function rangeProfile(r: RangeSource, season: Season): RangeProfile {
  const k = season === "winter" ? r.winter_minus5_km / r.mixed_km : 1;
  return {
    hw: (r.highway_130_km || r.mixed_km * 0.75) * k,
    express: r.mixed_km * k,
    road: ((r.mixed_km + r.urban_km) / 2) * k,
  };
}

/** Part de batterie utilisable pour un aller simple, ou pour l'aller d'un aller-retour */
export const budgetFor = (trip: "oneway" | "return") => (trip === "oneway" ? 1 - RESERVE : (1 - RESERVE) / 2);
