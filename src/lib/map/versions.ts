/**
 * Versions d'un modèle pour « Ma semaine » : ce qui change le calcul, c'est la batterie
 * et la transmission. Les finitions d'une même batterie et d'une même transmission ne
 * font qu'un choix, sauf si leur autonomie diffère vraiment (jantes, version sportive).
 */
import type { Vehicle } from "@/data/schemas";
import type { WeekVersion } from "@/components/week/types";
import { isMeasured } from "@/lib/confidence";
import { formatNumber } from "@/lib/format";

type Config = Vehicle["configurations"][number];

/** Écart d'autonomie au-delà duquel deux finitions restent deux versions */
const SAME_RANGE = 0.05;
// « xDrive40 », « HTRAC » : pas de limite de mot après le nom de la transmission
const AWD = /(\bawd\b|\b4x4\b|\b4wd\b|dual motor|quattro|4motion|xdrive|e-4orce|htrac|intégrale)/i;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Nom de finition sans le modèle ni la batterie, déjà affichés (« i4 eDrive35 (Base) » -> « eDrive35 (Base) ») */
const trimName = (v: Vehicle, trim: string) =>
  trim
    .replace(new RegExp(`^${escapeRe(v.model)}\\s+`, "i"), "")
    .replace(/\(?\s*\d+(?:[.,]\d+)?\s*kWh\s*\)?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim() || trim;

const kwhIn = (text: string | null | undefined) => {
  const m = text?.match(/(\d+(?:[.,]\d+)?)\s*kWh/i);
  return m?.[1] ? parseFloat(m[1].replace(",", ".")) : null;
};

/**
 * Capacité de la batterie d'une configuration : la sienne, sinon celle écrite dans son nom,
 * sinon celle des finitions du même nom (petite batterie pour « standard », grande sinon).
 */
function batteryOf(v: Vehicle, c: Config): number {
  if (c.usableCapacity_kWh) return c.usableCapacity_kWh;
  const inLabel = kwhIn(c.label);
  if (inLabel) return inLabel;
  const trims = v.trims.map((t) => ({ name: t.name, kwh: kwhIn(t.batteryUsed) })).filter((t) => t.kwh !== null);
  const same = trims.filter((t) => t.name.toLowerCase() === c.trim.toLowerCase());
  const pool = (same.length ? same : trims).map((t) => t.kwh!);
  if (pool.length) return c.battery === "standard" ? Math.min(...pool) : Math.max(...pool);
  return v.usableCapacity_kWh;
}

/** Courbe de charge compacte, triée ; absente si moins de deux relevés */
function curveOf(points: { soc: number; power: number }[] | null | undefined): [number, number][] | undefined {
  if (!points || points.length < 2) return undefined;
  return [...points].sort((a, b) => a.soc - b.soc).map((p) => [p.soc, p.power]);
}

export function weekVersions(v: Vehicle): { versions: WeekVersion[]; defaultVersion: string } {
  const configs = v.configurations.filter((c) => c.availability !== "discontinued");
  if (!configs.length) {
    const rr = v.realRange;
    const only: WeekVersion = {
      id: v.slug,
      label: `${formatNumber(v.usableCapacity_kWh, Number.isInteger(v.usableCapacity_kWh) ? 0 : 1)} kWh`,
      detail: "",
      configs: [],
      measured: isMeasured(rr.confidence),
      range: { mixed_km: rr.mixed_km, highway_130_km: rr.highway_130_km, urban_km: rr.urban_km, winter_minus5_km: rr.winter_minus5_km },
      charging: {
        usableKWh: v.usableCapacity_kWh,
        acKW: v.chargingAC.onboardCharger_kW,
        dc30KWh: v.chargingDC.kWh_added_30min,
        dcPeakKW: v.chargingDC.peakPower_kW,
        curve: v.chargingDC.peakPower_kW > 0 ? curveOf(v.chargingCurve) : undefined,
      },
    };
    return { versions: [only], defaultVersion: only.id };
  }

  // 1. Même batterie, même transmission
  const families = new Map<string, { kwh: number; awd: boolean; items: Config[] }>();
  for (const c of configs) {
    const kwh = batteryOf(v, c);
    const awd = AWD.test(`${c.trim} ${c.label}`);
    const key = `${kwh}|${awd}`;
    const fam = families.get(key) ?? { kwh, awd, items: [] };
    fam.items.push(c);
    families.set(key, fam);
  }

  // 2. Dans une famille, des autonomies vraiment différentes restent séparées
  const versions: WeekVersion[] = [];
  for (const fam of families.values()) {
    const sorted = [...fam.items].sort((a, b) => (b.realRange ?? v.realRange).mixed_km - (a.realRange ?? v.realRange).mixed_km);
    const clusters: Config[][] = [];
    for (const c of sorted) {
      const mixed = (c.realRange ?? v.realRange).mixed_km;
      const cluster = clusters.find((cl) => Math.abs(mixed / (cl[0]!.realRange ?? v.realRange).mixed_km - 1) <= SAME_RANGE);
      if (cluster) cluster.push(c);
      else clusters.push([c]);
    }
    for (const cluster of clusters) {
      // Autonomie de référence : une mesure si la version en a une, sinon la plus prudente
      const measured = cluster.find((c) => isMeasured((c.realRange ?? v.realRange).confidence));
      const ref =
        measured ?? [...cluster].sort((a, b) => (a.realRange ?? v.realRange).mixed_km - (b.realRange ?? v.realRange).mixed_km)[0]!;
      const rr = ref.realRange ?? v.realRange;
      const trims = [...new Set(cluster.map((c) => trimName(v, c.trim)))];
      versions.push({
        id: cluster[0]!.id,
        label: `${formatNumber(fam.kwh, Number.isInteger(fam.kwh) ? 0 : 1)} kWh · ${trims.join(", ")}`,
        detail: fam.awd ? "4 roues motrices" : "",
        configs: cluster.map((c) => c.id),
        measured: !!measured,
        range: { mixed_km: rr.mixed_km, highway_130_km: rr.highway_130_km, urban_km: rr.urban_km, winter_minus5_km: rr.winter_minus5_km },
        charging: {
          usableKWh: fam.kwh,
          acKW: v.chargingAC.onboardCharger_kW,
          dc30KWh: ref.chargingDC_kWh_30min ?? v.chargingDC.kWh_added_30min,
          dcPeakKW: ref.chargingDC_peak_kW ?? v.chargingDC.peakPower_kW,
          // Version sans charge rapide (Spring d'entrée) : pas de courbe, pas d'arrêt sur borne rapide
          curve: (ref.chargingDC_peak_kW ?? v.chargingDC.peakPower_kW) > 0 ? curveOf(ref.chargingCurve ?? v.chargingCurve) : undefined,
        },
      });
    }
  }

  // Petite batterie d'abord ; à batterie égale, deux roues motrices d'abord
  versions.sort((a, b) => a.charging.usableKWh - b.charging.usableKWh || Number(!!a.detail) - Number(!!b.detail) || a.range.mixed_km - b.range.mixed_km);
  // Version proposée : celle que la fiche affiche en premier
  const first = configs[0]!.id;
  const defaultVersion = versions.find((x) => x.configs.includes(first))?.id ?? versions[0]!.id;
  return { versions, defaultVersion };
}
