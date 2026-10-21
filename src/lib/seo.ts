import type { Vehicle } from "@/data/schemas";
import { formatNumber, formatPrice } from "@/lib/format";
import { isVehicleEligibleCEE, primeFor } from "@/lib/cee";
import { isMeasured } from "@/lib/confidence";

/**
 * SEO des fiches véhicules : noms recherchés, titres, descriptions et textes
 * générés depuis les données. Tout ce qui est écrit ici doit rester vrai pour
 * chaque fiche : on ne dit « mesurée » que si la mesure existe, on ne cite un
 * prix que s'il est communiqué.
 */

export const SEO_YEAR = new Date().getFullYear();

/* ── Noms ─────────────────────────────────────────────────────────────── */

/** « Renault 5 E-Tech », « MG4 » (le modèle contient déjà la marque), « Smart #1 ». */
export function getVehicleName(v: Vehicle): string {
  return v.model.toLowerCase().startsWith(v.brand.toLowerCase()) ? v.model : `${v.brand} ${v.model}`;
}

// Noms que les gens tapent vraiment dans Google quand ils diffèrent du nom officiel
const MANUAL_ALIASES: Record<string, string[]> = {
  "renault-5": ["R5 électrique", "Renault 5 électrique"],
  "renault-4": ["R4 électrique", "Renault 4 électrique"],
  "renault-twingo": ["Twingo électrique"],
  "renault-megane": ["Mégane électrique"],
  "renault-megane-2026": ["Mégane électrique"],
  "renault-scenic": ["Scénic électrique"],
  "renault-kangoo": ["Kangoo électrique"],
  "renault-grand-kangoo": ["Grand Kangoo électrique"],
  "citroen-e-c3": ["Citroën C3 électrique", "ë-C3 Aircross"],
  "citroen-e-c4": ["Citroën C4 électrique"],
  "citroen-e-c5-aircross": ["Citroën C5 Aircross électrique"],
  "citroen-e-berlingo": ["Berlingo électrique"],
  "fiat-500e": ["Fiat 500 électrique"],
  "fiat-600e": ["Fiat 600 électrique"],
  "fiat-grande-panda": ["Grande Panda électrique"],
  "mini-cooper": ["Mini électrique", "Mini Cooper SE"],
  "mini-countryman": ["Countryman électrique"],
  "vw-id3": ["ID3"],
  "vw-id4": ["ID4"],
  "vw-id5": ["ID5"],
  "vw-id7": ["ID7"],
  "vw-id-buzz": ["ID Buzz", "Combi électrique Volkswagen"],
  "vw-id2": ["ID.2all", "Polo électrique"],
  "vw-id-cross": ["ID Cross"],
  "hyundai-kona": ["Kona électrique"],
  "hyundai-ioniq-5": ["Ioniq5"],
  "hyundai-ioniq-6": ["Ioniq6"],
  "mg-mg4": ["MG 4"],
  "skoda-enyaq": ["Enyaq iV"],
  "bmw-i3-neue-klasse": ["BMW i3 2026"],
  "bmw-ix3-neue-klasse": ["BMW iX3 2026"],
  "mercedes-cla": ["Mercedes CLA électrique"],
  "mercedes-glc": ["Mercedes GLC électrique"],
  "mercedes-glb": ["Mercedes GLB électrique"],
  "mercedes-classe-g": ["Classe G électrique", "G 580"],
  "porsche-macan-electric": ["Macan électrique"],
  "nissan-micra": ["Micra électrique"],
  "nissan-leaf": ["Leaf électrique"],
  "lancia-ypsilon": ["Ypsilon électrique"],
  "jeep-avenger": ["Avenger électrique"],
  "peugeot-e-308": ["Peugeot 308 électrique", "Peugeot E-308 SW"],
};

/**
 * Autres noms sous lesquels un modèle est cherché (« R5 électrique »,
 * « Peugeot 208 électrique », « Opel Corsa électrique »). Le premier est le plus courant.
 */
export function getVehicleAliases(v: Vehicle): string[] {
  const name = getVehicleName(v);
  const derived: string[] = [];
  const m = v.model;
  if (/\bE-Tech\b/i.test(m)) derived.push(`${v.brand} ${m.replace(/\s*E-Tech\b/i, "").trim()} électrique`);
  // « E-208 », « ë-C3 », « e-Jumper » ; pas « e-tron GT »
  if (/^[EeëË]-(?=[A-Z0-9])/.test(m)) derived.push(`${v.brand} ${m.replace(/^[EeëË]-/, "").trim()} électrique`);
  if (/\bElectric$/i.test(m)) derived.push(`${v.brand} ${m.replace(/\s*Electric$/i, "").trim()} électrique`);
  const all = [...(MANUAL_ALIASES[v.slug] ?? []), ...derived];
  const seen = new Set([name.toLowerCase()]);
  return all.filter((a) => {
    const key = a.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Noms qui disent déjà « électrique » : inutile de le répéter dans le titre
const EV_NAME_MARKER =
  /\b(electric|electrified|électrique|e-tech|e-tron|gen-e|edeliver|ev\d*|eq[a-z]{0,2}|ioniq|id\.\s?\w+|bz4x|500e|600e)\b|(^|\s)[eë]-|\bi[x\d]|^(tesla|polestar|zeekr|nio|xpeng|xiaomi|byd)\b/i;

function needsElectricSuffix(v: Vehicle): boolean {
  return !EV_NAME_MARKER.test(getVehicleName(v));
}

/* ── Grammaire ────────────────────────────────────────────────────────── */

const UTILITY_BODY = /fourgon|ludospace|monospace|combi/i;

/** Les utilitaires et monospaces sont masculins (« le Kangoo »), les voitures féminines (« la Renault 5 »). */
export function isMasculine(v: Vehicle): boolean {
  return UTILITY_BODY.test(v.bodyType);
}

const startsWithVowel = (s: string) => /^[aeiouyéèêàâîôûAEIOUYÉÈÊÀÂÎÔÛ]/.test(s);

/** « la Renault 5 E-Tech », « l'Audi Q4 e-tron », « le Renault Kangoo E-Tech ». */
export function withArticle(v: Vehicle, capitalize = false): string {
  const name = getVehicleName(v);
  const art = startsWithVowel(name) ? "l'" : isMasculine(v) ? "le " : "la ";
  const s = `${art}${name}`;
  return capitalize ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** « de la Renault 5 E-Tech », « de l'Audi Q4 e-tron », « du Renault Kangoo E-Tech ». */
export function withDe(v: Vehicle): string {
  const name = getVehicleName(v);
  if (startsWithVowel(name)) return `de l'${name}`;
  return isMasculine(v) ? `du ${name}` : `de la ${name}`;
}

/** Accord du participe : « vendue » / « vendu ». */
export function agree(v: Vehicle, word: string): string {
  return isMasculine(v) ? word : `${word}e`;
}

const COUNTRY_PREPOSITION: Record<string, string> = {
  "Japon": "au Japon",
  "Mexique": "au Mexique",
  "Portugal": "au Portugal",
  "Maroc": "au Maroc",
  "Royaume-Uni": "au Royaume-Uni",
  "USA": "aux États-Unis",
  "États-Unis": "aux États-Unis",
  "Corée": "en Corée du Sud",
  "Rép. Tchèque": "en République tchèque",
};

/** « en France », « au Japon », « aux États-Unis ». */
export function inCountry(country: string): string {
  return COUNTRY_PREPOSITION[country] ?? `en ${country}`;
}

/* ── Catégorie de carrosserie ─────────────────────────────────────────── */

export type BodyCategory =
  | "citadine"
  | "compacte"
  | "berline"
  | "suv"
  | "break"
  | "monospace"
  | "utilitaire"
  | "sportive"
  | "quadricycle";

export interface BodyInfo {
  category: BodyCategory;
  /** Nom commun au singulier, sans article : « citadine », « SUV familial » */
  noun: string;
  /** Genre du nom commun (« une citadine », « un SUV ») */
  feminine: boolean;
}

/** Lecture normalisée des carrosseries hétérogènes des fiches (« Hatchback 5 portes », « SUV Crossover Fastback »…). */
export function getBodyInfo(v: Vehicle): BodyInfo {
  const b = v.bodyType.toLowerCase();
  const seg = v.segment.trim().charAt(0).toUpperCase();
  const small = seg === "A" || seg === "B";

  if (b.includes("quadricycle")) return { category: "quadricycle", noun: "quadricycle", feminine: false };
  if (b.includes("fourgonnette")) return { category: "utilitaire", noun: "fourgonnette", feminine: true };
  if (b.includes("fourgon")) return { category: "utilitaire", noun: "fourgon", feminine: false };
  if (b.includes("combi")) return { category: "monospace", noun: "combi", feminine: false };
  if (b.includes("ludospace")) return { category: "monospace", noun: b.includes("7 places") ? "ludospace 7 places" : "ludospace", feminine: false };
  if (b.includes("monospace")) return { category: "monospace", noun: "monospace", feminine: false };
  if (b.includes("roadster")) return { category: "sportive", noun: "roadster", feminine: false };
  if (b.includes("tout-terrain")) return { category: "suv", noun: "tout-terrain", feminine: false };
  if (b.includes("shooting brake")) return { category: "break", noun: "shooting brake", feminine: false };
  if (b.includes("break")) return { category: "break", noun: "break", feminine: false };
  if (b.includes("citadine")) return { category: "citadine", noun: "citadine", feminine: true };
  if (b.includes("suv") || b.includes("crossover")) {
    let noun: string;
    if (b.includes("7 places")) noun = "SUV 7 places";
    else if (/coup|fastback/.test(b)) noun = "SUV coupé";
    else if (b.includes("grand")) noun = "grand SUV";
    else if (b.includes("familial")) noun = b.includes("crossover") ? "crossover familial" : "SUV familial";
    else if (b.includes("compact")) noun = "SUV compact";
    else if (/urbain|mini/.test(b)) noun = b.includes("crossover") ? "crossover urbain" : "SUV urbain";
    else if (!b.includes("suv")) noun = "crossover";
    else noun = small ? "SUV urbain" : seg === "C" ? "SUV compact" : seg === "D" ? "SUV familial" : "grand SUV";
    return { category: "suv", noun, feminine: false };
  }
  if (b.includes("fastback")) return { category: "berline", noun: "berline fastback", feminine: true };
  if (b.includes("berline compacte")) return { category: "compacte", noun: "compacte", feminine: true };
  if (b.includes("berline")) {
    return { category: "berline", noun: b.includes("grande") || seg === "F" ? "grande berline" : "berline", feminine: true };
  }
  if (small) return { category: "citadine", noun: "citadine", feminine: true };
  if (seg === "C") return { category: "compacte", noun: "compacte", feminine: true };
  return { category: "berline", noun: "berline", feminine: true };
}

/* ── Disponibilité ────────────────────────────────────────────────────── */

export type MarketStatus = "available" | "preorder" | "upcoming" | "discontinued";

export function getMarketStatus(v: Vehicle): MarketStatus {
  const m = v.marketAvailability.toLowerCase();
  if (/plus commercialis|retir|remplac/.test(m)) return "discontinued";
  if (/à venir|a venir/.test(m)) return "upcoming";
  if (/commandes/.test(m) && !/livraisons depuis/.test(m)) return /livraisons/.test(m) && !/2027/.test(m) ? "preorder" : "upcoming";
  return "available";
}

/* ── Chiffres clés agrégés ────────────────────────────────────────────── */

export interface VehicleSeoFacts {
  name: string;
  priceMin: number | null;
  priceMax: number | null;
  versions: number;
  /** Meilleure autonomie réelle mixte de la gamme */
  rangeBest: number;
  rangeBestMeasured: boolean;
  /** Code de confiance de cette autonomie (badge Confidence) */
  rangeBestConfidence: string;
  rangeHighway: number;
  wltpMax: number;
  /** Recharge DC 10 → 80 % la plus rapide de la gamme (null si pas de charge rapide) */
  dcMin: number | null;
  dcPeak: number;
  batteryMin: number;
  batteryMax: number;
  leasingMin: number | null;
  /** Prime CEE de tout ménage si la version d'entrée y est éligible, sinon 0 */
  aids: number;
  /** Prix d'entrée après cette prime */
  priceAfterAids: number | null;
  /** Prix d'entrée après la prime la plus haute du barème (ménage en précarité) */
  priceAfterAidsMax: number | null;
}

const parseKwh = (s: string | undefined | null): number | null => {
  const m = s?.match(/(\d+(?:[.,]\d+)?)\s*kWh/i);
  return m?.[1] ? parseFloat(m[1].replace(",", ".")) : null;
};

export function getVehicleSeoFacts(v: Vehicle): VehicleSeoFacts {
  const prices = [...v.trims.map((t) => t.price_EUR), ...v.configurations.map((c) => c.price_EUR)].filter(
    (p): p is number => p != null,
  );
  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;

  const ranges = [v.realRange, ...v.configurations.map((c) => c.realRange).filter((r) => r != null)];
  const best = ranges.reduce((a, b) => (b!.mixed_km > a!.mixed_km ? b : a))!;

  const dcTimes = [v.chargingDC.time_10_80_min, ...v.configurations.map((c) => c.chargingDC_10_80_min)].filter(
    (t): t is number => t != null && t > 0,
  );
  const dcPeaks = [v.chargingDC.peakPower_kW, ...v.configurations.map((c) => c.chargingDC_peak_kW ?? 0)];

  const batteries = [
    ...v.configurations.map((c) => c.usableCapacity_kWh ?? parseKwh(c.label) ?? parseKwh(c.trim)),
    ...v.trims.map((t) => parseKwh(t.batteryUsed)),
  ].filter((k): k is number => k != null);
  if (batteries.length === 0) batteries.push(v.usableCapacity_kWh);

  const leases = v.configurations
    .filter((c) => c.leasingSocialEligible && c.monthlyLease_EUR)
    .map((c) => c.monthlyLease_EUR!);
  if (v.leasingSocialEligible && v.leasingSocial_EUR_per_month) leases.push(v.leasingSocial_EUR_per_month);

  const aids = isVehicleEligibleCEE(v, priceMin) ? primeFor(v, "autres") : 0;

  return {
    name: getVehicleName(v),
    priceMin,
    priceMax,
    versions: Math.max(v.configurations.length, new Set(v.trims.map((t) => t.name)).size),
    rangeBest: best.mixed_km,
    rangeBestMeasured: isMeasured(best.confidence),
    rangeBestConfidence: best.confidence,
    rangeHighway: best.highway_130_km,
    wltpMax: Math.max(v.wltp_max_km, ...v.configurations.map((c) => c.wltp_km ?? 0)),
    dcMin: dcTimes.length ? Math.min(...dcTimes) : null,
    dcPeak: Math.max(...dcPeaks),
    batteryMin: Math.min(...batteries),
    batteryMax: Math.max(...batteries),
    leasingMin: leases.length ? Math.min(...leases) : null,
    aids,
    priceAfterAids: priceMin != null && aids > 0 ? Math.max(0, priceMin - aids) : null,
    priceAfterAidsMax: priceMin != null && aids > 0 ? Math.max(0, priceMin - primeFor(v, "precarite")) : null,
  };
}

const kwh = (n: number) => formatNumber(n, Number.isInteger(n) ? 0 : 1);

/* ── Balises ──────────────────────────────────────────────────────────── */

const TITLE_MAX = 60;

/** Balise <title> : nom recherché d'abord, puis les intentions (prix, autonomie, avis). */
export function getVehicleTitle(v: Vehicle): string {
  const name = getVehicleName(v);
  const elec = needsElectricSuffix(v) ? " électrique" : "";
  const status = getMarketStatus(v);
  const year = status === "discontinued" ? "" : ` (${SEO_YEAR})`;
  const candidates =
    status === "upcoming"
      ? [
          `${name}${elec} : prix, autonomie et sortie en France`,
          `${name} : prix, autonomie et sortie en France`,
          `${name} : prix et autonomie`,
        ]
      : [
          `${name}${elec} : prix, autonomie réelle et avis${year}`,
          `${name}${elec} : prix, autonomie réelle et avis`,
          `${name}${elec} : prix et autonomie réelle${year}`,
          `${name}${elec} : prix et autonomie réelle`,
          `${name} : prix et autonomie réelle`,
        ];
  return candidates.find((t) => t.length <= TITLE_MAX) ?? name;
}

const DESC_MAX = 158;

/** Meta description : les chiffres qu'on cherche (prix, autonomie réelle, recharge), sans promesse fausse. */
export function getVehicleDescription(v: Vehicle): string {
  const f = getVehicleSeoFacts(v);
  const elec = needsElectricSuffix(v) ? " électrique" : "";
  const status = getMarketStatus(v);
  const range = `${f.rangeBest} km d'autonomie réelle ${f.rangeBestMeasured ? "mesurée" : "estimée"}`;
  const price =
    f.priceMin == null
      ? null
      : status === "discontinued"
        ? `dernier prix ${formatPrice(f.priceMin)}`
        : `dès ${formatPrice(f.priceMin)}`;
  const charge = f.dcMin != null ? `10-80 % en ${f.dcMin} min` : null;
  const leasing = f.leasingMin != null ? `leasing social dès ${f.leasingMin} €/mois` : null;
  const aided = f.priceAfterAids != null ? `${formatPrice(f.priceAfterAids)} après prime CEE` : null;

  const head = `${f.name}${elec} : `;
  const facts = [price, range, charge].filter(Boolean).join(", ");
  const tails = [
    leasing ? `. ${leasing.charAt(0).toUpperCase()}${leasing.slice(1)}, fiche technique et avis.` : null,
    aided ? `. ${aided.charAt(0).toUpperCase()}${aided.slice(1)}, fiche technique et avis.` : null,
    ". Aides, fiche technique et avis indépendant.",
    ". Fiche technique et avis indépendant.",
    ".",
  ].filter((t): t is string => t != null);

  for (const tail of tails) {
    const d = head + facts + tail;
    if (d.length <= DESC_MAX) return d;
  }
  return (head + [price, range].filter(Boolean).join(", ") + ".").slice(0, DESC_MAX);
}

/**
 * Phrase d'accroche sous le H1 : ce que la fiche ne dit pas déjà en gros chiffres
 * (type de véhicule, pays de fabrication, fourchette de prix, nombre de versions, batteries).
 */
export function getVehicleLead(v: Vehicle): string {
  const f = getVehicleSeoFacts(v);
  const body = getBodyInfo(v);
  const status = getMarketStatus(v);
  // En prose, seulement un nom « parlé » (« R5 électrique ») ; les variantes d'écriture
  // (« ID3 », « Ioniq5 ») vont dans les données structurées
  const alias = getVehicleAliases(v).find((a) => a.includes("électrique"));
  const subject = `${withArticle(v, true)}${alias ? ` (${alias})` : ""}`;
  const un = body.feminine ? "une" : "un";
  // Les participes qui suivent « une citadine » / « un SUV » s'accordent avec ce nom
  const g = (word: string) => (body.feminine ? `${word}e` : word);
  const pronoun = body.feminine ? "elle" : "il";

  const intro = `${subject} est ${un} ${body.noun} 100 % électrique ${g("fabriqué")} ${inCountry(v.productionCountry)}`;

  const batteries =
    Math.round(f.batteryMin) === Math.round(f.batteryMax)
      ? `une batterie de ${kwh(f.batteryMax)} kWh`
      : `des batteries de ${kwh(f.batteryMin)} à ${kwh(f.batteryMax)} kWh`;
  const versions = f.versions > 1 ? ` en ${f.versions} versions` : "";

  if (f.priceMin == null) {
    return `${intro}. Son prix en France n'est pas encore communiqué ; ${pronoun} sera ${g("proposé")} avec ${batteries}.`;
  }
  if (status === "discontinued") {
    const Pronoun = pronoun.charAt(0).toUpperCase() + pronoun.slice(1);
    return `${intro}, qui n'est plus ${g("commercialisé")} neuf en France. ${Pronoun} était ${g("vendu")} ${priceSpan(f)}${versions}, avec ${batteries}.`;
  }
  return `${intro}, ${g("vendu")} en France ${priceSpan(f)}${versions}, avec ${batteries}.`;
}

function priceSpan(f: VehicleSeoFacts): string {
  if (f.priceMin == null) return "";
  if (f.priceMax == null || f.priceMax === f.priceMin) return `à partir de ${formatPrice(f.priceMin)}`;
  return `de ${formatPrice(f.priceMin)} à ${formatPrice(f.priceMax)}`;
}

/* ── Maillage : alternatives ──────────────────────────────────────────── */

const SEGMENT_ORDER = "ABCDEF";

/**
 * Concurrentes directes : même catégorie de carrosserie, segment proche, prix
 * d'entrée le plus proche. Les modèles retirés du marché passent après.
 */
// Catégories voisines quand la catégorie du modèle compte trop peu de concurrentes
const NEIGHBOUR_CATEGORIES: Partial<Record<BodyCategory, BodyCategory[]>> = {
  quadricycle: ["citadine"],
  sportive: ["berline", "suv"],
  break: ["berline", "compacte", "suv"],
  citadine: ["compacte"],
  compacte: ["citadine", "berline"],
  berline: ["compacte"],
  monospace: ["suv"],
};

export function getAlternatives(v: Vehicle, all: Vehicle[], count = 4): Vehicle[] {
  const category = getBodyInfo(v).category;
  const direct = rankAlternatives(v, all, [category]);
  const neighbours = NEIGHBOUR_CATEGORIES[category];
  const usableDirect = direct.filter((o) => getMarketStatus(o) !== "discontinued");
  if (usableDirect.length >= count || !neighbours) return direct.slice(0, count);
  const fill = rankAlternatives(v, all, neighbours).filter((o) => getMarketStatus(o) !== "discontinued");
  return [...usableDirect, ...fill].slice(0, count);
}

function rankAlternatives(v: Vehicle, all: Vehicle[], categories: BodyCategory[]): Vehicle[] {
  const facts = getVehicleSeoFacts(v);
  const seg = SEGMENT_ORDER.indexOf(v.segment.trim().charAt(0).toUpperCase());
  const ref = facts.priceMin ?? 40000;

  return all
    .filter((o) => o.slug !== v.slug && categories.includes(getBodyInfo(o).category))
    .map((o) => {
      const p = getVehicleSeoFacts(o).priceMin ?? ref * 1.5;
      const oSeg = SEGMENT_ORDER.indexOf(o.segment.trim().charAt(0).toUpperCase());
      const segGap = seg >= 0 && oSeg >= 0 ? Math.abs(seg - oSeg) : 1;
      const statusPenalty = getMarketStatus(o) === "discontinued" ? 2 : getMarketStatus(o) === "upcoming" ? 0.5 : 0;
      const sameBrand = o.brand === v.brand ? 0.15 : 0;
      return { o, score: Math.abs(p - ref) / ref + segGap * 0.35 + statusPenalty + sameBrand };
    })
    .sort((a, b) => a.score - b.score)
    .map((x) => x.o);
}

/* ── Marques ──────────────────────────────────────────────────────────── */

export function brandSlug(brand: string): string {
  return brand
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
