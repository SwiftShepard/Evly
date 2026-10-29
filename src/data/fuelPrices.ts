/**
 * Carburant, pour comparer l'électrique au thermique sur les pages statiques (simulateur par
 * défaut, « Électrique ou essence », fiches). Ma semaine lit le même flux en direct.
 * Relevé chaque lundi par l'Action « Prix des carburants » (scripts/fuel-prices.mjs), qui ne
 * réécrit ce bloc que si un prix bouge d'au moins 2 centimes : garder son format.
 */

/** Moyenne nationale des stations mises à jour dans la semaine (flux instantané prix-carburants) */
export const FUEL_PRICES = {
  date: "2026-10-28",
  sourceUrl: "https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/",
  /** SP95-E10, €/l (5 813 stations) */
  e10: 2.11,
  /** Gazole, €/l (6 889 stations) */
  gazole: 2.39,
};

/**
 * Consommation réelle des voitures thermiques par rapport à l'homologation WLTP : relevés OBFCM
 * de 617 194 voitures immatriculées en 2021, moyenne pondérée par les kilomètres (Commission
 * européenne, rapport COM(2024) 122). Les hybrides non rechargeables sont comptées en essence.
 */
export const REAL_WORLD_GAP = {
  petrol: 0.204,
  diesel: 0.167,
  sourceUrl: "https://climate.ec.europa.eu/document/download/b644dafe-1385-4b56-98d9-21e7e9f3601b_en?filename=report.pdf",
};
