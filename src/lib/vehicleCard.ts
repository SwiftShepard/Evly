import type { Vehicle } from "@/data/schemas";
import { formatNumber } from "@/lib/format";
import { isVehicleEligibleCEE, primeFor, primeGridOf } from "@/lib/cee";
import { confidenceOf, type ConfidenceLevel } from "@/lib/confidence";

export interface VehicleCardSummary {
  /** Sous-titre homogène : « 40 · 52 kWh · 5 finitions » */
  subtitle: string;
  /** Prix de la finition la moins chère, null si aucun tarif communiqué */
  cheapestPrice: number | null;
  /** Prime CEE de tout ménage si la version d'entrée y est éligible, sinon 0 */
  totalAids: number;
  /** Grille de la prime de la version la moins chère (null : pas de prime), pour « votre prix » */
  primeGrid: "standard" | "europe" | null;
  /** Prix après cette prime, null si pas de tarif */
  priceAided: number | null;
  rangeConfidence: ConfidenceLevel;
  /** « mesurée » | « constructeur » | « estimée » */
  rangeConfidenceLabel: string;
  /** Libellé pour l'autonomie autoroute (130 km/h), dérivée de l'essai à 120 km/h si Nyland */
  highwayConfidenceLabel: string;
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
  // Prime CEE de tout ménage (barème de src/lib/cee.ts) ; aucune si la version la moins chère
  // dépasse un plafond (prix, masse) : prix après aides = prix
  const totalAids = isVehicleEligibleCEE(v, cheapestPrice) ? primeFor(v, "autres") : 0;
  const priceAided = cheapestPrice !== null ? Math.max(0, cheapestPrice - totalAids) : null;

  const confidence = confidenceOf(v.realRange.confidence);

  return {
    subtitle,
    cheapestPrice,
    totalAids,
    primeGrid: primeGridOf(v, cheapestPrice),
    priceAided,
    rangeConfidence: confidence.level,
    rangeConfidenceLabel: confidence.label,
    highwayConfidenceLabel: v.realRange.confidence === "bjorn_nyland" ? "d'après essai 120 km/h" : confidence.label,
  };
}
