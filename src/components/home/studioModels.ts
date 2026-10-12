/**
 * Modèles connus de l'accueil : le carrousel du hero et les onglets « Lu sur la règle »
 * de TripStudio, synchronisés par l'événement STUDIO_EVENT (détail : { index, source }).
 */
export const STUDIO_MODELS: [slug: string, label: string][] = [
  ["renault-5", "Renault 5"],
  ["tesla-model-y", "Model Y"],
  ["kia-ev3", "Kia EV3"],
  ["peugeot-e-208", "e-208"],
];

export const STUDIO_EVENT = "studio-model";

export interface StudioModelDetail {
  index: number;
  source: "hero" | "studio";
}
