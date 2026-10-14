/**
 * Kilométrage annuel et forfait de location (LLD, LOA) qui le couvre : même règle pour
 * l'outil « Ma semaine » et pour les tableaux de sa page.
 */

/** Forfaits kilométriques courants des locations, en km par an */
export const LEASE_TIERS = [5_000, 7_500, 10_000, 12_500, 15_000, 20_000, 25_000, 30_000, 35_000, 40_000, 50_000];

/** Une année = 52 semaines comme celle-ci (les grands trajets des vacances viennent en plus) */
export const WEEKS_PER_YEAR = 52;

export const annualKm = (weekKm: number) => Math.round((weekKm * WEEKS_PER_YEAR) / 100) * 100;

/** Plus petit forfait qui couvre le kilométrage annuel, ou null au-delà du dernier */
export const leaseTier = (yearKm: number) => LEASE_TIERS.find((t) => t >= yearKm) ?? null;
