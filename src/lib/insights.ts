/**
 * Génère des insights comparatifs déterministes et structurés à partir des cartes configurées.
 * Pure logique conditionnelle, pas d'IA, pas d'appel API.
 */

import type { Vehicle, VehicleConfiguration } from "@/data/schemas";

export interface ConfiguredCard {
  vehicle: Vehicle;
  config: VehicleConfiguration;
  soh?: number;
}

export interface ComparisonInsight {
  type: "range" | "highway" | "charging" | "price" | "leasing" | "voltage";
  label: string;
  winnerName: string;
  valueText: string;
  comparisonText?: string;
}

export function generateInsights(cards: ConfiguredCard[]): ComparisonInsight[] {
  if (cards.length < 2) return [];

  const insights: ComparisonInsight[] = [];

  const shortName = (c: ConfiguredCard) => `${c.vehicle.brand} ${c.vehicle.model}`;

  const getMixedRange = (c: ConfiguredCard) => {
    const base = c.config.realRange?.mixed_km ?? 0;
    return Math.round(base * (c.soh ?? 100) / 100);
  };

  const getHighwayRange = (c: ConfiguredCard) => {
    const base = c.config.realRange?.highway_130_km ?? 0;
    return Math.round(base * (c.soh ?? 100) / 100);
  };

  // --- Autonomie mixte ---
  const withRange = cards.filter((c) => c.config.realRange?.mixed_km);
  if (withRange.length >= 2) {
    const sorted = [...withRange].sort((a, b) => getMixedRange(b) - getMixedRange(a));
    const best = sorted[0]!;
    const worst = sorted[sorted.length - 1]!;
    const diff = getMixedRange(best) - getMixedRange(worst);
    if (diff > 20) {
      insights.push({
        type: "range",
        label: "Autonomie mixte",
        winnerName: shortName(best),
        valueText: `+${diff} km`,
        comparisonText: `vs ${shortName(worst)}`
      });
    }
  }

  // --- Autonomie autoroute ---
  const withHighway = cards.filter((c) => c.config.realRange?.highway_130_km);
  if (withHighway.length >= 2) {
    const sorted = [...withHighway].sort((a, b) => getHighwayRange(b) - getHighwayRange(a));
    const best = sorted[0]!;
    const worst = sorted[sorted.length - 1]!;
    const diff = getHighwayRange(best) - getHighwayRange(worst);
    if (diff > 30) {
      insights.push({
        type: "highway",
        label: "Autonomie autoroute",
        winnerName: shortName(best),
        valueText: `+${diff} km`,
        comparisonText: `vs ${shortName(worst)}`
      });
    }
  }

  // --- Recharge DC 30 min ---
  const withCharging = cards.filter((c) => c.config.chargingDC_kWh_30min);
  if (withCharging.length >= 2) {
    const sorted = [...withCharging].sort(
      (a, b) => (b.config.chargingDC_kWh_30min!) - (a.config.chargingDC_kWh_30min!)
    );
    const best = sorted[0]!;
    const worst = sorted[sorted.length - 1]!;
    const diff = best.config.chargingDC_kWh_30min! - worst.config.chargingDC_kWh_30min!;
    if (diff > 5) {
      insights.push({
        type: "charging",
        label: "Recharge (+30 min)",
        winnerName: shortName(best),
        valueText: `+${diff} kWh`,
        comparisonText: `vs ${shortName(worst)}`
      });
    }
  }

  // --- Prix après aides ---
  const totalAids = (c: ConfiguredCard) =>
    c.vehicle.availableAids.reduce((sum, a) => sum + a.amount_EUR, 0);
  const netPrice = (c: ConfiguredCard) =>
    Math.max(0, c.config.price_EUR - totalAids(c));

  if (cards.length >= 2) {
    const sorted = [...cards].sort((a, b) => netPrice(a) - netPrice(b));
    const cheapest = sorted[0]!;
    const priciest = sorted[sorted.length - 1]!;
    const diff = netPrice(priciest) - netPrice(cheapest);
    if (diff > 1000) {
      insights.push({
        type: "price",
        label: "Budget après aides",
        winnerName: shortName(cheapest),
        valueText: `-${new Intl.NumberFormat("fr-FR").format(diff)} €`,
        comparisonText: `vs ${shortName(priciest)}`
      });
    }
  }

  // --- Leasing social ---
  const leasingCards = cards.filter((c) => c.config.leasingSocialEligible);
  if (leasingCards.length > 0 && leasingCards.length < cards.length) {
    const names = leasingCards.map(shortName).join(" & ");
    insights.push({
      type: "leasing",
      label: "Leasing Social",
      winnerName: names,
      valueText: "Éligible",
      comparisonText: `sur ${leasingCards.length} modèle(s)`
    });
  }

  // --- Architecture 800 V ---
  const architectures = new Set(cards.map((c) => c.vehicle.architecture_V));
  if (architectures.size > 1) {
    const v800 = cards.filter((c) => c.vehicle.architecture_V === 800);
    if (v800.length > 0) {
      const v800Names = v800.map(shortName).join(" & ");
      insights.push({
        type: "voltage",
        label: "Recharge ultra-rapide",
        winnerName: v800Names,
        valueText: "800 V",
        comparisonText: "Pics de charge supérieurs"
      });
    }
  }

  return insights.slice(0, 4);
}
