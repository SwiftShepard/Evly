/**
 * Classement de l'autonomie en hiver (roadmap M6) : une version par modèle, la plus endurante
 * par -5 °C, avec ce qu'il faut pour recalculer à toute température dans le navigateur (mixte,
 * chimie, pompe à chaleur, mesure ou estimation). Le chiffre à -5 °C est celui des fiches.
 */
import type { Vehicle } from "@/data/schemas";
import { getAllVehicles, isStrictUtility } from "@/lib/vehicles";
import { getMarketStatus, getVehicleName } from "@/lib/seo";
import { heatPumpOf, isMeasured } from "@/lib/winter";

const NOT_CARS = new Set(["Fourgon", "Fourgonnette", "Combi utilitaire"]);

export interface WinterRow {
  vehicle: Vehicle;
  name: string;
  configId: string;
  version: string;
  price: number | null;
  mixed: number;
  winter: number;
  chemistry: string;
  heatPump: boolean | null;
  measured: boolean;
  /** Ce qu'on perd par -5 °C par rapport au mixte (%) */
  lossPct: number;
}

let cache: WinterRow[] | null = null;

/** Voitures vendues, de la plus endurante à la moins endurante par -5 °C */
export function getWinterRanking(): WinterRow[] {
  cache ??= getAllVehicles()
    .filter((v) => !isStrictUtility(v) && !NOT_CARS.has(v.bodyType) && getMarketStatus(v) !== "discontinued")
    .map((v) => {
      const configs = v.configurations.filter((c) => c.availability !== "discontinued");
      const pool = configs.length ? configs : v.configurations;
      const rr = (c: (typeof pool)[number]) => c.realRange ?? v.realRange;
      const best = pool.reduce((a, b) => (rr(b).winter_minus5_km > rr(a).winter_minus5_km ? b : a));
      const r = rr(best);
      return {
        vehicle: v,
        name: getVehicleName(v),
        configId: best.id,
        version: best.label.replace(v.model, "").replace(/^[\s·]+/, "").trim() || best.label,
        price: best.price_EUR ?? null,
        mixed: r.mixed_km,
        winter: r.winter_minus5_km,
        chemistry: best.chemistry ?? v.chemistry,
        heatPump: heatPumpOf(v.heatPump),
        measured: isMeasured(r.confidence),
        lossPct: (1 - r.winter_minus5_km / r.mixed_km) * 100,
      };
    })
    .sort((a, b) => b.winter - a.winter);
  return cache;
}

/** Rang d'un modèle dans le classement d'hiver (1 = le plus endurant), ou null */
export function winterRankOf(slug: string): { rank: number; of: number } | null {
  const list = getWinterRanking();
  const i = list.findIndex((r) => r.vehicle.slug === slug);
  return i < 0 ? null : { rank: i + 1, of: list.length };
}
