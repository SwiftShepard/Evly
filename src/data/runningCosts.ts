/**
 * Coûts de possession hors énergie, sourcés et datés : entretien, assurance, revente. Hypothèses
 * par défaut du calculateur de coût (lib/costDefaults, lib/tco), du rapport et des pages
 * « Électrique ou essence ». Moyennes du parc, réglables dans le simulateur.
 */

/** Entretien moyen par mois : Roole data, budget automobile des Français, édition 2026 (année 2025) */
export const MAINTENANCE = {
  date: "2026-09-12",
  sourceUrl: "https://media.roole.fr/quotidien/au-volant/budget-auto-lhybride-rechargeable-et-le-diesel-recales-voici-la-motorisation-la-moins-chere-en-2026",
  evMonthly: 29,
  iceMonthly: 50,
};

/** Prime d'assurance moyenne par an en 2025 : baromètre Assurland (publié le 20/02/2026) */
export const INSURANCE = {
  date: "2026-02-20",
  sourceUrl: "https://www.assurland.com/assurance-auto/actualites/pourquoi-l-assurance-electrique-depasse-le-thermique_142270.html",
  ev: 818,
  essence: 753,
  diesel: 735,
};

/**
 * Valeur de revente après 3 ans et 60 000 km, en % du prix catalogue neuf : Autovista Group, grands
 * marchés européens, décembre 2025 à février 2026. Les électriques y gardent le moins de valeur
 * (37 à 39 %), l'essence autour de 49 % ; en France aussi, les électriques ont les plus basses.
 */
export const RESALE_3Y = {
  date: "2026-02",
  sourceUrl: "https://www.jdpower.com/business/news/mmu-how-did-europes-major-used-car-markets-perform-in-2025/",
  ev: 38,
  ice: 49,
};
