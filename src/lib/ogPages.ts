import type { PageCardData } from "@/lib/og";
import { getAllVehicles } from "@/lib/vehicles";
import { getBrands } from "@/lib/brands";
import { SEO_YEAR } from "@/lib/seo";
import { getFleetGap } from "@/lib/rangeGap";

/**
 * Cartes de partage des pages éditoriales et outils, servies sous /og/pages/{clé}.jpg.
 * BaseLayout utilise « accueil » par défaut.
 */
export function getPageCards(): Record<string, PageCardData> {
  const total = getAllVehicles().length;
  const brandCount = getBrands().length;
  const fleet = getFleetGap(getAllVehicles());
  const gapPct = Math.round(fleet.medianPct);
  const gapModels = fleet.models;
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
    "ma-semaine": {
      eyebrow: "Ma semaine",
      title: "Votre semaine en électrique, sur la carte",
      subtitle: "Travail, courses, balades : jusqu'où va la voiture depuis chez vous, même en hiver.",
      vehicles: ["renault-5", "tesla-model-y", "kia-ev3"],
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
      eyebrow: "À prix égal",
      title: "Le même budget, une meilleure voiture électrique",
      subtitle: "Les alternatives qui offrent plus d'autonomie pour le même prix.",
    },
    duels: {
      eyebrow: "Duels",
      title: "Deux voitures électriques face à face",
      subtitle: "Autonomie réelle, prix après aides, recharge et coffre, sur les mêmes mesures.",
      vehicles: ["renault-5", "citroen-e-c3"],
    },
    recharge: {
      eyebrow: "Recharger chez soi",
      title: "Ce que coûte une recharge à la maison",
      subtitle: "Heures creuses, Tempo, borne rapide : modèle par modèle, aux tarifs d'EDF en vigueur.",
      vehicles: ["renault-5", "tesla-model-y", "peugeot-e-208"],
    },
    hiver: {
      eyebrow: "Autonomie en hiver",
      title: "Ce qu'il reste de l'autonomie quand il gèle",
      subtitle: "Tout le catalogue classé par -5 °C, et à la température de votre choix.",
      vehicles: ["tesla-model-y", "kia-ev3", "renault-5"],
    },
    "electrique-ou-essence": {
      eyebrow: "Électrique ou essence",
      title: "Laquelle coûte le moins, modèle par modèle ?",
      subtitle: "Chaque électrique face à sa version essence ou hybride : achat après prime, coût sur 5 ans, rentabilité.",
      vehicles: ["peugeot-e-208", "renault-5", "citroen-e-c3"],
    },
    trajets: {
      eyebrow: "Grands trajets",
      title: "Combien d'arrêts pour Paris → Lyon, le ski, les vacances ?",
      subtitle: "Tous les modèles classés sur les grands axes, arrêts sur les vraies bornes, été et hiver.",
      vehicles: ["tesla-model-3", "renault-5", "kia-ev3"],
    },
    observatoire: {
      eyebrow: "Observatoire",
      title: `L'autonomie réelle : -${gapPct} % sous l'annonce`,
      subtitle: `Écart médian sur ${gapModels} modèles mesurés sur route. Par marque, par modèle, données ouvertes.`,
    },
    nouveautes: {
      eyebrow: "Nouveautés des données",
      title: "Ce qui change dans les fiches",
      subtitle: "Nouveaux modèles, autonomies mesurées sur route, courbes de recharge et prix.",
    },
    aides: {
      eyebrow: "Aides 2026",
      title: "Prime CEE et leasing social : ce que vous touchez",
      subtitle: "Le barème selon vos revenus, les modèles éligibles et le cas des sociétés.",
    },
    pro: {
      eyebrow: "Entreprises",
      title: "Voiture électrique d'entreprise : aides et coût réel",
      subtitle: "Prime CEE, TVS, TVA sur l'électricité et coût total en mode entreprise.",
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
