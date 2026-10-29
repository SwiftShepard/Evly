/**
 * « Électrique ou essence ? » (roadmap M10) : pour chaque modèle électrique qui a un jumeau
 * thermique au catalogue (ou un équivalent direct, comme Renault 5 et Clio), la version thermique
 * comparée, à finition égale autant que possible avec la version électrique d'entrée.
 *
 * Prix catalogue et consommation mixte WLTP relevés sur les fiches techniques de L'argus
 * (largus.fr/fiche-technique/…) à la date de ICE_TWINS_DATE ; la date du tarif est celle que la fiche indique.
 * Chaque consommation a été recoupée avec le CO2 homologué de la même fiche.
 */

import { REAL_WORLD_GAP } from "@/data/fuelPrices";

export interface IceTwin {
  /** Fiche électrique et version comparée (l'entrée de gamme, en général) */
  ev: string;
  evConfig: string;
  /** Adresse de la page : /electrique-ou-essence/{slug}/ */
  slug: string;
  name: string;
  version: string;
  energy: "essence" | "hybride";
  price: number;
  /** Consommation mixte homologuée WLTP (l/100 km) et CO2 (g/km) */
  wltpL100: number;
  co2: number;
  /** Le même modèle en thermique, ou un équivalent d'une autre gamme */
  sameModel: boolean;
  source: string;
  /** Date du tarif sur la fiche (ISO) */
  priceDate: string;
  note?: string;
}

/** Date du relevé des fiches */
export const ICE_TWINS_DATE = "2026-10-28";

const LARGUS = "https://www.largus.fr/fiche-technique/";

export const ICE_TWINS: IceTwin[] = [
  { ev: "peugeot-e-208", evConfig: "peugeot-e-208-style-50", slug: "peugeot-208", name: "Peugeot 208", version: "1.2 Turbo 100 ch Style", energy: "essence", price: 20_500, wltpL100: 5.1, co2: 116, sameModel: true, source: `${LARGUS}Peugeot/208/II/2026/Berline+5+Portes/12+Turbo+100ch+Style-3071514.html`, priceDate: "2026-10-01" },
  { ev: "peugeot-e-2008", evConfig: "peugeot-e-2008-style-54", slug: "peugeot-2008", name: "Peugeot 2008", version: "1.2 Turbo 100 ch Style", energy: "essence", price: 28_600, wltpL100: 5.7, co2: 128, sameModel: true, source: `${LARGUS}Peugeot/2008/II/2026/SUV+5+Portes/12+Turbo+100ch+Style-3019192.html`, priceDate: "2026-03-02" },
  { ev: "peugeot-e-308", evConfig: "peugeot-e-308-berline-style-55", slug: "peugeot-308", name: "Peugeot 308", version: "1.2 Hybrid 145 ch Style e-DCS6", energy: "hybride", price: 33_850, wltpL100: 4.8, co2: 107, sameModel: true, source: `${LARGUS}Peugeot/308/III/2026/Berline+5+Portes/12+Hybrid+145ch+Style+e-DCS6-2970651.html`, priceDate: "2025-09-15" },
  { ev: "peugeot-e-3008", evConfig: "peugeot-e-3008-allure-210-ch-73", slug: "peugeot-3008", name: "Peugeot 3008", version: "Hybrid 145 ch Allure e-DCS6", energy: "hybride", price: 41_300, wltpL100: 5.3, co2: 120, sameModel: true, source: `${LARGUS}Peugeot/3008/III/2026/SUV+5+Portes/12+Hybrid+145ch+Allure+e-DCS6-2932678.html`, priceDate: "2025-03-06" },
  { ev: "peugeot-e-5008", evConfig: "peugeot-e-5008-allure-210-ch-73", slug: "peugeot-5008", name: "Peugeot 5008", version: "Hybrid 145 ch Allure e-DCS6", energy: "hybride", price: 43_100, wltpL100: 5.6, co2: 126, sameModel: true, source: `${LARGUS}Peugeot/5008/III/2026/SUV+5+Portes/Hybrid+145ch+Allure+e-DCS6-2932697.html`, priceDate: "2025-03-06" },
  { ev: "opel-corsa-electric", evConfig: "opel-corsa-electric-edition-50", slug: "opel-corsa", name: "Opel Corsa", version: "1.2 Turbo 100 ch Edition", energy: "essence", price: 21_290, wltpL100: 5.1, co2: 116, sameModel: true, source: `${LARGUS}Opel/Corsa/VI/2026/Berline+5+Portes/12+Turbo+100ch+Edition-2883483.html`, priceDate: "2024-09-02" },
  { ev: "opel-mokka-electric", evConfig: "opel-mokka-electric-edition-50", slug: "opel-mokka", name: "Opel Mokka", version: "1.2 Turbo 136 ch Edition", energy: "essence", price: 26_790, wltpL100: 5.6, co2: 127, sameModel: true, source: `${LARGUS}Opel/Mokka/II/2026/SUV+5+Portes/12+Turbo+136ch+Edition-3012343.html`, priceDate: "2026-02-18" },
  {
    ev: "opel-frontera-electric", evConfig: "opel-frontera-electric-edition-44", slug: "opel-frontera", name: "Opel Frontera", version: "1.2 Turbo Hybrid 110 ch Edition e-DCT6", energy: "hybride", price: 26_990, wltpL100: 5.3, co2: 119, sameModel: true, source: `${LARGUS}Opel/Frontera/II/2026/SUV+5+Portes/12+Turbo+Hybrid+110ch+Edition+e-DCT6-2939394.html`, priceDate: "2025-04-01",
    note: "La fiche de L'argus affiche 5,9 l/100 km, incohérent avec ses 119 g de CO2 : 5,3 l/100 km, valeur des fiches homologuées européennes de la même version.",
  },
  { ev: "citroen-e-c3", evConfig: "citroen-e-c3-you-30", slug: "citroen-c3", name: "Citroën C3", version: "1.2 Turbo 100 ch You", energy: "essence", price: 16_390, wltpL100: 5.5, co2: 125, sameModel: true, source: `${LARGUS}Citroen/C3/IV/2026/Crossover+5+Portes/12+Turbo+100ch+YOU-2885065.html`, priceDate: "2024-09-02" },
  { ev: "citroen-e-c4", evConfig: "citroen-e-c4-you-136", slug: "citroen-c4", name: "Citroën C4", version: "1.2 Hybride 110 ch You e-DCS6", energy: "hybride", price: 30_300, wltpL100: 4.8, co2: 108, sameModel: true, source: `${LARGUS}Citroen/C4/III/2026/Berline+5+Portes/12+Hybride+110ch+YOU+e-DCS6-2940400.html`, priceDate: "2025-04-01" },
  { ev: "fiat-600e", evConfig: "fiat-600e-pop-54", slug: "fiat-600", name: "Fiat 600", version: "1.2 Turbo 100 ch Pop", energy: "essence", price: 23_700, wltpL100: 5.7, co2: 128, sameModel: true, source: `${LARGUS}Fiat/600/I/2026/SUV+5+Portes/12+Turbo+100ch+Pop-3053436.html`, priceDate: "2026-07-02" },
  { ev: "fiat-grande-panda", evConfig: "fiat-grande-panda-pop-44", slug: "fiat-grande-panda", name: "Fiat Grande Panda", version: "1.2 Turbo 100 ch Pop", energy: "essence", price: 16_900, wltpL100: 5.7, co2: 131, sameModel: true, source: `${LARGUS}Fiat/Grande+Panda/I/2026/SUV+5+Portes/12+Turbo+100ch+Pop-2981074.html`, priceDate: "2025-10-08" },
  { ev: "jeep-avenger", evConfig: "jeep-avenger-longitude-54", slug: "jeep-avenger", name: "Jeep Avenger", version: "1.2 Turbo T3 100 ch Longitude", energy: "essence", price: 25_590, wltpL100: 5.6, co2: 127, sameModel: true, source: `${LARGUS}Jeep/Avenger/I/2026/SUV+5+Portes/12+Turbo+T3+100ch+Longitude-3040354.html`, priceDate: "2026-05-13" },
  { ev: "renault-5", evConfig: "renault-5-five-40", slug: "renault-5-ou-clio", name: "Renault Clio", version: "1.2 TCe 115 ch Evolution", energy: "essence", price: 19_900, wltpL100: 5.0, co2: 114, sameModel: false, source: `${LARGUS}Renault/Clio/VI/2026/Berline+5+Portes/12+TCe+115ch+Evolution+-26-3065606.html`, priceDate: "2026-09-01" },
  { ev: "hyundai-kona", evConfig: "hyundai-kona-creative-48", slug: "hyundai-kona", name: "Hyundai Kona", version: "1.6 GDi 138 ch Hybrid Creative DCT-6", energy: "hybride", price: 37_750, wltpL100: 4.6, co2: 104, sameModel: true, source: `${LARGUS}Hyundai/Kona/II/2026/SUV+5+Portes/16+GDi+138ch+Hybrid+Creative+DCT-6-2973552.html`, priceDate: "2025-09-01" },
];

export function getIceTwin(slug: string): IceTwin | undefined {
  return ICE_TWINS.find((t) => t.slug === slug);
}

/** Jumeau thermique d'une fiche électrique (simulateur, fiches) */
export const iceTwinOf = (evSlug: string) => ICE_TWINS.find((t) => t.ev === evSlug);

/** Consommation réelle : l'homologation WLTP plus l'écart mesuré par la Commission européenne, au dixième */
export const realL100 = (t: IceTwin) => Math.round(t.wltpL100 * (1 + REAL_WORLD_GAP.petrol) * 10) / 10;
