import type { Vehicle } from "@/data/schemas";

/**
 * Pays considérés comme produisant des véhicules avec un score ADEME ≥ 60 (éco-score).
 * Source : src/lib/leasing.ts
 */
const EU_COUNTRIES = [
  "France",
  "Allemagne",
  "Slovaquie",
  "Rép. Tchèque",
  "Pologne",
  "Espagne",
  "Italie",
  "Belgique",
  "Suède",
  "Slovénie",
  "Hongrie",
  "Autriche",
  "Portugal",
];

export function isEU(country: string): boolean {
  return EU_COUNTRIES.includes(country);
}

// Seuils d'éligibilité générale du véhicule
export const CEE_PRICE_CAP_EUR = 47_000;
export const CEE_WEIGHT_CAP_KG = 2_400;

// Type de profil utilisateur
export type UserProfileType = "particular" | "company_small" | "company_large" | "local_authority" | "rental" | "other_legal_entity";

// Catégories de ménages
export type HouseholdCategory = "precarite" | "modeste" | "autres";

// Brackets de revenus de base (1 à 5 personnes)
export const HOUSEHOLD_THRESHOLDS = {
  precarite: [24031, 35270, 42357, 49455, 56580],
  modeste: [29253, 42933, 51564, 60208, 68877],
};

// Augmentation par personne supplémentaire au-delà de 5 personnes
export const ADDITIONAL_PERSON_INCREASE = {
  precarite: 7116,
  modeste: 8663,
};

/**
 * Coup de pouce « véhicules particuliers électriques » : barème indicatif 2026 publié par le
 * ministère de la Transition écologique, par catégorie de revenus. Le montant réellement versé
 * dépend du signataire de la charte CEE (constructeur, énergéticien) et du mois : on affiche
 * ce barème partout (fiche, catalogue, comparateur, matcher, simulateurs), jamais un montant de marque.
 */
export const PRIME_AMOUNTS: Record<HouseholdCategory, number> = {
  precarite: 5700,
  modeste: 4700,
  autres: 3500,
};

/** Prime de tout ménage (« autres ménages ») : celle des prix « après aides » sans profil fiscal */
export const CEE_BASE_EUR = PRIME_AMOUNTS.autres;
/** Année du barème ci-dessus */
export const CEE_SCALE_YEAR = 2026;
/** Prime la plus haute (ménage en précarité) : celle des « jusqu'à » */
export const CEE_MAX_EUR = PRIME_AMOUNTS.precarite;

/**
 * Bonification batterie européenne : 1 200 à 2 000 € de plus pour les versions inscrites sur la
 * liste de l'ADEME (revue chaque mois, sources divergentes d'un modèle à l'autre). Signalée comme
 * possible, jamais déduite d'un prix affiché.
 */
export const BATTERY_BONUS_EUR = { min: 1200, max: 2000 };

export const HOUSEHOLD_LABELS: Record<HouseholdCategory, string> = {
  precarite: "Ménage en précarité",
  modeste: "Ménage modeste",
  autres: "Autres ménages",
};

// Montants des primes pour personnes morales (Professionnels et collectivités)
export const MORAL_PERSON_PRIME_AMOUNTS = {
  company_large: 460, // Entreprises > 100 Véhicules
  company_small: 460, // Par extension, même montant ou CEE de base
  local_authority: 340, // Collectivités locales > 20 Véhicules
  rental: 340, // Loueurs
  other_legal_entity: 600, // Autres personnes morales (publiques, privées, associations...)
};

/**
 * Détermine si le véhicule est éligible au dispositif CEE 2026.
 */
export function isVehicleEligibleCEE(vehicle: Vehicle, price: number | null): boolean {
  // Éco-score ADEME ≥ 60 : renseigné dans la fiche par la présence d'une prime CEE.
  // (Le pays seul ne suffit pas : Inster coréen et Grande Panda serbe sont éligibles.)
  const hasEcoScore = vehicle.availableAids?.some((aid) => /cee|coup de pouce/i.test(aid.label)) ?? false;
  if (!hasEcoScore) return false;

  // Si le prix d'achat de la configuration ou finition dépasse le plafond
  const validTrimPrices = vehicle.trims.map((t) => t.price_EUR).filter((p): p is number => p !== null);
  const actualPrice = price ?? (validTrimPrices.length > 0 ? Math.min(...validTrimPrices) : 0);
  if (actualPrice > CEE_PRICE_CAP_EUR) return false;

  // Poids < 2,4 tonnes
  if (vehicle.mass_kg && vehicle.mass_kg >= CEE_WEIGHT_CAP_KG) return false;

  return true;
}

/**
 * Bonification batterie européenne signalée dans la fiche (aide « Majoration batterie »).
 * Indique seulement qu'elle est possible pour une version du modèle.
 */
export function hasBatteryBonus(vehicle: Vehicle): boolean {
  return vehicle.availableAids?.some((aid) => /batterie|majoration/i.test(aid.label)) ?? false;
}

/** Prime CEE d'une version sans profil fiscal : ce que reçoit tout ménage et le plafond du barème */
export function ceeRange(vehicle: Vehicle, price: number | null): { base: number; max: number } | null {
  return isVehicleEligibleCEE(vehicle, price) ? { base: CEE_BASE_EUR, max: CEE_MAX_EUR } : null;
}

/**
 * Calcule les plafonds de revenus (RFR) pour une taille de ménage donnée.
 */
export function getIncomeCeilings(householdSize: number) {
  const sizeIndex = Math.max(1, Math.round(householdSize)) - 1;
  
  if (sizeIndex < 5) {
    return {
      precarite: HOUSEHOLD_THRESHOLDS.precarite[sizeIndex],
      modeste: HOUSEHOLD_THRESHOLDS.modeste[sizeIndex],
    };
  } else {
    const extraPeople = sizeIndex - 4;
    return {
      precarite: HOUSEHOLD_THRESHOLDS.precarite[4] + extraPeople * ADDITIONAL_PERSON_INCREASE.precarite,
      modeste: HOUSEHOLD_THRESHOLDS.modeste[4] + extraPeople * ADDITIONAL_PERSON_INCREASE.modeste,
    };
  }
}

/**
 * Détermine la catégorie de revenus du foyer (Précarité, Modeste, Autres) en fonction du RFR et de la taille du ménage.
 */
export function getHouseholdCategory(householdSize: number, taxIncome: number): HouseholdCategory {
  const ceilings = getIncomeCeilings(householdSize);
  if (taxIncome <= ceilings.precarite) {
    return "precarite";
  } else if (taxIncome <= ceilings.modeste) {
    return "modeste";
  } else {
    return "autres";
  }
}

/**
 * Calcule le montant de la prime CEE selon le profil et la version (barème indicatif, hors
 * bonification batterie). `category` force la catégorie de revenus (profil non renseigné).
 */
export function calculateCeeAid({
  vehicle,
  price,
  profileType,
  householdSize = 1,
  taxIncome = 30000,
  category: forcedCategory,
}: {
  vehicle: Vehicle;
  price: number | null;
  profileType: UserProfileType;
  householdSize?: number;
  taxIncome?: number;
  category?: HouseholdCategory;
}): {
  amount: number;
  isEligible: boolean;
  category?: HouseholdCategory;
  /** Bonification batterie européenne possible en plus (non comprise dans `amount`) */
  batteryBonus: boolean;
  label: string;
} {
  const isEligible = isVehicleEligibleCEE(vehicle, price);
  const batteryBonus = isEligible && hasBatteryBonus(vehicle);

  if (!isEligible) {
    return { amount: 0, isEligible: false, batteryBonus, label: "Non éligible" };
  }

  if (profileType !== "particular") {
    // Profils professionnels / personnes morales
    let amount = 0;
    let label = "Prime CEE";
    
    if (profileType === "company_large" || profileType === "company_small") {
      amount = MORAL_PERSON_PRIME_AMOUNTS.company_large;
      label = "Prime CEE Entreprises";
    } else if (profileType === "local_authority") {
      amount = MORAL_PERSON_PRIME_AMOUNTS.local_authority;
      label = "Prime CEE Collectivités";
    } else if (profileType === "rental") {
      amount = MORAL_PERSON_PRIME_AMOUNTS.rental;
      label = "Prime CEE Loueurs";
    } else if (profileType === "other_legal_entity") {
      amount = MORAL_PERSON_PRIME_AMOUNTS.other_legal_entity;
      label = "Prime CEE Personnes Morales";
    }

    return { amount, isEligible: true, batteryBonus, label };
  }

  // Particulier (personne physique) : barème par catégorie de revenus
  const category = forcedCategory ?? getHouseholdCategory(householdSize, taxIncome);
  return { amount: PRIME_AMOUNTS[category], isEligible: true, category, batteryBonus, label: "Coup de pouce CEE" };
}

/**
 * Prime CEE d'une version pour le profil du visiteur : sans profil renseigné, la prime de tout
 * ménage (même chiffre que la fiche et le catalogue).
 */
export function ceeForProfile(
  vehicle: Vehicle,
  price: number | null,
  profile: { profileType: UserProfileType; householdSize: number; taxIncome: number; hasConfigured: boolean }
) {
  return profile.hasConfigured
    ? calculateCeeAid({ vehicle, price, profileType: profile.profileType, householdSize: profile.householdSize, taxIncome: profile.taxIncome })
    : calculateCeeAid({ vehicle, price, profileType: "particular", category: "autres" });
}
