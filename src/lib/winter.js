/**
 * Un seul modèle de froid pour tout Evly : l'autonomie « hiver » des fiches (et donc
 * « Tient mon trajet », le matcher, « Ma semaine ») et le curseur de température de la fiche.
 * Fichier JavaScript (JSDoc) : importé à la fois par le site et par les scripts de données
 * (scripts/apply-winter-model.mjs, scripts/sync-nyland-ranges.mjs).
 *
 * Autonomie à T °C = autonomie mixte × facteur(T). Sous 20 °C, la perte croît linéairement :
 * chauffage de l'habitacle (moitié moins avec une pompe à chaleur) et batterie froide
 * (davantage pour la chimie LFP). Calage : essais d'hiver de Bjørn Nyland entre 1 et 3 °C
 * (NMC : environ 0,76 de l'autonomie d'été, pneus hiver compris), prolongés jusqu'à -5 °C.
 * Aucune mesure publique ne couvre encore -5 °C pour l'ensemble du catalogue : l'hiver reste
 * une estimation, dite comme telle.
 */

/** Température de référence de l'autonomie « hiver » */
export const WINTER_C = -5;

/** Pertes à -5 °C par rapport à 20 °C */
const HEATING_LOSS = { heatPump: 0.1, noHeatPump: 0.2 };
const BATTERY_LOSS = { LFP: 0.18, NMC: 0.13 };

/** Marge sur les autonomies estimées (mixte non mesuré) : ne pas promettre trop */
export const ESTIMATE_MARGIN = 0.95;

/**
 * Pompe à chaleur d'après la fiche : true (de série), false (absente), null (en option ou
 * non renseignée : on prend la moyenne des deux cas).
 * @param {"standard" | "option" | "none" | null | undefined} value
 * @returns {boolean | null}
 */
export function heatPumpOf(value) {
  return value === "standard" ? true : value === "none" ? false : null;
}

/**
 * Facteur d'autonomie à une température (1 entre 20 et 25 °C).
 * @param {number} tempC
 * @param {string} chemistry « LFP », « NMC » ou « NCM »
 * @param {boolean | null} heatPump
 * @returns {number}
 */
export function tempFactor(tempC, chemistry, heatPump) {
  if (tempC >= 20 && tempC <= 25) return 1;
  if (tempC > 25) return Math.max(0.8, 1 - 0.08 * ((tempC - 25) / 15)); // climatisation
  const heating = heatPump === true ? HEATING_LOSS.heatPump : heatPump === false ? HEATING_LOSS.noHeatPump : (HEATING_LOSS.heatPump + HEATING_LOSS.noHeatPump) / 2;
  const battery = chemistry === "LFP" ? BATTERY_LOSS.LFP : BATTERY_LOSS.NMC;
  const share = (20 - tempC) / (20 - WINTER_C);
  return Math.max(0.4, 1 - (heating + battery) * share);
}

/**
 * Autonomie « hiver » (-5 °C) d'une version, en km.
 * @param {number} mixedKm autonomie réelle mixte
 * @param {string} chemistry
 * @param {boolean | null} heatPump
 * @param {boolean} measured le mixte vient d'un essai (sinon : marge de prudence)
 * @returns {number}
 */
export function winterKm(mixedKm, chemistry, heatPump, measured) {
  return Math.round(mixedKm * tempFactor(WINTER_C, chemistry, heatPump) * (measured ? 1 : ESTIMATE_MARGIN));
}

/**
 * Le mixte d'une autonomie est-il mesuré ?
 * @param {string} confidence
 */
export const isMeasured = (confidence) => confidence === "bjorn_nyland" || confidence === "tested";
