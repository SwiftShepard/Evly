/**
 * « Votre prix » (roadmap K6) : la prime CEE du visiteur d'après le profil qu'il a enregistré
 * (lib/profileStore), pour les prix « après prime » du site. Sans profil, rien ne change : les pages
 * gardent la prime de tout ménage. Sans React, utilisable dans les scripts des pages.
 */
import { HOUSEHOLD_LABELS, MORAL_PERSON_PRIME_EUR, PRIME_GRID, getHouseholdCategory, type HouseholdCategory } from "@/lib/cee";
import { readUserProfile } from "@/lib/profileStore";

/** Grille de la prime d'un modèle : « europe » si la production européenne est confirmée (lib/cee) */
export type PrimeGrid = keyof typeof PRIME_GRID;

export interface MyPrime {
  /** null : personne morale (société, collectivité…) */
  category: HouseholdCategory | null;
  /** « ménage modeste », « société » : pour les libellés */
  label: string;
  /** Prime d'un modèle éligible, selon sa grille */
  of: (grid: PrimeGrid) => number;
}

export function myPrime(): MyPrime | null {
  const p = readUserProfile();
  if (!p.hasConfigured) return null;
  if (p.profileType !== "particular") return { category: null, label: "personne morale", of: () => MORAL_PERSON_PRIME_EUR };
  const category = getHouseholdCategory(p.taxIncome, p.taxParts, p.bigCommuter);
  return { category, label: HOUSEHOLD_LABELS[category].toLowerCase(), of: (grid) => PRIME_GRID[grid][category] };
}
