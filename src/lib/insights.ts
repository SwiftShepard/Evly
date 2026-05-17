/**
 * Génère des insights comparatifs déterministes à partir des cartes configurées.
 * Pure logique conditionnelle — pas d'IA, pas d'appel API.
 */

import type { Vehicle, VehicleConfiguration } from "@/data/schemas";

export interface ConfiguredCard {
  vehicle: Vehicle;
  config: VehicleConfiguration;
}

export function generateInsights(cards: ConfiguredCard[]): string[] {
  if (cards.length < 2) return [];

  const insights: string[] = [];

  // Helper : nom court du véhicule
  const name = (c: ConfiguredCard) =>
    `${c.vehicle.brand} ${c.vehicle.model} (${c.config.trim})`;

  // --- Autonomie réelle mixte ---
  const withRange = cards.filter((c) => c.config.realRange?.mixed_km);
  if (withRange.length >= 2) {
    const sorted = [...withRange].sort(
      (a, b) => (b.config.realRange!.mixed_km) - (a.config.realRange!.mixed_km)
    );
    const best = sorted[0]!;
    const worst = sorted[sorted.length - 1]!;
    const diff = best.config.realRange!.mixed_km - worst.config.realRange!.mixed_km;
    if (diff > 20) {
      insights.push(
        `En usage mixte, la ${name(best)} offre ${diff} km de plus que la ${name(worst)}.`
      );
    }
  }

  // --- Autonomie autoroute ---
  const withHighway = cards.filter((c) => c.config.realRange?.highway_130_km);
  if (withHighway.length >= 2) {
    const sorted = [...withHighway].sort(
      (a, b) => (b.config.realRange!.highway_130_km) - (a.config.realRange!.highway_130_km)
    );
    const best = sorted[0]!;
    const worst = sorted[sorted.length - 1]!;
    const diff = best.config.realRange!.highway_130_km - worst.config.realRange!.highway_130_km;
    if (diff > 30) {
      insights.push(
        `Sur autoroute à 130 km/h, la ${name(best)} tient ${diff} km de plus que la ${name(worst)}.`
      );
    }
  }

  // --- kWh ajoutés en 30 min ---
  const withCharging = cards.filter((c) => c.config.chargingDC_kWh_30min);
  if (withCharging.length >= 2) {
    const sorted = [...withCharging].sort(
      (a, b) => (b.config.chargingDC_kWh_30min!) - (a.config.chargingDC_kWh_30min!)
    );
    const best = sorted[0]!;
    const worst = sorted[sorted.length - 1]!;
    const diff = best.config.chargingDC_kWh_30min! - worst.config.chargingDC_kWh_30min!;
    if (diff > 5) {
      insights.push(
        `La ${name(best)} charge ${diff} kWh de plus en 30 min que la ${name(worst)}.`
      );
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
      insights.push(
        `Après aides, la ${name(cheapest)} est ${new Intl.NumberFormat("fr-FR").format(diff)} € moins chère que la ${name(priciest)}.`
      );
    }
  }

  // --- Leasing social ---
  const leasingCards = cards.filter((c) => c.config.leasingSocialEligible);
  if (leasingCards.length > 0 && leasingCards.length < cards.length) {
    const names = leasingCards.map(name).join(" et ");
    const monthlyInfo = leasingCards
      .filter((c) => c.config.monthlyLease_EUR)
      .map((c) => `${c.config.monthlyLease_EUR} €/mois`)
      .join(", ");
    insights.push(
      `Seul${leasingCards.length > 1 ? "es les" : "e la"} ${names} ${leasingCards.length > 1 ? "sont éligibles" : "est éligible"} au leasing social${monthlyInfo ? ` (${monthlyInfo})` : ""}.`
    );
  }

  // --- Architecture 800 V vs 400 V ---
  const architectures = new Set(cards.map((c) => c.vehicle.architecture_V));
  if (architectures.size > 1) {
    const v800 = cards.filter((c) => c.vehicle.architecture_V === 800);
    if (v800.length > 0) {
      const v800Names = v800.map(name).join(", ");
      insights.push(
        `${v800Names} bénéfici${v800.length > 1 ? "ent" : "e"} d'une architecture 800 V, permettant des pics de charge supérieurs.`
      );
    }
  }

  return insights.slice(0, 4); // Max 4 insights
}
