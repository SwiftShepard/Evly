import type { Vehicle } from "@/data/schemas";
import { getAllVehicles, isStrictUtility } from "@/lib/vehicles";
import { brandSlug, getBodyInfo, getMarketStatus, getVehicleSeoFacts } from "@/lib/seo";

/** Une marque et ses modèles, voitures d'abord (par prix), utilitaires ensuite. */
export interface Brand {
  name: string;
  slug: string;
  vehicles: Vehicle[];
  cars: Vehicle[];
  utilities: Vehicle[];
  priceMin: number | null;
  priceMax: number | null;
}

const priceOf = (v: Vehicle) => getVehicleSeoFacts(v).priceMin ?? Infinity;

const isUtility = (v: Vehicle) => isStrictUtility(v) || getBodyInfo(v).category === "utilitaire";

// Les modèles retirés du marché passent en fin de liste
const byStatusThenPrice = (a: Vehicle, b: Vehicle) =>
  Number(getMarketStatus(a) === "discontinued") - Number(getMarketStatus(b) === "discontinued") || priceOf(a) - priceOf(b);

let brands: Brand[] | null = null;

export function getBrands(): Brand[] {
  if (brands) return brands;
  const groups = new Map<string, Vehicle[]>();
  for (const v of getAllVehicles()) {
    if (!groups.has(v.brand)) groups.set(v.brand, []);
    groups.get(v.brand)!.push(v);
  }
  brands = [...groups.entries()]
    .map(([name, vehicles]) => {
      const prices = vehicles
        .filter((v) => getMarketStatus(v) !== "discontinued")
        .flatMap((v) => {
          const f = getVehicleSeoFacts(v);
          return [f.priceMin, f.priceMax].filter((p): p is number => p != null);
        });
      return {
        name,
        slug: brandSlug(name),
        vehicles: [...vehicles].sort(byStatusThenPrice),
        cars: vehicles.filter((v) => !isUtility(v)).sort(byStatusThenPrice),
        utilities: vehicles.filter(isUtility).sort(byStatusThenPrice),
        priceMin: prices.length ? Math.min(...prices) : null,
        priceMax: prices.length ? Math.max(...prices) : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  return brands;
}

export function getBrandByName(name: string): Brand | undefined {
  return getBrands().find((b) => b.name === name);
}
