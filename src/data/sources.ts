/**
 * Registre central des sources d'Evly.
 *
 * Chaque source documente un éditeur (tester, magazine, constructeur,
 * agrégateur, source réglementaire). Les fiches véhicule référencent
 * ces sources par leur `id` court, soit via `vehicle.sources`, soit
 * via `vehicle.rangeTests[].sourceId`.
 *
 * Niveau de confiance :
 *   - high   : tester reconnu avec protocole documenté + reproductible
 *   - medium : presse VE professionnelle ou constructeur officiel
 *   - low    : source à vérifier ou peu documentée
 */

export type SourceType =
  | "tester"
  | "magazine"
  | "manufacturer"
  | "aggregator"
  | "regulatory";

export type TrustLevel = "high" | "medium" | "low";

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  description: string;
  protocolUrl: string | null;
  trustLevel: TrustLevel;
}

export const SOURCES: Record<string, Source> = {
  nyland: {
    id: "nyland",
    name: "Bjørn Nyland",
    type: "tester",
    url: "https://www.youtube.com/@bjornnyland",
    description:
      "Tester norvégien, référence mondiale du test VE indépendant. Protocoles publics reconnus : range test à 90 et 120 km/h, 1000 km challenge, banana box test pour le volume utile, capacité réelle batterie.",
    protocolUrl: "https://docs.google.com/spreadsheets/d/1upor1bSinLP0d7DAjEMyVMBSr-X-bUegmM3OvCqfdT0",
    trustLevel: "high",
  },
  evkx: {
    id: "evkx",
    name: "EVKX",
    type: "aggregator",
    url: "https://evkx.net",
    description:
      "Agrégateur scandinave de fiches techniques détaillées, avec courbes de charge mesurées et analyse efficience par condition. Recoupements systématiques avec les tests Nyland.",
    protocolUrl: null,
    trustLevel: "high",
  },
  arenaev: {
    id: "arenaev",
    name: "ArenaEV",
    type: "magazine",
    url: "https://www.arenaev.com",
    description:
      "Tests range structurés par tranches de vitesse (60, 90, 130 km/h) sur banc d'essai contrôlé. Méthodologie reproductible et résultats comparables entre modèles.",
    protocolUrl: null,
    trustLevel: "high",
  },
  "insideevs-de": {
    id: "insideevs-de",
    name: "InsideEVs Allemagne",
    type: "magazine",
    url: "https://insideevs.de",
    description:
      "Édition allemande d'InsideEVs. Relais et contextualisation des tests Nyland avec analyse complémentaire (efficience, comparaison segmentaire).",
    protocolUrl: null,
    trustLevel: "high",
  },
  caradisiac: {
    id: "caradisiac",
    name: "Caradisiac",
    type: "magazine",
    url: "https://www.caradisiac.com",
    description:
      "Presse auto généraliste française. Essais structurés sur parcours mixtes réels. Protocole non publié mais consistance temporelle sur les conditions de mesure.",
    protocolUrl: null,
    trustLevel: "medium",
  },
  "automobile-propre": {
    id: "automobile-propre",
    name: "Automobile Propre",
    type: "magazine",
    url: "https://www.automobile-propre.com",
    description:
      "Presse VE française spécialisée. Supertests détaillés : conso autoroutière à 130, recharge réelle, comportement hiver. Sources les plus fiables côté FR.",
    protocolUrl: "https://www.automobile-propre.com/supertest-vehicule-electrique/",
    trustLevel: "high",
  },
  largus: {
    id: "largus",
    name: "L'Argus",
    type: "magazine",
    url: "https://www.largus.fr",
    description:
      "Presse auto de référence en France. Essais classiques avec données d'autonomie et de recharge sur parcours imposés.",
    protocolUrl: null,
    trustLevel: "medium",
  },
  touring: {
    id: "touring",
    name: "Touring (Belgique)",
    type: "magazine",
    url: "https://www.touring.be",
    description:
      "Magazine du Touring Club belge. Tests menés en conditions belges proches du contexte français (climat tempéré, autoroutes 120 km/h).",
    protocolUrl: null,
    trustLevel: "medium",
  },
  "actua-auto": {
    id: "actua-auto",
    name: "Actua Auto",
    type: "magazine",
    url: "https://www.actua-auto.com",
    description:
      "Magazine VE en ligne français. Essais terrain sur parcours mixtes urbain et périurbain.",
    protocolUrl: null,
    trustLevel: "medium",
  },
  "kia-fr": {
    id: "kia-fr",
    name: "Kia France",
    type: "manufacturer",
    url: "https://www.kia.com/fr",
    description:
      "Données constructeur officielles : fiches techniques, garanties, prix catalogue, finitions. Officiel mais à recouper systématiquement avec les mesures terrain.",
    protocolUrl: null,
    trustLevel: "medium",
  },
  "gouv-fr-aides": {
    id: "gouv-fr-aides",
    name: "Service-Public.fr",
    type: "regulatory",
    url: "https://www.service-public.fr",
    description:
      "Source réglementaire officielle pour les dispositifs d'aide à l'achat (Prime CEE, prime à la conversion, leasing social).",
    protocolUrl: null,
    trustLevel: "high",
  },
  "la-chaine-ev": {
    id: "la-chaine-ev",
    name: "La Chaîne EV",
    type: "magazine",
    url: "https://www.lachaineev.com",
    description:
      "Magazine VE en ligne français et chaîne YouTube. Tests pratiques extrêmement pointus sur parcours réels avec focus autonomie, protocole de charge détaillé et analyse d'efficience très précise.",
    protocolUrl: "https://www.lachaineev.com",
    trustLevel: "high",
  },
  "renault-fr": {
    id: "renault-fr",
    name: "Renault France",
    type: "manufacturer",
    url: "https://www.renault.fr",
    description:
      "Données constructeur officielles : fiches techniques, garanties, prix catalogue, finitions. À recouper avec les mesures terrain pour les données d'autonomie réelle.",
    protocolUrl: null,
    trustLevel: "medium",
  },
  "genesis-fr": {
    id: "genesis-fr",
    name: "Genesis France",
    type: "manufacturer",
    url: "https://www.genesis.com/fr",
    description:
      "Données constructeur officielles : fiches techniques, garanties, prix catalogue, finitions. À recouper avec les mesures terrain pour les données d'autonomie réelle.",
    protocolUrl: null,
    trustLevel: "medium",
  },
};

export function getSource(id: string): Source | undefined {
  return SOURCES[id];
}

export function getSources(ids: string[]): Source[] {
  return ids
    .map((id) => SOURCES[id])
    .filter((source): source is Source => source !== undefined);
}

export function allSources(): Source[] {
  return Object.values(SOURCES);
}
