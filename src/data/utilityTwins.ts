/**
 * Familles de jumeaux : le même véhicule vendu sous plusieurs marques (ou en deux longueurs, ou en
 * fourgon et en passagers). Écrites à la main, comme les duels recherchés : une ressemblance de
 * fiche technique ne suffit pas à prouver une base commune. Sert lib/utilityNumbers (roadmap G16).
 *
 * `what` complète « partage sa base avec … » : ce qui est commun, sans code de plateforme.
 */
export interface TwinGroup {
  what: string;
  slugs: string[];
}

export const TWIN_GROUPS: TwinGroup[] = [
  {
    what: "le grand fourgon conçu par Stellantis sur la base du Fiat Ducato",
    slugs: ["fiat-e-ducato", "peugeot-e-boxer", "citroen-e-jumper", "opel-movano-e", "toyota-proace-max-electric"],
  },
  {
    what: "le fourgon compact conçu par Stellantis",
    slugs: ["citroen-e-jumpy", "fiat-e-scudo", "toyota-proace-electric"],
  },
  {
    what: "le fourgon compact de Stellantis en version passagers",
    slugs: ["peugeot-e-traveller", "citroen-e-spacetourer", "opel-vivaro-e-life", "peugeot-e-expert-combi"],
  },
  {
    what: "le ludospace conçu par Stellantis",
    slugs: ["citroen-e-berlingo", "peugeot-e-rifter", "opel-combo-e-life", "toyota-proace-city"],
  },
  {
    what: "le même véhicule, en fourgon ou en version passagers",
    slugs: ["kia-pv5-cargo", "kia-pv5-passenger"],
  },
  {
    what: "le même ludospace, en version courte ou longue à 7 places",
    slugs: ["renault-kangoo", "renault-grand-kangoo"],
  },
];
