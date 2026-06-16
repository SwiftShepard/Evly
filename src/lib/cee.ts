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

// Montants des primes pour particuliers (Personnes physiques)
export const PRIME_AMOUNTS = {
  classic: {
    precarite: 6180,
    modeste: 4830,
    autres: 3620,
  },
  bonified: {
    precarite: 8240,
    modeste: 6030,
    autres: 4830,
  },
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
  const isMadeInEU = isEU(vehicle.productionCountry);
  if (!isMadeInEU) return false;

  // Si le prix d'achat de la configuration ou finition dépasse le plafond
  const actualPrice = price ?? Math.min(...vehicle.trims.map((t) => t.price_EUR));
  if (actualPrice > CEE_PRICE_CAP_EUR) return false;

  // Poids < 2,4 tonnes
  if (vehicle.mass_kg && vehicle.mass_kg >= CEE_WEIGHT_CAP_KG) return false;

  return true;
}

/**
 * Détermine si le véhicule bénéficie de la majoration de batterie européenne ("bonifié").
 */
export function isVehicleBatteryUE(vehicle: Vehicle): boolean {
  // Megane E-Tech et Scenic E-Tech ont des batteries et cellules produites en zone économique européenne (Douai / France).
  // On peut ajouter d'autres modèles connus au fur et à mesure.
  const bonifiedSlugs = ["renault-megane", "renault-scenic"];
  if (bonifiedSlugs.includes(vehicle.slug)) {
    return true;
  }
  
  // Alternativement, on peut analyser si le JSON possède l'aide "Majoration Batterie"
  const hasBatteryBonus = vehicle.availableAids?.some((aid) => 
    /batterie/i.test(aid.label) || /majoration/i.test(aid.label)
  );

  return !!hasBatteryBonus;
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
 * Calcule le montant de la prime CEE dynamique selon le profil utilisateur et les caractéristiques du véhicule.
 */
export function calculateCeeAid({
  vehicle,
  price,
  profileType,
  householdSize = 1,
  taxIncome = 30000,
}: {
  vehicle: Vehicle;
  price: number | null;
  profileType: UserProfileType;
  householdSize?: number;
  taxIncome?: number;
}): {
  amount: number;
  isEligible: boolean;
  category?: HouseholdCategory;
  isBatteryUE: boolean;
  label: string;
} {
  const isEligible = isVehicleEligibleCEE(vehicle, price);
  const isBatteryUE = isVehicleBatteryUE(vehicle);

  if (!isEligible) {
    return { amount: 0, isEligible: false, isBatteryUE, label: "Non éligible" };
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

    return { amount, isEligible: true, isBatteryUE, label };
  }

  // Particulier (personne physique) -> Coup de Pouce classique ou bonifié
  const category = getHouseholdCategory(householdSize, taxIncome);
  const mode = isBatteryUE ? "bonified" : "classic";
  
  // Custom aids adaptation (e.g. for Kona which has 4800 € / 1200 € instead of standard 6500 € / 2000 €)
  const ceeAid = vehicle.availableAids?.find((aid) => aid.label === "Prime CEE");
  const batteryAid = vehicle.availableAids?.find((aid) => /batterie/i.test(aid.label) || /majoration/i.test(aid.label));
  const customBase = ceeAid ? ceeAid.amount_EUR : 6500;
  const customBattery = batteryAid ? batteryAid.amount_EUR : 2000;

  let amount = PRIME_AMOUNTS[mode][category];

  if (customBase !== 6500 || customBattery !== 2000) {
    const baseFactor = customBase / 6500;
    const batteryFactor = customBattery / 2000;
    const classicAmount = PRIME_AMOUNTS.classic[category] * baseFactor;
    const extraBattery = (PRIME_AMOUNTS.bonified[category] - PRIME_AMOUNTS.classic[category]) * batteryFactor;
    const calculatedAmount = mode === "bonified" ? (classicAmount + extraBattery) : classicAmount;
    const maxAllowed = customBase + (mode === "bonified" ? customBattery : 0);
    amount = Math.round(Math.min(maxAllowed, calculatedAmount));
  }

  const label = isBatteryUE ? "Prime Coup de Pouce bonifié" : "Prime Coup de Pouce classique";

  return {
    amount,
    isEligible: true,
    category,
    isBatteryUE,
    label,
  };
}
