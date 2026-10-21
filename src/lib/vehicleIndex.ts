import { getAllVehicles, isStrictUtility } from "@/lib/vehicles";
import { getVehicleCardSummary } from "@/lib/vehicleCard";
import { getVehicleImage } from "@/lib/vehicleImageAsset";
import type { IndexConfig, IndexRow } from "@/lib/tripFit";
import { confidenceLevel, LEVEL_CODE } from "@/lib/confidence";

/**
 * Index compact des modèles (build uniquement) : servi par /recherche.json et
 * utilisé au rendu de l'accueil, pour que serveur et navigateur calculent pareil.
 */
let cache: Promise<IndexRow[]> | null = null;

export function getVehicleIndex(): Promise<IndexRow[]> {
  cache ??= Promise.all(
    getAllVehicles().map(async (v): Promise<IndexRow> => {
      const card = getVehicleCardSummary(v);
      const img = await getVehicleImage(v.slug, [240, 480]);
      const large = img?.srcset ? img.srcset.split(", ").at(-1)?.split(" ")[0] ?? null : null;
      const versions: IndexConfig[] = v.configurations
        .filter((c) => c.availability !== "discontinued")
        .map((c) => {
          const rr = c.realRange ?? v.realRange;
          // Libellé sans le nom du modèle (« Evolution · 52 kWh » plutôt que « 5 E-Tech Evolution · 52 kWh »)
          const label = c.label.replace(v.model, "").replace(/^[\s·]+/, "").trim() || c.label;
          return [c.price_EUR, rr.winter_minus5_km, rr.mixed_km, Math.max(c.wltp_km ?? v.wltp_max_km, rr.mixed_km), label, LEVEL_CODE[confidenceLevel(rr.confidence)]];
        });
      return {
        s: v.slug,
        b: v.brand,
        m: v.model,
        u: isStrictUtility(v) ? 1 : 0,
        p: card.cheapestPrice,
        r: v.realRange.mixed_km,
        w: Math.max(v.wltp_max_km, v.realRange.mixed_km),
        h: v.realRange.winter_minus5_km,
        c: LEVEL_CODE[card.rangeConfidence],
        i: img?.src ?? null,
        i2: large,
        v: versions,
      };
    })
  );
  return cache;
}
