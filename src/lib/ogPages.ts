import type { PageCardData } from "@/lib/og";
import { getAllVehicles } from "@/lib/vehicles";
import { getBrands } from "@/lib/brands";
import { SEO_YEAR } from "@/lib/seo";

/**
 * Cartes de partage des pages éditoriales et outils, servies sous /og/pages/{clé}.jpg.
 * BaseLayout utilise « accueil » par défaut.
 */
export function getPageCards(): Record<string, PageCardData> {
  const total = getAllVehicles().length;
  const brandCount = getBrands().length;
  return {
    accueil: {
      eyebrow: "Comparateur indépendant",
      title: "Voitures électriques : autonomies réelles et vrais prix",
      subtitle: `${total} modèles comparés, sans publicité ni commission.`,
      vehicles: ["renault-5", "tesla-model-y", "peugeot-e-3008"],
    },
    vehicules: {
      eyebrow: "Catalogue",
      title: `Les ${total} voitures électriques du marché français`,
      subtitle: "Filtrez par budget, autonomie réelle, recharge et aides.",
      vehicles: ["kia-ev3", "vw-id3", "renault-4"],
    },
    comparer: {
      eyebrow: "Comparateur",
      title: "Comparez jusqu'à 4 voitures électriques",
      subtitle: "Autonomie réelle, recharge et prix après aides, côte à côte.",
      vehicles: ["tesla-model-3", "bmw-i4", "hyundai-ioniq-6"],
    },
    simulateur: {
      eyebrow: "Simulateur de coût",
      title: "Électrique ou thermique : le vrai coût sur 1 à 10 ans",
      subtitle: "Énergie, entretien, assurance et revente : tout est compté.",
    },
    "leasing-social": {
      eyebrow: "Leasing social",
      title: `Leasing social ${SEO_YEAR} : les voitures éligibles`,
      subtitle: "Conditions, loyers réels et pièges à éviter.",
      vehicles: ["renault-5", "citroen-e-c3", "fiat-grande-panda"],
    },
    recommandation: {
      eyebrow: "Test en 2 minutes",
      title: "Quelle voiture électrique choisir ?",
      subtitle: "Une recommandation selon vos trajets, votre recharge et votre budget.",
    },
    glossaire: {
      eyebrow: "Glossaire",
      title: "La voiture électrique, sans jargon",
      subtitle: "kWh, WLTP, SoC, V2G, recharge DC : tout expliqué simplement.",
    },
    methodologie: {
      eyebrow: "Méthodologie",
      title: "Comment nous mesurons l'autonomie réelle",
      subtitle: "Sources, protocoles et limites, en toute transparence.",
    },
    "bons-plans": {
      eyebrow: "Bons plans",
      title: "Le même budget, une meilleure voiture électrique",
      subtitle: "Les alternatives qui offrent plus d'autonomie pour le même prix.",
    },
    pro: {
      eyebrow: "Evly Pro",
      title: "Électrifier une flotte d'entreprise, sans pari",
      subtitle: "Coût total, fiscalité et autonomie réelle des véhicules de société.",
    },
    "pro-vehicules": {
      eyebrow: "Utilitaires",
      title: "Utilitaires électriques : prix et autonomie réelle",
      subtitle: "Fourgonnettes, fourgons et ludospaces comparés pour les pros.",
      vehicles: ["renault-kangoo", "ford-e-transit", "renault-master-e-tech"],
    },
    marques: {
      eyebrow: "Marques",
      title: "Toutes les marques de voitures électriques",
      subtitle: `${brandCount} constructeurs, ${total} modèles comparés.`,
      vehicles: ["bmw-i4", "kia-ev6", "volvo-ex30"],
    },
    selections: {
      eyebrow: "Sélections",
      title: "Voitures électriques : nos sélections et classements",
      subtitle: "Pas chères, SUV, 7 places, plus grande autonomie, made in France…",
      vehicles: ["dacia-spring", "kia-ev9", "renault-5"],
    },
  };
}
