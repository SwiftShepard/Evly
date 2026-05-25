import type { Vehicle } from "@/data/schemas";

/**
 * Pays considérés comme produisant des véhicules avec un score ADEME ≥ 60.
 * Approximation : la localisation d'assemblage est le facteur dominant du score
 * environnemental ADEME, mais le score réel intègre aussi la chaîne batterie
 * et le contenu recyclé. Considérer ces pays comme "compatibles" reste un
 * proxy éditorial, pas une garantie d'éligibilité officielle.
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

/** Plafond de prix pour entrer dans le dispositif (édition 2026). */
export const LEASING_PRICE_CAP_EUR = 47_000;

export type LeasingStatus =
  | "official"            // Constructeur a engagé le modèle dans le programme
  | "ademe-compatible"    // Critères ADEME + prix OK mais pas dans le programme
  | "potential"           // Prix OK mais score ADEME probablement < 60 (hors UE)
  | "not-eligible";       // Hors plafond prix

export interface LeasingStatusInfo {
  status: LeasingStatus;
  label: string;
  tone: "accent" | "warning" | "neutral" | "outline";
  description: string;
}

export const LEASING_LABELS: Record<LeasingStatus, LeasingStatusInfo> = {
  "official": {
    status: "official",
    label: "Éligible officiel",
    tone: "accent",
    description:
      "Engagé par son constructeur dans le programme leasing social (loyers plafonnés à 200 €/mois, sans apport).",
  },
  "ademe-compatible": {
    status: "ademe-compatible",
    label: "Compatible ADEME",
    tone: "warning",
    description:
      "Remplit les critères techniques (prix + score environnemental ADEME ≥ 60) mais le constructeur ne l'a pas intégré au programme.",
  },
  "potential": {
    status: "potential",
    label: "Sous réserve constructeur",
    tone: "outline",
    description:
      "Prix sous le plafond mais production hors UE, score ADEME probablement insuffisant. Activation dépendrait d'une localisation européenne.",
  },
  "not-eligible": {
    status: "not-eligible",
    label: "Hors plafond",
    tone: "neutral",
    description:
      "Prix dépasse le plafond de 47 000 € du dispositif.",
  },
};

export function isEU(country: string): boolean {
  return EU_COUNTRIES.includes(country);
}

export function getLeasingStatus(v: Vehicle): LeasingStatus {
  const cheapest = Math.min(...v.trims.map((t) => t.price_EUR));
  if (v.leasingSocialEligible) return "official";
  if (cheapest > LEASING_PRICE_CAP_EUR) return "not-eligible";
  if (isEU(v.productionCountry)) return "ademe-compatible";
  return "potential";
}
