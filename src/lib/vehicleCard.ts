import type { Vehicle } from "@/data/schemas";
import { formatNumber } from "@/lib/format";

/** Plafond de cumul des aides affiché partout sur le site (CEE + majoration batterie UE). */
export const MAX_TOTAL_AIDS_EUR = 8100;

export type RangeConfidenceLevel = "measured" | "manufacturer" | "estimated";

export interface VehicleCardSummary {
  /** Sous-titre homogène : « 40 · 52 kWh · 5 finitions » */
  subtitle: string;
  /** Prix de la finition la moins chère, null si aucun tarif communiqué */
  cheapestPrice: number | null;
  /** Aides cumulables plafonnées */
  totalAids: number;
  /** Prix après aides max., null si pas de tarif */
  priceAided: number | null;
  rangeConfidence: RangeConfidenceLevel;
  /** « mesurée » | « constructeur » | « estimée » */
  rangeConfidenceLabel: string;
  /** Libellé pour l'autonomie autoroute (130 km/h), dérivée de l'essai à 120 km/h si Nyland */
  highwayConfidenceLabel: string;
}

/**
 * Niveau et libellé court d'une autonomie selon sa provenance.
 * « bjorn_nyland » : autonomie mixte = moyenne des essais Nyland à 90 et 120 km/h.
 */
export function getRangeConfidenceInfo(confidence: string | null | undefined): {
  level: RangeConfidenceLevel;
  label: string;
} {
  if (confidence === "bjorn_nyland") return { level: "measured", label: "mesurée" };
  if (confidence === "tested") return { level: "measured", label: "mesurée" };
  if (confidence === "manufacturer") return { level: "manufacturer", label: "constructeur" };
  return { level: "estimated", label: "estimée" };
}

function parseKwh(label: string): number | null {
  const m = label.match(/(\d+(?:[.,]\d+)?)/);
  return m?.[1] ? parseFloat(m[1].replace(",", ".")) : null;
}

/** Données d'affichage communes aux cartes véhicule (catalogue, accueil). */
export function getVehicleCardSummary(v: Vehicle): VehicleCardSummary {
  const batteries = [
    ...new Set(
      v.trims.map((t) => parseKwh(t.batteryUsed)).filter((k): k is number => k !== null)
    ),
  ].sort((a, b) => a - b);
  const kwhList = batteries.length > 0 ? batteries : [v.usableCapacity_kWh];
  const batteryLabel = `${kwhList.map((k) => formatNumber(k, Number.isInteger(k) ? 0 : 1)).join(" · ")} kWh`;
  const trimCount = new Set(v.trims.map((t) => t.name)).size;
  const subtitle = trimCount > 1 ? `${batteryLabel} · ${trimCount} finitions` : batteryLabel;

  const prices = v.trims.map((t) => t.price_EUR).filter((p): p is number => p !== null);
  const cheapestPrice = prices.length > 0 ? Math.min(...prices) : null;
  const totalAids = Math.min(
    MAX_TOTAL_AIDS_EUR,
    v.availableAids.reduce((sum, a) => sum + a.amount_EUR, 0)
  );
  const priceAided = cheapestPrice !== null ? Math.max(0, cheapestPrice - totalAids) : null;

  const confidence = getRangeConfidenceInfo(v.realRange.confidence);

  return {
    subtitle,
    cheapestPrice,
    totalAids,
    priceAided,
    rangeConfidence: confidence.level,
    rangeConfidenceLabel: confidence.label,
    highwayConfidenceLabel: v.realRange.confidence === "bjorn_nyland" ? "d'après essai 120 km/h" : confidence.label,
  };
}
