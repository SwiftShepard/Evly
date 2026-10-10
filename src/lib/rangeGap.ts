import type { Vehicle, VehicleConfiguration } from "@/data/schemas";

/**
 * Écart entre l'autonomie annoncée (WLTP) et l'autonomie mesurée sur route,
 * calculé uniquement sur les configurations réellement testées (Nyland ou essai presse) :
 * jamais sur une autonomie estimée, pour ne pas mesurer notre propre modèle.
 */

const MEASURED = new Set(["bjorn_nyland", "tested"]);

export interface MeasuredGap {
  vehicle: Vehicle;
  config: VehicleConfiguration;
  wltpKm: number;
  realKm: number;
  /** Écart en %, positif quand le réel est inférieur à l'annonce */
  gapPct: number;
}

/** Première configuration testée d'un véhicule (la plus accessible, l'ordre des fiches suit la gamme). */
export function getMeasuredGap(v: Vehicle): MeasuredGap | null {
  const config = v.configurations.find(
    (c) => c.realRange && c.wltp_km && MEASURED.has(c.realRange.confidence)
  );
  if (!config?.realRange || !config.wltp_km) return null;
  const realKm = config.realRange.mixed_km;
  const wltpKm = config.wltp_km;
  return { vehicle: v, config, wltpKm, realKm, gapPct: (1 - realKm / wltpKm) * 100 };
}

/** Écart médian sur l'ensemble des modèles testés (une configuration par modèle). */
export function getFleetGap(vehicles: Vehicle[]): { medianPct: number; models: number } {
  const gaps = vehicles
    .map(getMeasuredGap)
    .filter((g): g is MeasuredGap => g !== null)
    .map((g) => g.gapPct)
    .sort((a, b) => a - b);
  if (gaps.length === 0) return { medianPct: 0, models: 0 };
  const mid = Math.floor(gaps.length / 2);
  const median = gaps.length % 2 ? gaps[mid]! : (gaps[mid - 1]! + gaps[mid]!) / 2;
  return { medianPct: median, models: gaps.length };
}
