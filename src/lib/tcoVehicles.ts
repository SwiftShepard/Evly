import type { TcoVehicleSummary } from "@/components/tco/TcoCalculator";
import { getAllVehicles } from "@/lib/vehicles";
import { MORAL_PERSON_PRIME_EUR, isVehicleEligibleCEE, primeFor, primeGridOf } from "@/lib/cee";
import { batteryOf } from "@/lib/map/versions";

/**
 * Modèles du calculateur de coût réel (/simulateur/ et /pro/) : un seul calcul pour le site.
 * Consommation réelle = batterie de la version / autonomie réelle de la fiche, comme Ma semaine et
 * le panneau trajet des fiches (jamais la consommation WLTP). Prime CEE de tout ménage pour un
 * particulier, d'une personne morale pour une société.
 */
let cache: TcoVehicleSummary[] | null = null;

export function getTcoVehicles(): TcoVehicleSummary[] {
  cache ??= getAllVehicles()
    .filter((v) => v.trims.some((t) => t.price_EUR !== null))
    .map((v) => {
      const cheapest = v.trims.filter((t) => t.price_EUR !== null).reduce((a, b) => (a.price_EUR! < b.price_EUR! ? a : b));
      const eligible = isVehicleEligibleCEE(v, cheapest.price_EUR);
      const real = (km: number, kwh: number) => Math.round((kwh / km) * 1000) / 10;
      const configs = v.configurations
        .filter((c) => c.price_EUR !== null && c.availability !== "discontinued")
        .map((c) => {
          const rr = c.realRange ?? v.realRange;
          return {
            id: c.id,
            label: c.label,
            trim: c.trim,
            battery: c.battery,
            price_EUR: c.price_EUR!,
            consumption_kWh_100km: real(rr.mixed_km, batteryOf(v, c)),
            realRange_mixed_km: rr.mixed_km,
          };
        });
      return {
        slug: v.slug,
        brand: v.brand,
        model: v.model,
        variant: v.variant,
        segment: v.segment,
        price_EUR: cheapest.price_EUR!,
        aids_EUR: eligible ? primeFor(v, "autres") : 0,
        aidsPro_EUR: eligible ? MORAL_PERSON_PRIME_EUR : 0,
        primeGrid: primeGridOf(v, cheapest.price_EUR),
        consumption_kWh_100km: configs[0]?.consumption_kWh_100km ?? real(v.realRange.mixed_km, v.usableCapacity_kWh),
        realRange_mixed_km: v.realRange.mixed_km,
        configs,
      };
    })
    .sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
  return cache;
}
