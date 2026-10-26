/**
 * Duels « X vs Y » (roadmap E10) : les comparaisons que les acheteurs tapent dans un moteur
 * de recherche, une page statique chacune (/comparer/x-vs-y/). Le modèle le plus recherché
 * en premier : il donne l'ordre de l'URL et du titre. Tout le contenu de la page est calculé
 * depuis les fiches (src/lib/duel.ts) ; ajouter une paire suffit. Les paires « à prix égal »
 * (ex-bons plans, src/lib/valueComparisons.ts) s'y ajoutent au build (lib/duel, duelPairs).
 */
export const DUEL_GROUPS: { label: string; pairs: [string, string][] }[] = [
  {
    label: "Citadines",
    pairs: [
      ["renault-5", "citroen-e-c3"],
      ["renault-5", "peugeot-e-208"],
      ["renault-5", "mini-cooper"],
      ["renault-5", "fiat-grande-panda"],
      ["renault-5", "byd-dolphin-surf"],
      ["renault-5", "alpine-a290"],
      ["renault-5", "renault-twingo"],
      ["renault-5", "nissan-micra"],
      ["renault-5", "hyundai-inster"],
      ["renault-5", "vw-id2"],
      ["citroen-e-c3", "fiat-grande-panda"],
      ["citroen-e-c3", "dacia-spring"],
      ["dacia-spring", "renault-twingo"],
      ["dacia-spring", "byd-dolphin-surf"],
      ["renault-twingo", "leapmotor-t03"],
      ["renault-twingo", "hyundai-inster"],
      ["peugeot-e-208", "opel-corsa-electric"],
      ["alpine-a290", "mini-cooper"],
    ],
  },
  {
    label: "Petits SUV",
    pairs: [
      ["renault-4", "renault-5"],
      ["renault-4", "peugeot-e-2008"],
      ["renault-4", "kia-ev3"],
      ["renault-4", "skoda-epiq"],
      ["peugeot-e-2008", "jeep-avenger"],
      ["peugeot-e-2008", "opel-mokka-electric"],
      ["peugeot-e-2008", "hyundai-kona"],
      ["jeep-avenger", "fiat-600e"],
      ["volvo-ex30", "mini-aceman"],
      ["volvo-ex30", "smart-1"],
      ["kia-ev3", "skoda-elroq"],
      ["kia-ev3", "volvo-ex30"],
      ["kia-ev3", "hyundai-kona"],
    ],
  },
  {
    label: "Compactes",
    pairs: [
      ["renault-megane-2026", "vw-id3"],
      ["renault-megane-2026", "nissan-leaf"],
      ["kia-ev4", "vw-id3"],
      ["vw-id3", "mg-mg4"],
      ["vw-id3", "cupra-born"],
      ["mg-mg4", "byd-dolphin"],
      ["skoda-elroq", "vw-id3"],
    ],
  },
  {
    label: "SUV familiaux",
    pairs: [
      ["tesla-model-y", "skoda-enyaq"],
      ["tesla-model-y", "vw-id4"],
      ["tesla-model-y", "hyundai-ioniq-5"],
      ["tesla-model-y", "kia-ev6"],
      ["tesla-model-y", "renault-scenic"],
      ["tesla-model-y", "peugeot-e-3008"],
      ["tesla-model-y", "bmw-ix3-neue-klasse"],
      ["tesla-model-y", "polestar-4"],
      ["tesla-model-y", "byd-seal-u"],
      ["peugeot-e-3008", "renault-scenic"],
      ["peugeot-e-3008", "citroen-e-c5-aircross"],
      ["renault-scenic", "skoda-enyaq"],
      ["skoda-elroq", "skoda-enyaq"],
      ["hyundai-ioniq-5", "kia-ev6"],
      ["kia-ev9", "hyundai-ioniq-9"],
    ],
  },
  {
    label: "Berlines",
    pairs: [
      ["tesla-model-3", "tesla-model-y"],
      ["tesla-model-3", "bmw-i4"],
      ["tesla-model-3", "mercedes-cla"],
      ["tesla-model-3", "byd-seal"],
      ["tesla-model-3", "polestar-2"],
      ["tesla-model-3", "vw-id7"],
    ],
  },
  {
    label: "Ludospaces et vans",
    pairs: [
      ["renault-kangoo", "citroen-e-berlingo"],
      ["vw-id-buzz", "peugeot-e-traveller"],
    ],
  },
];

export const DUELS: [string, string][] = DUEL_GROUPS.flatMap((g) => g.pairs);

export const duelSlug = (a: string, b: string) => `${a}-vs-${b}`;
