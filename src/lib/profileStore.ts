import type { UserProfileType } from "./cee";

/**
 * Profil d'aides du visiteur (revenu fiscal, parts, gros rouleur, société), enregistré sur l'appareil
 * par l'estimateur de /aides/ et la fenêtre de profil des fiches (clé déclarée dans data/legal.ts).
 * Sans React : lu aussi par les scripts des pages statiques (lib/myPrime). Le crochet React est dans
 * lib/userProfile.
 */
export interface UserProfile {
  profileType: UserProfileType;
  /** Nombre de parts fiscales (avis d'imposition) */
  taxParts: number;
  /** Revenu fiscal de référence du foyer */
  taxIncome: number;
  /** Plus de 12 000 km par an pour le travail avec sa voiture (catégorie « gros rouleur ») */
  bigCommuter: boolean;
  hasConfigured: boolean;
}

export const PROFILE_KEY = "evly-user-profile";

export const DEFAULT_PROFILE: UserProfile = {
  profileType: "particular",
  taxParts: 1,
  taxIncome: 24000,
  bigCommuter: false,
  hasConfigured: false,
};

/** Parts fiscales d'un ancien profil (taille du foyer) : couple, puis 0,5 part par enfant, 1 dès le 3e */
const partsFromHousehold = (size: number) => (size <= 2 ? Math.max(1, size) : size === 3 ? 2.5 : size - 1);

export function readUserProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const saved = JSON.parse(raw);
    // Profils d'avant septembre 2026 : taille du foyer au lieu des parts fiscales
    const taxParts = Number(saved.taxParts) > 0 ? Number(saved.taxParts) : partsFromHousehold(Number(saved.householdSize) || 1);
    return {
      ...DEFAULT_PROFILE,
      profileType: saved.profileType ?? DEFAULT_PROFILE.profileType,
      taxIncome: Number(saved.taxIncome) >= 0 ? Number(saved.taxIncome) : DEFAULT_PROFILE.taxIncome,
      taxParts,
      bigCommuter: saved.bigCommuter === true,
      hasConfigured: saved.hasConfigured === true,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function writeUserProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* stockage indisponible : le profil vaut pour la page */
  }
  window.dispatchEvent(new CustomEvent("profile-changed", { detail: profile }));
}
