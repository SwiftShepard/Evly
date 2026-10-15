/**
 * Autonomie réelle estimée d'une version sans essai : WLTP × la part du WLTP que tient une
 * version mesurée du même modèle, sinon la médiane des versions mesurées de la même carrosserie. Autoroute
 * (130 km/h) et ville se déduisent du mixte avec les rapports médians des essais.
 * Les coefficients se recalculent sur les données (calibrate) : plus il y a de mesures,
 * plus l'estimation est juste. Fichier JavaScript (JSDoc), partagé par le site (page
 * méthodologie) et les scripts (scripts/apply-range-estimates.mjs).
 */

/** Sous ce nombre d'essais, une carrosserie prend la médiane de tout le catalogue */
const MIN_SAMPLE = 12;

/**
 * Famille de carrosserie d'après le libellé libre de la fiche
 * @param {string} bodyType
 * @returns {"city" | "suv" | "sedan" | "van"}
 */
export function bodyFamily(bodyType) {
  const b = bodyType.toLowerCase();
  if (/fourgon|combi|ludospace|monospace|van/.test(b)) return "van";
  if (/suv|crossover|tout-terrain/.test(b)) return "suv";
  if (/citadine|hatchback|compacte|quadricycle|mini/.test(b)) return "city";
  return "sedan";
}

export const FAMILY_LABEL = { city: "Citadines et compactes", suv: "SUV et crossovers", sedan: "Berlines et breaks", van: "Utilitaires et monospaces" };

/** @returns {number} */
const median = (/** @type {number[]} */ a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[s.length >> 1] ?? NaN;
};

/**
 * Coefficients tirés des versions mesurées (essais Nyland ou presse)
 * @param {any[]} vehicles fiches du catalogue
 */
export function calibrate(vehicles) {
  /** @type {{ family: string, ratio: number, hw: number, urban: number }[]} */
  const pts = [];
  for (const v of vehicles)
    for (const c of v.configurations ?? []) {
      const rr = c.realRange;
      const wltp = c.wltp_km ?? v.wltp_max_km;
      if (!rr || !wltp || !(rr.confidence === "bjorn_nyland" || rr.confidence === "tested")) continue;
      pts.push({ family: bodyFamily(v.bodyType), ratio: rr.mixed_km / wltp, hw: rr.highway_130_km / rr.mixed_km, urban: rr.urban_km / rr.mixed_km });
    }
  const all = median(pts.map((p) => p.ratio));
  const family = (/** @type {string} */ f) => {
    const own = pts.filter((p) => p.family === f);
    return { ratio: own.length >= MIN_SAMPLE ? median(own.map((p) => p.ratio)) : all, n: own.length };
  };
  const byFamily = { city: family("city"), suv: family("suv"), sedan: family("sedan"), van: family("van") };
  return { byFamily, all, n: pts.length, highway: median(pts.map((p) => p.hw)), urban: median(pts.map((p) => p.urban)) };
}

/**
 * Rapports mesurés d'un même modèle (une autre version a été essayée) : la meilleure base pour
 * estimer ses versions sans essai, plus juste que la médiane de la carrosserie.
 * @param {any} v fiche
 * @returns {{ ratio: number, highway: number, urban: number } | null}
 */
export function ownCalibration(v) {
  const pts = (v.configurations ?? []).filter(
    (/** @type {any} */ c) => c.wltp_km && c.realRange && (c.realRange.confidence === "bjorn_nyland" || c.realRange.confidence === "tested")
  );
  if (!pts.length) return null;
  return {
    ratio: median(pts.map((/** @type {any} */ c) => c.realRange.mixed_km / c.wltp_km)),
    highway: median(pts.map((/** @type {any} */ c) => c.realRange.highway_130_km / c.realRange.mixed_km)),
    urban: median(pts.map((/** @type {any} */ c) => c.realRange.urban_km / c.realRange.mixed_km)),
  };
}

/**
 * Autonomies estimées d'une version (km) : d'après une version mesurée du même modèle s'il y en
 * a une, sinon d'après la carrosserie.
 * @param {number} wltpKm
 * @param {string} bodyType
 * @param {ReturnType<typeof calibrate>} k
 * @param {ReturnType<typeof ownCalibration>} [own]
 */
export function estimateRange(wltpKm, bodyType, k, own = null) {
  const ratio = own?.ratio ?? k.byFamily[bodyFamily(bodyType)].ratio;
  const mixed = Math.round(wltpKm * ratio);
  return { mixed_km: mixed, highway_130_km: Math.round(mixed * (own?.highway ?? k.highway)), urban_km: Math.round(mixed * (own?.urban ?? k.urban)) };
}
