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

/**
 * Catégories du coup de pouce « véhicules particuliers électriques » depuis le 1er septembre 2026
 * (arrêté du 16 juillet 2026, fiche TRA-EQ-117) : revenu fiscal de référence par part.
 * « gros_rouleur » : déciles 6 à 8, plus de 12 000 km par an pour le travail avec sa voiture.
 */
export type HouseholdCategory = "precarite" | "modeste" | "gros_rouleur" | "autres";

/** Plafonds de revenu fiscal de référence par part (déciles 3, 5 et 8) */
export const RFR_PART_CEILINGS = {
  precarite: 11_250,
  modeste: 16_880,
  gros_rouleur: 27_310,
};

/** Kilométrage professionnel annuel à dépasser pour la catégorie « gros rouleur » */
export const GROS_ROULEUR_KM = 12_000;
/** La catégorie « gros rouleur » vaut pour les achats engagés avant cette date */
export const GROS_ROULEUR_UNTIL = new Date("2027-01-01T00:00:00+01:00");
export const grosRouleurOpen = (now = new Date()) => now < GROS_ROULEUR_UNTIL;

/**
 * La réglementation fixe un coefficient par catégorie, pas un montant : la prime dépend du prix
 * auquel l'organisme qui la verse valorise ses certificats. Grille de référence : l'offre complète
 * publiée pour les achats d'octobre 2026 (Renault). Coefficient plus élevé (environ +1/3) quand la
 * voiture et sa batterie sont produites dans l'Espace économique européen.
 * Même grille partout (fiche, catalogue, comparateur, matcher, simulateurs) ; à mettre à jour ici.
 */
export const PRIME_GRID: Record<"standard" | "europe", Record<HouseholdCategory, number>> = {
  standard: { precarite: 7070, modeste: 6030, gros_rouleur: 6030, autres: 3620 },
  europe: { precarite: 9420, modeste: 8050, gros_rouleur: 8050, autres: 4830 },
};
export const CEE_GRID_LABEL = "offre publiée pour les achats d'octobre 2026";

/** Prime de tout ménage, voiture non produite en Europe : celle des prix « après aides » génériques */
export const CEE_BASE_EUR = PRIME_GRID.standard.autres;
/** Prime la plus haute (ménage en précarité), voiture non produite en Europe */
export const CEE_MAX_EUR = PRIME_GRID.standard.precarite;
/** Prime la plus haute, voiture et batterie produites en Europe */
export const CEE_MAX_EUROPE_EUR = PRIME_GRID.europe.precarite;

export const HOUSEHOLD_LABELS: Record<HouseholdCategory, string> = {
  precarite: "Ménage en précarité",
  modeste: "Ménage modeste",
  gros_rouleur: "Gros rouleur",
  autres: "Autres ménages",
};

/** Condition de revenu affichée avec chaque catégorie */
export const HOUSEHOLD_CONDITIONS: Record<HouseholdCategory, string> = {
  precarite: `revenu fiscal ≤ ${RFR_PART_CEILINGS.precarite.toLocaleString("fr-FR")} € par part`,
  modeste: `revenu fiscal ≤ ${RFR_PART_CEILINGS.modeste.toLocaleString("fr-FR")} € par part`,
  gros_rouleur: `≤ ${RFR_PART_CEILINGS.gros_rouleur.toLocaleString("fr-FR")} € par part et plus de ${GROS_ROULEUR_KM.toLocaleString("fr-FR")} km/an pour le travail, achat avant 2027`,
  autres: "sans condition de revenu",
};

/** Personnes morales (sociétés, collectivités, loueurs, associations) : même grille de référence */
export const MORAL_PERSON_PRIME_EUR = 600;

/**
 * Production européenne (voiture et batterie dans l'EEE) :
 * - « confirmed » : annoncée par le constructeur pour son offre (Renault : Mégane et Scénic ;
 *   DS : N°7, assemblé à Melfi avec une batterie française, prime de 4 800 € affichée en octobre 2026) ;
 * - « possible » : signalée dans la fiche (aide « Majoration »), non confirmée, jamais déduite ;
 * - « no » : rien de signalé.
 */
const EUROPE_CONFIRMED = new Set(["renault-megane", "renault-megane-2026", "renault-scenic", "ds-n7"]);
export type EuropeStatus = "confirmed" | "possible" | "no";

export function europeStatus(vehicle: Vehicle): EuropeStatus {
  if (EUROPE_CONFIRMED.has(vehicle.slug)) return "confirmed";
  return vehicle.availableAids?.some((aid) => /batterie|majoration/i.test(aid.label)) ? "possible" : "no";
}

/** Prime d'une catégorie pour ce modèle (grille Europe seulement si la production est confirmée) */
export function primeFor(vehicle: Vehicle, category: HouseholdCategory): number {
  return PRIME_GRID[europeStatus(vehicle) === "confirmed" ? "europe" : "standard"][category];
}

/** Grille de la prime d'une version éligible (« europe » si la production est confirmée), null sinon : pour « votre prix » (lib/myPrime) */
export function primeGridOf(vehicle: Vehicle, price: number | null): "standard" | "europe" | null {
  if (!isVehicleEligibleCEE(vehicle, price)) return null;
  return europeStatus(vehicle) === "confirmed" ? "europe" : "standard";
}

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
 * Prime CEE d'une version sans profil fiscal : `base` (tout ménage), `max` (ménage en précarité),
 * `europeMax` (précarité si la production européenne, seulement possible, se confirme).
 */
export function ceeRange(
  vehicle: Vehicle,
  price: number | null
): { base: number; max: number; europeMax: number | null } | null {
  if (!isVehicleEligibleCEE(vehicle, price)) return null;
  return {
    base: primeFor(vehicle, "autres"),
    max: primeFor(vehicle, "precarite"),
    europeMax: europeStatus(vehicle) === "possible" ? PRIME_GRID.europe.precarite : null,
  };
}

/**
 * Catégorie du foyer d'après le revenu fiscal de référence et le nombre de parts.
 */
export function getHouseholdCategory(taxIncome: number, taxParts: number, bigCommuter = false, now = new Date()): HouseholdCategory {
  const perPart = taxIncome / Math.max(1, taxParts);
  if (perPart <= RFR_PART_CEILINGS.precarite) return "precarite";
  if (perPart <= RFR_PART_CEILINGS.modeste) return "modeste";
  if (bigCommuter && perPart <= RFR_PART_CEILINGS.gros_rouleur && grosRouleurOpen(now)) return "gros_rouleur";
  return "autres";
}

/**
 * Calcule le montant de la prime CEE selon le profil et la version. `category` force la catégorie
 * (profil non renseigné, réponse du matcher).
 */
export function calculateCeeAid({
  vehicle,
  price,
  profileType,
  taxIncome = 30000,
  taxParts = 1,
  bigCommuter = false,
  category: forcedCategory,
}: {
  vehicle: Vehicle;
  price: number | null;
  profileType: UserProfileType;
  taxIncome?: number;
  taxParts?: number;
  bigCommuter?: boolean;
  category?: HouseholdCategory;
}): {
  amount: number;
  isEligible: boolean;
  category?: HouseholdCategory;
  /** Production européenne du modèle (« possible » : prime plus élevée à confirmer, non comprise) */
  europe: EuropeStatus;
  label: string;
} {
  const isEligible = isVehicleEligibleCEE(vehicle, price);
  const europe = europeStatus(vehicle);

  if (!isEligible) {
    return { amount: 0, isEligible: false, europe, label: "Non éligible" };
  }

  if (profileType !== "particular") {
    return { amount: MORAL_PERSON_PRIME_EUR, isEligible: true, europe, label: "Prime CEE personne morale" };
  }

  const category = forcedCategory ?? getHouseholdCategory(taxIncome, taxParts, bigCommuter);
  return { amount: primeFor(vehicle, category), isEligible: true, category, europe, label: "Coup de pouce CEE" };
}

/**
 * Prime CEE d'une version pour le profil du visiteur : sans profil renseigné, la prime de tout
 * ménage (même chiffre que la fiche et le catalogue).
 */
export function ceeForProfile(
  vehicle: Vehicle,
  price: number | null,
  profile: { profileType: UserProfileType; taxIncome: number; taxParts: number; bigCommuter: boolean; hasConfigured: boolean }
) {
  return profile.hasConfigured
    ? calculateCeeAid({
        vehicle,
        price,
        profileType: profile.profileType,
        taxIncome: profile.taxIncome,
        taxParts: profile.taxParts,
        bigCommuter: profile.bigCommuter,
      })
    : calculateCeeAid({ vehicle, price, profileType: "particular", category: "autres" });
}
