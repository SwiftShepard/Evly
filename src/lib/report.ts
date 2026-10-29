/**
 * Données du rapport imprimable (/simulateur/rapport-premium/, roadmap F8) : pour chaque modèle du
 * calculateur, ses versions (prix, consommation et autonomies réelles avec leur confiance, recharge)
 * et ses résultats sur quelques grands trajets (lib/roadTrips, les mêmes que les pages /trajets/).
 * Rien d'autre que ce que publient les fiches : le rapport n'invente aucun chiffre.
 * Module serveur : appelé au build par la page du rapport.
 */
import { getTcoVehicles } from "@/lib/tcoVehicles";
import { getVehicleBySlug } from "@/lib/vehicles";
import { batteryOf } from "@/lib/map/versions";
import { confidenceLevel, type ConfidenceLevel } from "@/lib/confidence";
import { getVehicleName } from "@/lib/seo";
import { getTripResults, tripCost, tripTitle } from "@/lib/roadTrips";

/** Les grands trajets repris dans le rapport */
const REPORT_TRIPS = ["paris-lyon", "paris-bordeaux", "paris-marseille", "paris-val-thorens"];

export interface ReportVersion {
  id: string;
  label: string;
  price: number;
  battery: number;
  /** Autonomies réelles (km) et leur confiance */
  mixed: number;
  highway: number;
  winter: number;
  rangeLevel: ConfidenceLevel;
  dcMin: number | null;
}

export interface ReportTrip {
  slug: string;
  title: string;
  km: number;
  /** Version la plus rapide du modèle sur ce trajet, l'été */
  version: string;
  stops: number;
  totalMin: number;
  cost: [number, number];
  winterStops: number | null;
}

export interface ReportVehicle {
  slug: string;
  name: string;
  /** Prime CEE de tout ménage et d'une personne morale (versions sous le plafond de prix) */
  aid: number;
  aidPro: number;
  versions: ReportVersion[];
  trips: ReportTrip[];
}

export async function getReportVehicles(): Promise<ReportVehicle[]> {
  const results = (await getTripResults()).filter((r) => REPORT_TRIPS.includes(r.axis.slug));
  return getTcoVehicles().flatMap((s) => {
    const v = getVehicleBySlug(s.slug);
    if (!v) return [];
    const versions = s.configs.flatMap((sc) => {
      const c = v.configurations.find((x) => x.id === sc.id);
      if (!c) return [];
      const rr = c.realRange ?? v.realRange;
      return [{
        id: c.id,
        label: c.label,
        price: sc.price_EUR,
        battery: batteryOf(v, c),
        mixed: rr.mixed_km,
        highway: rr.highway_130_km,
        winter: rr.winter_minus5_km,
        rangeLevel: confidenceLevel(rr.confidence),
        dcMin: c.chargingDC_10_80_min ?? v.chargingDC.time_10_80_min ?? null,
      }];
    });
    const trips = REPORT_TRIPS.flatMap((slug) => {
      const r = results.find((x) => x.axis.slug === slug);
      const row = r?.rows.find((x) => x.vehicle.slug === v.slug);
      if (!r || !row) return [];
      return [{
        slug,
        title: tripTitle(r.axis),
        km: Math.round(r.km),
        version: row.version,
        stops: row.summer.stops,
        totalMin: Math.round(row.summer.totalMin),
        cost: tripCost(row.summer).total.map((x) => Math.round(x)) as [number, number],
        winterStops: row.winter?.stops ?? null,
      }];
    });
    return [{ slug: v.slug, name: getVehicleName(v), aid: s.aids_EUR, aidPro: s.aidsPro_EUR, versions, trips }];
  });
}
