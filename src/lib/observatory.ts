/**
 * Observatoire de l'autonomie réelle : les chiffres de /observatoire/ et des données ouvertes
 * (/donnees/autonomie-reelle.csv et .json), tous recalculés au build depuis les fiches.
 *
 * Écarts à l'annonce : uniquement sur les versions mesurées sur route (lib/rangeGap, la même
 * règle que l'accueil). Les données ouvertes ne publient que les chiffres d'Evly (mixte dérivé
 * des essais, autoroute, ville, hiver, estimations), jamais les relevés bruts des essayeurs :
 * chaque ligne renvoie à l'essai d'origine.
 */
import type { Vehicle, VehicleConfiguration } from "@/data/schemas";
import { SOURCES } from "@/data/sources";
import { getAllVehicles } from "@/lib/vehicles";
import { getMeasuredGap, type MeasuredGap } from "@/lib/rangeGap";
import { confidenceLevel, type ConfidenceLevel } from "@/lib/confidence";
import { getMarketStatus, getVehicleName } from "@/lib/seo";
import { url } from "@/lib/url";

/** Une marque n'entre au classement qu'avec ce nombre de modèles mesurés */
export const BRAND_MIN_MODELS = 2;
export const DATA_LICENSE = { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/deed.fr" };
export const CITATION = "Source : Evly, observatoire de l'autonomie réelle (ev-ly.com/observatoire/)";

export interface ObsRow {
  vehicle: Vehicle;
  config: VehicleConfiguration;
  name: string;
  battery: number | null;
  wltp: number | null;
  mixed: number;
  highway130: number | null;
  urban: number | null;
  winter: number | null;
  level: ConfidenceLevel;
  /** Écart à l'annonce en % (positif : en dessous du WLTP), seulement si mesurée */
  gapPct: number | null;
  /** Qui a mesuré, et où lire l'essai */
  source: string | null;
  testUrl: string | null;
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

/** Essayeur et lien de l'essai d'une version mesurée */
function testOf(v: Vehicle, c: VehicleConfiguration): { source: string | null; testUrl: string | null } {
  const rr = c.realRange ?? v.realRange;
  const tests = c.rangeTests ?? [];
  if (rr.confidence === "bjorn_nyland") {
    const t = tests.find((x) => x.protocol === "nyland");
    return { source: SOURCES.nyland?.name ?? "Bjørn Nyland", testUrl: t?.videoUrl ?? SOURCES.nyland?.protocolUrl ?? null };
  }
  if (rr.confidence === "tested") {
    const t = tests.find((x) => x.url) ?? tests.find((x) => x.protocol !== "wltp" && x.protocol !== "manufacturer");
    if (t) return { source: SOURCES[t.sourceId]?.name ?? t.sourceId, testUrl: t.url ?? t.videoUrl ?? SOURCES[t.sourceId]?.url ?? null };
  }
  return { source: null, testUrl: null };
}

function rowOf(v: Vehicle, c: VehicleConfiguration): ObsRow {
  const rr = c.realRange ?? v.realRange;
  const level = confidenceLevel(rr.confidence);
  const wltp = c.wltp_km ?? null;
  return {
    vehicle: v,
    config: c,
    name: getVehicleName(v),
    battery: c.usableCapacity_kWh ?? v.usableCapacity_kWh ?? null,
    wltp,
    mixed: rr.mixed_km,
    highway130: rr.highway_130_km ?? null,
    urban: rr.urban_km ?? null,
    winter: rr.winter_minus5_km ?? null,
    level,
    gapPct: level === "measured" && wltp ? (1 - rr.mixed_km / wltp) * 100 : null,
    ...testOf(v, c),
  };
}

let rowsCache: ObsRow[] | null = null;

/** Toutes les versions du catalogue (données ouvertes), y compris celles qui ne sont plus vendues */
export function getObservatoryRows(): ObsRow[] {
  rowsCache ??= getAllVehicles().flatMap((v) => v.configurations.map((c) => rowOf(v, c)));
  return rowsCache;
}

/** Un modèle mesuré, une ligne : la version testée la plus accessible (comme l'accueil) */
export function getMeasuredModels(): (MeasuredGap & { row: ObsRow })[] {
  return getAllVehicles()
    .map(getMeasuredGap)
    .filter((g): g is MeasuredGap => g !== null)
    .map((g) => ({ ...g, row: rowOf(g.vehicle, g.config) }))
    .sort((a, b) => a.gapPct - b.gapPct);
}

export interface BrandGap {
  brand: string;
  medianPct: number;
  models: (MeasuredGap & { row: ObsRow })[];
}

/** Écart médian par marque, de la plus fidèle à la plus optimiste */
export function getBrandGaps(): BrandGap[] {
  const byBrand = new Map<string, (MeasuredGap & { row: ObsRow })[]>();
  for (const m of getMeasuredModels()) {
    const list = byBrand.get(m.vehicle.brand) ?? [];
    list.push(m);
    byBrand.set(m.vehicle.brand, list);
  }
  return [...byBrand.entries()]
    .filter(([, models]) => models.length >= BRAND_MIN_MODELS)
    .map(([brand, models]) => ({ brand, models, medianPct: median(models.map((m) => m.gapPct)) }))
    .sort((a, b) => a.medianPct - b.medianPct || b.models.length - a.models.length);
}

export interface ObservatoryFacts {
  models: number;
  measuredModels: number;
  versions: number;
  measuredVersions: number;
  medianGapPct: number;
  /** Ce qu'on perd à 130 km/h par rapport au mixte (médiane des modèles mesurés, en %) */
  highwayLossPct: number;
  /** Ce qu'on perd par -5 °C (modèle d'hiver appliqué aux mesures, en %) */
  winterLossPct: number;
  byLevel: Record<ConfidenceLevel, number>;
}

export function getObservatoryFacts(): ObservatoryFacts {
  const vehicles = getAllVehicles();
  const rows = getObservatoryRows();
  const measured = getMeasuredModels();
  const byLevel: Record<ConfidenceLevel, number> = { measured: 0, manufacturer: 0, estimated: 0 };
  for (const v of vehicles) byLevel[confidenceLevel(v.realRange.confidence)]++;
  return {
    models: vehicles.length,
    measuredModels: measured.length,
    versions: rows.length,
    measuredVersions: rows.filter((r) => r.level === "measured").length,
    medianGapPct: median(measured.map((m) => m.gapPct)),
    highwayLossPct: median(measured.filter((m) => m.row.highway130).map((m) => (1 - m.row.highway130! / m.row.mixed) * 100)),
    winterLossPct: median(measured.filter((m) => m.row.winter).map((m) => (1 - m.row.winter! / m.row.mixed) * 100)),
    byLevel,
  };
}

/* ── Données ouvertes ─────────────────────────────────────────── */

export const DATA_FIELDS: { key: string; label: string }[] = [
  { key: "marque", label: "Marque" },
  { key: "modele", label: "Modèle (nom Evly)" },
  { key: "version", label: "Version (finition, batterie, jantes)" },
  { key: "id", label: "Identifiant stable : fiche/version" },
  { key: "carrosserie", label: "Carrosserie" },
  { key: "statut", label: "disponible, precommande, a_venir ou arrete" },
  { key: "batterie_utile_kwh", label: "Capacité utile de la batterie (kWh)" },
  { key: "wltp_km", label: "Autonomie annoncée, cycle WLTP (km)" },
  { key: "reelle_mixte_km", label: "Autonomie réelle, route et autoroute mêlées (km)" },
  { key: "reelle_autoroute_130_km", label: "Autonomie réelle à 130 km/h (km)" },
  { key: "reelle_ville_km", label: "Autonomie réelle en ville (km)" },
  { key: "hiver_moins5_km", label: "Autonomie par -5 °C, toujours estimée par le modèle d'hiver d'Evly (km)" },
  { key: "ecart_wltp_pct", label: "Écart entre l'annonce et le mixte mesuré (%), versions mesurées seulement" },
  { key: "confiance", label: "mesuree (essai sur route), constructeur ou estimee" },
  { key: "essai", label: "Qui a mesuré la version" },
  { key: "lien_essai", label: "Où lire ou voir l'essai d'origine" },
  { key: "prix_eur", label: "Prix catalogue en France (€)" },
  { key: "fiche", label: "Fiche Evly de la version" },
  { key: "mise_a_jour", label: "Dernière mise à jour de la fiche" },
];

const LEVEL_CODE: Record<ConfidenceLevel, string> = { measured: "mesuree", manufacturer: "constructeur", estimated: "estimee" };
const STATUS_CODE = { available: "disponible", preorder: "precommande", upcoming: "a_venir", discontinued: "arrete" } as const;

/** Lignes des données ouvertes, dans l'ordre de DATA_FIELDS */
export function getOpenDataRecords(site: URL | undefined): Record<string, string | number | null>[] {
  return getObservatoryRows().map((r) => ({
    marque: r.vehicle.brand,
    modele: r.name,
    version: r.config.label,
    id: `${r.vehicle.slug}/${r.config.id}`,
    carrosserie: r.vehicle.bodyType,
    statut: STATUS_CODE[getMarketStatus(r.vehicle)],
    batterie_utile_kwh: r.battery,
    wltp_km: r.wltp,
    reelle_mixte_km: r.mixed,
    reelle_autoroute_130_km: r.highway130,
    reelle_ville_km: r.urban,
    hiver_moins5_km: r.winter,
    ecart_wltp_pct: r.gapPct === null ? null : Math.round(r.gapPct * 10) / 10,
    confiance: LEVEL_CODE[r.level],
    essai: r.source,
    lien_essai: r.testUrl,
    prix_eur: r.config.price_EUR ?? null,
    fiche: new URL(url(`/vehicules/${r.vehicle.slug}/?config=${encodeURIComponent(r.config.id)}`), site).toString(),
    mise_a_jour: r.vehicle.lastUpdated,
  }));
}
