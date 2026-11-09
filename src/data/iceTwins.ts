/**
 * « Électrique ou essence ? » (roadmap M10) : pour chaque modèle électrique qui a un jumeau
 * thermique au catalogue (ou un équivalent direct, comme Renault 5 et Clio), la version thermique
 * comparée, à finition égale autant que possible avec la version électrique d'entrée.
 *
 * Prix catalogue et consommation mixte WLTP relevés sur les fiches techniques de L'argus
 * (largus.fr/fiche-technique/…) à la date de ICE_TWINS_DATE ; la date du tarif est celle que la fiche indique.
 * Les versions de la ligne thermique choisie sont celles toujours au catalogue (fiche sans date de fin de
 * commercialisation) ; une fiche sans tarif récent garde le dernier publié, et la page le dit au-delà de deux ans.
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
export const ICE_TWINS_DATE = "2026-11-09";

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
  { ev: "vw-id3", evConfig: "vw-id3-trend-50", slug: "volkswagen-id-3-ou-golf", name: "Volkswagen Golf", version: "1.5 TSI EVO2 116 ch Trend", energy: "essence", price: 31_000, wltpL100: 5.3, co2: 120, sameModel: false, source: `${LARGUS}Volkswagen/Golf/VIII/2026/Berline+5+Portes/15+TSI+EVO2+116ch+Trend-3057743.html`, priceDate: "2026-08-05" },
  { ev: "dacia-spring", evConfig: "dacia-spring-expression", slug: "dacia-spring-ou-sandero", name: "Dacia Sandero", version: "1.0 TCe 100 ch Expression", energy: "essence", price: 16_050, wltpL100: 5.4, co2: 122, sameModel: false, source: `${LARGUS}Dacia/Sandero/III+BJI/2026/Berline+5+Portes/10+TCe+100ch+Expression+-25-2992904.html`, priceDate: "2025-11-21" },
  { ev: "fiat-500e", evConfig: "fiat-500e-pop-24", slug: "fiat-500", name: "Fiat 500", version: "1.0 FireFly 65 ch Hybrid Pop", energy: "hybride", price: 19_400, wltpL100: 5.2, co2: 118, sameModel: true, source: `${LARGUS}Fiat/500/II/2026/Berline+3+Portes/10+FireFly+65ch+hybrid+Pop-2992722.html`, priceDate: "2025-11-21" },
  { ev: "ford-puma-gen-e", evConfig: "ford-puma-gen-e-titanium", slug: "ford-puma", name: "Ford Puma", version: "1.0 EcoBoost Hybrid 125 ch Titanium", energy: "hybride", price: 27_790, wltpL100: 5.3, co2: 120, sameModel: true, source: `${LARGUS}Ford/Puma/II/2026/SUV+5+Portes/10+EcoBoost+Hybrid+125ch+Titanium+S&S-2837732.html`, priceDate: "2024-02-07" },
  { ev: "bmw-ix1", evConfig: "bmw-ix1-edrive20-base", slug: "bmw-x1", name: "BMW X1", version: "sDrive20i 170 ch", energy: "essence", price: 48_050, wltpL100: 5.7, co2: 128, sameModel: true, source: `${LARGUS}Bmw/X1/III+U11/2026/SUV+5+Portes/sDrive20i+170ch-2690811.html`, priceDate: "2022-10-01" },
  { ev: "bmw-ix2", evConfig: "bmw-ix2-edrive20-base", slug: "bmw-x2", name: "BMW X2", version: "sDrive20i 170 ch DKG7", energy: "essence", price: 50_050, wltpL100: 5.7, co2: 128, sameModel: true, source: `${LARGUS}Bmw/X2/II+U10/2026/SUV+5+Portes/sDrive20iA+170ch+DKG7-2800354.html`, priceDate: "2023-10-11" },
  { ev: "bmw-i4", evConfig: "bmw-i4-edrive35-base", slug: "bmw-serie-4-gran-coupe", name: "BMW Série 4 Gran Coupé", version: "420i 184 ch", energy: "essence", price: 56_450, wltpL100: 6.6, co2: 150, sameModel: true, source: `${LARGUS}Bmw/Serie+4+Gran+Coupe/II+G26/2026/Berline+5+Portes/420iA+184ch-2863174.html`, priceDate: "2024-05-22" },
  { ev: "mercedes-cla", evConfig: "mercedes-cla-58-pro", slug: "mercedes-cla", name: "Mercedes CLA", version: "200 163 + 30 ch Progressive Line 8G-eDCT", energy: "hybride", price: 50_250, wltpL100: 4.9, co2: 111, sameModel: true, source: `${LARGUS}Mercedes-Benz/Cla/III+C174-C178/2026/Berline+4+Portes/200+163+30ch+Progressive+Line+8G-eDCT-2986563.html`, priceDate: "2025-11-04" },
  { ev: "mini-cooper", evConfig: "mini-cooper-e-essential", slug: "mini-cooper", name: "Mini Cooper", version: "C 156 ch Essential DKG7", energy: "essence", price: 28_500, wltpL100: 5.9, co2: 133, sameModel: true, source: `${LARGUS}Mini/Cooper+3+Portes/IV+-F66-J01/2026/Berline+3+Portes/C+156ch+Essential+DKG7-2837248.html`, priceDate: "2024-02-07" },
  { ev: "mini-countryman", evConfig: "mini-countryman-e-essential", slug: "mini-countryman", name: "Mini Countryman", version: "C 170 ch Essential DKG7", energy: "essence", price: 38_090, wltpL100: 5.9, co2: 133, sameModel: true, source: `${LARGUS}Mini/Countryman/III+U25/2026/SUV+5+Portes/C+170ch+Essential+DKG7-2804446.html`, priceDate: "2023-11-01" },
  { ev: "volvo-ex40", evConfig: "volvo-ex40-start-sm", slug: "volvo-xc40", name: "Volvo XC40", version: "B3 163 ch Start DCT7", energy: "essence", price: 45_400, wltpL100: 6.6, co2: 149, sameModel: true, source: `${LARGUS}Volvo/Xc40/I/2026/SUV+5+Portes/B3+163ch+Start+DCT+7-3065933.html`, priceDate: "2026-09-10" },
  { ev: "citroen-e-c5-aircross", evConfig: "citroen-e-c5-aircross-you-73", slug: "citroen-c5-aircross", name: "Citroën C5 Aircross", version: "1.2 Hybride 145 ch You, boîte automatique", energy: "hybride", price: 35_990, wltpL100: 5.4, co2: 121, sameModel: true, source: `${LARGUS}Citroen/C5+Aircross/II/2026/SUV+5+Portes/12+Hybride+145ch+YOU+boîte+automatique-2961956.html`, priceDate: "2025-07-17" },
  { ev: "opel-astra", evConfig: "opel-astra-berline-gs-54", slug: "opel-astra", name: "Opel Astra", version: "1.2 Turbo Hybrid 145 ch GS e-DCT6", energy: "hybride", price: 35_690, wltpL100: 4.7, co2: 106, sameModel: true, source: `${LARGUS}Opel/Astra/VI/2026/Berline+5+Portes/12+Turbo+Hybrid+145ch+GS+e-DCT+6-3011522.html`, priceDate: "2026-02-03" },
  { ev: "peugeot-e-408", evConfig: "peugeot-e-408-allure-58", slug: "peugeot-408", name: "Peugeot 408", version: "Hybrid 145 ch Allure e-DCS6", energy: "hybride", price: 39_350, wltpL100: 5.0, co2: 113, sameModel: true, source: `${LARGUS}Peugeot/408/I/2026/Berline+5+Portes/Hybrid+145ch+Allure+e-DCS6-3007059.html`, priceDate: "2026-02-02" },
  { ev: "lancia-ypsilon", evConfig: "lancia-ypsilon-ypsilon", slug: "lancia-ypsilon", name: "Lancia Ypsilon", version: "1.2 Turbo 100 ch", energy: "essence", price: 22_300, wltpL100: 5.2, co2: 119, sameModel: true, source: `${LARGUS}Lancia/Ypsilon/III/2026/Berline+5+Portes/12+Turbo+100ch-3037825.html`, priceDate: "2026-04-07" },
  { ev: "alfa-romeo-junior", evConfig: "alfa-romeo-junior-junior", slug: "alfa-romeo-junior", name: "Alfa Romeo Junior", version: "1.2 Ibrida 145 ch e-DCT6", energy: "hybride", price: 30_500, wltpL100: 4.8, co2: 108, sameModel: true, source: `${LARGUS}Alfa-Romeo/Junior/I/2026/SUV+5+Portes/12+Ibrida+145ch+e-DCT6-3002211.html`, priceDate: "2026-01-09" },
  { ev: "hyundai-kona", evConfig: "hyundai-kona-creative-48", slug: "hyundai-kona", name: "Hyundai Kona", version: "1.6 GDi 138 ch Hybrid Creative DCT-6", energy: "hybride", price: 37_750, wltpL100: 4.6, co2: 104, sameModel: true, source: `${LARGUS}Hyundai/Kona/II/2026/SUV+5+Portes/16+GDi+138ch+Hybrid+Creative+DCT-6-2973552.html`, priceDate: "2025-09-01" },
];

export function getIceTwin(slug: string): IceTwin | undefined {
  return ICE_TWINS.find((t) => t.slug === slug);
}

/** Jumeau thermique d'une fiche électrique (simulateur, fiches) */
export const iceTwinOf = (evSlug: string) => ICE_TWINS.find((t) => t.ev === evSlug);

/** Consommation réelle : l'homologation WLTP plus l'écart mesuré par la Commission européenne, au dixième */
export const realL100 = (t: IceTwin) => Math.round(t.wltpL100 * (1 + REAL_WORLD_GAP.petrol) * 10) / 10;
