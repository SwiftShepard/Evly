import type { Vehicle, VehicleConfiguration } from "@/data/schemas";
import { calculateCeeAid, grosRouleurOpen, isEU, type HouseholdCategory } from "@/lib/cee";

/**
 * Matcher : réponses du visiteur, classement des modèles et lecture de l'URL.
 *
 * Le score est une moyenne pondérée de critères notés de 0 à 1 (budget, semaine de
 * trajet, longs voyages, place, format, priorités) : 100 % = tous les critères
 * demandés sont pleinement remplis. Chaque critère est affiché dans les résultats.
 * Chaque version d'un modèle est évaluée ; on garde la mieux notée (à égalité, la
 * moins chère).
 */

export interface MatcherAnswers {
  /** Trajet quotidien aller et retour (km), partagé avec « Mon trajet » */
  dailyKm: number;
  /** Recharge possible à domicile ou au travail */
  homeCharging: boolean;
  longTrips: "never" | "few" | "often";
  /** Plus long trajet d'une traite (km) */
  longTripKm: number;
  household: "solo" | "family" | "large";
  role: "primary" | "secondary";
  body: "any" | "city" | "sedan" | "suv" | "van";
  trunk: "any" | "medium" | "large";
  /** Hayon obligatoire (pas de malle de berline) */
  hatch: boolean;
  budgetType: "buy" | "lease";
  budgetMax: number;
  /** Revenu fiscal de référence par part ≤ 16 300 € */
  lowIncome: boolean;
  /** Plus de 10 km du travail ou plus de 8 000 km pro par an */
  commuter: boolean;
  /** Plus de 12 000 km pro par an et revenu ≤ 27 310 € par part (prime CEE « gros rouleur ») */
  bigCommuter: boolean;
  fastCharge: boolean;
  europe: boolean;
  software: boolean;
}

export const DEFAULT_ANSWERS: MatcherAnswers = {
  dailyKm: 40,
  homeCharging: true,
  longTrips: "few",
  longTripKm: 500,
  household: "solo",
  role: "primary",
  body: "any",
  trunk: "any",
  hatch: false,
  budgetType: "buy",
  budgetMax: 35000,
  lowIncome: false,
  commuter: false,
  bigCommuter: false,
  fastCharge: false,
  europe: false,
  software: false,
};

export const BUDGET_RANGE = {
  buy: { min: 15000, max: 100000, step: 2500, initial: 35000 },
  lease: { min: 100, max: 1000, step: 25, initial: 300 },
} as const;

export interface Criterion {
  label: string;
  weight: number;
  /** 0 à 1 */
  fit: number;
}

export interface MatchResult {
  vehicle: Vehicle;
  config: VehicleConfiguration;
  /** 0 à 100 */
  score: number;
  criteria: Criterion[];
  reasons: string[];
  warnings: string[];
  price: {
    catalog: number;
    net: number;
    cee: number;
    /** Loyer mensuel retenu (leasing social, loyer constructeur ou estimation) */
    monthly: number;
    monthlyKind: "social" | "official" | "estimate";
  };
  range: { winter: number; real: number; wltp: number; days: number };
}

/* ------------------------------------------------------------------ */
/* URL                                                                 */
/* ------------------------------------------------------------------ */

const PRIORITIES = [
  ["recharge", "fastCharge"],
  ["europe", "europe"],
  ["logiciel", "software"],
] as const;

export function answersToParams(a: MatcherAnswers): URLSearchParams {
  const p = new URLSearchParams();
  p.set("trajet", String(a.dailyKm));
  p.set("maison", a.homeCharging ? "1" : "0");
  p.set("voyages", a.longTrips);
  if (a.longTrips !== "never") p.set("voyage", String(a.longTripKm));
  p.set("foyer", a.household);
  p.set("role", a.role);
  p.set("format", a.body);
  p.set("coffre", a.trunk);
  if (a.hatch) p.set("hayon", "1");
  p.set("budget", a.budgetType === "buy" ? "achat" : "loyer");
  p.set("max", String(a.budgetMax));
  if (a.lowIncome) p.set("rfr", "1");
  if (a.commuter) p.set("distance", "1");
  if (a.bigCommuter) p.set("rouleur", "1");
  const prio = PRIORITIES.filter(([, key]) => a[key]).map(([name]) => name);
  if (prio.length) p.set("prio", prio.join(","));
  return p;
}

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;
const clampNum = (value: string | null, min: number, max: number, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== null && value !== "" ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

/** Réponses lues dans l'URL, ou null si l'URL n'en contient pas */
export function paramsToAnswers(p: URLSearchParams): MatcherAnswers | null {
  if (!p.has("trajet")) return null;
  const budgetType = p.get("budget") === "loyer" ? "lease" : "buy";
  const range = BUDGET_RANGE[budgetType];
  const prio = new Set((p.get("prio") ?? "").split(","));
  return {
    dailyKm: clampNum(p.get("trajet"), 10, 200, DEFAULT_ANSWERS.dailyKm),
    homeCharging: p.get("maison") !== "0",
    longTrips: pick(p.get("voyages"), ["never", "few", "often"] as const, DEFAULT_ANSWERS.longTrips),
    longTripKm: clampNum(p.get("voyage"), 150, 1000, DEFAULT_ANSWERS.longTripKm),
    household: pick(p.get("foyer"), ["solo", "family", "large"] as const, DEFAULT_ANSWERS.household),
    role: pick(p.get("role"), ["primary", "secondary"] as const, DEFAULT_ANSWERS.role),
    body: pick(p.get("format"), ["any", "city", "sedan", "suv", "van"] as const, DEFAULT_ANSWERS.body),
    trunk: pick(p.get("coffre"), ["any", "medium", "large"] as const, DEFAULT_ANSWERS.trunk),
    hatch: p.get("hayon") === "1",
    budgetType,
    budgetMax: clampNum(p.get("max"), range.min, range.max, range.initial),
    lowIncome: p.get("rfr") === "1",
    commuter: p.get("distance") === "1",
    bigCommuter: p.get("rouleur") === "1",
    fastCharge: prio.has("recharge"),
    europe: prio.has("europe"),
    software: prio.has("logiciel"),
  };
}

/* ------------------------------------------------------------------ */
/* Données dérivées                                                    */
/* ------------------------------------------------------------------ */

/** Famille de carrosserie à partir du libellé libre de la fiche */
export function bodyFamily(bodyType: string): MatcherAnswers["body"] {
  const b = bodyType.toLowerCase();
  if (/monospace|ludospace|combi|van/.test(b)) return "van";
  if (/suv|crossover|tout-terrain/.test(b)) return "suv";
  if (/citadine|hatchback|compacte|quadricycle/.test(b)) return "city";
  return "sedan";
}

/** Berlines à malle (pas de hayon) */
const NO_HATCH = new Set([
  "tesla-model-3", "byd-seal", "hyundai-ioniq-6", "xiaomi-su7", "bmw-i7", "mercedes-eqe",
  "mercedes-classe-c-berline", "genesis-electrified-g80", "audi-e-tron-gt", "porsche-taycan",
]);

/**
 * Réputation du système multimédia et du planificateur d'itinéraire (avis éditorial,
 * sur 5). Ne compte que si le visiteur en fait une priorité.
 */
function softwareRating(brand: string): number {
  const b = brand.toLowerCase();
  if (["tesla", "mercedes-benz", "mercedes", "bmw"].includes(b)) return 5;
  if (["renault", "nissan", "volvo", "polestar", "porsche", "smart", "kia", "hyundai", "xpeng", "nio", "xiaomi"].includes(b)) return 4;
  if (["leapmotor", "geely"].includes(b)) return 3.5;
  if (["peugeot", "citroën", "fiat", "opel", "jeep", "lancia", "alfa romeo", "ds", "toyota", "lexus", "dacia", "maxus"].includes(b)) return 2;
  return 3;
}

/** Segments cohérents avec le foyer et l'usage (évite les résultats farfelus) */
function allowedSegments(a: MatcherAnswers): Set<string> {
  const primary = a.role === "primary";
  if (a.household === "large") return new Set(primary ? ["C", "D", "E", "F"] : ["B", "C", "D", "E"]);
  if (a.household === "family") return new Set(primary ? ["B", "C", "D", "E"] : ["A", "B", "C"]);
  return new Set(a.longTrips === "often" ? ["B", "C", "D", "E"] : ["A", "B", "C", "D"]);
}

/** Volume de coffre attendu (L) : choix explicite, sinon déduit du foyer */
function trunkNeed(a: MatcherAnswers): number {
  if (a.trunk === "large") return 450;
  if (a.trunk === "medium") return 350;
  if (a.role !== "primary") return 0;
  return a.household === "large" ? 450 : a.household === "family" ? 380 : 0;
}

/** Arrêts de recharge et minutes passées à recharger sur le plus long trajet */
export function tripStops(distance: number, highwayKm: number, dc10to80: number) {
  // Départ batterie pleine jusqu'à 10 %, puis relais de 80 % à 10 %
  const first = highwayKm * 0.9;
  const leg = Math.max(50, highwayKm * 0.7);
  const stops = distance <= first ? 0 : Math.ceil((distance - first) / leg);
  return { stops, minutes: stops * dc10to80 };
}

const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/ /g, " ");
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/* ------------------------------------------------------------------ */
/* Score                                                               */
/* ------------------------------------------------------------------ */

interface Scored {
  criteria: Criterion[];
  reasons: [number, string][];
  warnings: [number, string][];
}

export function scoreVehicle(vehicle: Vehicle, a: MatcherAnswers): MatchResult | null {
  const segment = (vehicle.segment ?? "B").split(",")[0]!.trim();
  if (!allowedSegments(a).has(segment)) return null;
  if (a.hatch && NO_HATCH.has(vehicle.slug)) return null;
  if (a.role === "primary" && vehicle.bodyType === "Quadricycle") return null;
  if (a.role === "primary" && a.household === "large" && (vehicle.length_mm < 4300 || vehicle.trunkCapacity_L < 380)) return null;
  if (a.role === "primary" && a.household === "family" && (vehicle.length_mm < 4100 || vehicle.trunkCapacity_L < 300)) return null;

  const configs = vehicle.configurations.filter((c) => c.price_EUR !== null && c.availability !== "discontinued");
  const userSocial = a.lowIncome && a.commuter;
  const ceeCategory: HouseholdCategory = a.lowIncome ? "modeste" : a.bigCommuter && grosRouleurOpen() ? "gros_rouleur" : "autres";
  let best: MatchResult | null = null;

  for (const config of configs) {
    const s: Scored = { criteria: [], reasons: [], warnings: [] };
    const add = (label: string, weight: number, fit: number) => s.criteria.push({ label, weight, fit: Math.max(0, Math.min(1, fit)) });

    /* Prix : prime CEE déduite. ≤ 16 300 € par part = au moins « modeste » (≤ 16 880 €) ;
       gros rouleur s'il l'a indiqué ; sinon prime de tout ménage */
    const catalog = config.price_EUR!;
    const { amount: cee } = calculateCeeAid({ vehicle, price: catalog, profileType: "particular", category: ceeCategory });
    const net = catalog - cee;
    const social = userSocial && (config.leasingSocialEligible || vehicle.leasingSocialEligible) && vehicle.leasingSocial_EUR_per_month != null;
    const monthlyKind = social ? "social" : config.monthlyLease_EUR ? "official" : "estimate";
    const monthly = social ? vehicle.leasingSocial_EUR_per_month! : config.monthlyLease_EUR || Math.round(net * 0.009);

    const cost = a.budgetType === "buy" ? net : monthly;
    if (cost > a.budgetMax * 1.08) continue;
    const overBudget = cost > a.budgetMax;
    add("Budget", 3, overBudget ? 0.4 : 1);
    if (overBudget) s.warnings.push([3, a.budgetType === "buy" ? `${fmt(net)} € : un peu au-dessus de votre budget` : `${fmt(monthly)} €/mois : un peu au-dessus de votre budget`]);
    else if (social) s.reasons.push([3.5, `Leasing social à ${fmt(monthly)} €/mois`]);

    /* Semaine de trajet : la règle « tient mon trajet » du site */
    const rr = config.realRange ?? vehicle.realRange;
    const winter = rr.winter_minus5_km;
    const real = rr.mixed_km;
    const highway = rr.highway_130_km || Math.round(real * 0.7);
    const wltp = Math.max(config.wltp_km ?? vehicle.wltp_max_km, real);
    const days = Math.floor(winter / a.dailyKm);
    const weekNeed = a.dailyKm * (a.homeCharging ? 5 : 7);
    const weekFit = winter >= weekNeed ? 1 : (winter / weekNeed) ** 2;
    add("Votre semaine de trajet", 3, weekFit);
    if (weekFit === 1) s.reasons.push([3, `Tient ${plural(days, "jour")} de votre trajet sans recharger, même en hiver`]);
    else s.warnings.push([3, `En hiver, recharge au bout de ${plural(days, "jour")} de trajet`]);
    if (!a.homeCharging && real >= 450) s.reasons.push([2, "Grande autonomie : une recharge publique par semaine suffit"]);

    /* Longs voyages */
    const dcPeak = config.chargingDC_peak_kW ?? vehicle.chargingDC.peakPower_kW;
    const dcTime = config.chargingDC_10_80_min ?? vehicle.chargingDC.time_10_80_min;
    const hasDC = dcPeak > 0 && dcTime > 0;
    if (a.longTrips !== "never") {
      const w = a.longTrips === "often" ? 3 : 1.5;
      if (!hasDC) {
        add("Longs voyages", w, 0);
        s.warnings.push([w, "Pas de recharge rapide : inadaptée aux longs trajets"]);
      } else {
        const { stops, minutes } = tripStops(a.longTripKm, highway, dcTime);
        const fit = stops === 0 ? 1 : 1 - minutes / 150;
        add("Longs voyages", w, fit);
        const text = stops === 0
          ? `${fmt(a.longTripKm)} km d'une traite, sans recharger`
          : `${fmt(a.longTripKm)} km : ${plural(stops, "arrêt")}, environ ${minutes} min de recharge`;
        if (fit >= 0.55) s.reasons.push([w * fit, text]);
        else s.warnings.push([w, text]);
      }
    }

    /* Place à bord */
    const trunk = vehicle.trunkCapacity_L;
    const need = trunkNeed(a);
    if (need > 0) {
      const fit = trunk >= need ? 1 : 1 - (need - trunk) / 150;
      add("Coffre", 2.5, fit);
      if (fit === 1) s.reasons.push([2, `Coffre de ${fmt(trunk)} L`]);
      else s.warnings.push([2.5, `Coffre de ${fmt(trunk)} L, en dessous des ${need} L souhaités`]);
    }
    if (a.household === "solo" && a.longTrips !== "often" && a.dailyKm <= 60) {
      const len = vehicle.length_mm;
      const fit = len < 4100 ? 1 : len < 4400 ? 0.75 : len < 4700 ? 0.45 : 0.2;
      add("Gabarit au quotidien", 1, fit);
      if (fit === 1) s.reasons.push([1, "Gabarit compact, facile à garer"]);
      else if (fit <= 0.45) s.warnings.push([1, `Grand gabarit (${(len / 1000).toFixed(2).replace(".", ",")} m) pour un usage surtout quotidien`]);
    }

    /* Format */
    if (a.body !== "any") {
      const fit = bodyFamily(vehicle.bodyType) === a.body ? 1 : 0;
      add("Format", 2, fit);
      if (!fit) s.warnings.push([2, `Format ${vehicle.bodyType.toLowerCase()}, différent de votre choix`]);
    }

    /* Priorités facultatives */
    if (a.fastCharge) {
      const fit = !hasDC ? 0 : dcTime <= 30 ? 1 : dcTime <= 40 ? 0.5 : 0;
      add("Recharge rapide", 1.5, fit);
      if (fit === 1) s.reasons.push([1.5, `10 à 80 % en ${dcTime} min sur borne rapide`]);
      else s.warnings.push([1.5, hasDC ? `10 à 80 % en ${dcTime} min sur borne rapide` : "Pas de recharge rapide"]);
    }
    if (a.europe) {
      const fit = isEU(vehicle.productionCountry) ? 1 : 0;
      add("Fabrication européenne", 1.5, fit);
      if (fit) s.reasons.push([1.5, `Fabriquée en ${vehicle.productionCountry}`]);
      else s.warnings.push([1.5, `Fabriquée hors d'Europe (${vehicle.productionCountry})`]);
    }
    if (a.software) {
      const r = softwareRating(vehicle.brand);
      const fit = r >= 4 ? 1 : r >= 3.5 ? 0.8 : r >= 3 ? 0.6 : 0.2;
      add("Écran et planificateur", 1.5, fit);
      if (fit === 1) s.reasons.push([1.4, "Écran et planificateur d'itinéraire réputés fluides"]);
      else if (fit <= 0.2) s.warnings.push([1.5, "Écran et planificateur d'itinéraire souvent jugés lents"]);
    }

    const total = s.criteria.reduce((sum, c) => sum + c.weight, 0);
    const score = Math.round((100 * s.criteria.reduce((sum, c) => sum + c.weight * c.fit, 0)) / total);
    const byWeight = (list: [number, string][]) => [...list].sort((x, y) => y[0] - x[0]).map(([, t]) => t);

    const result: MatchResult = {
      vehicle,
      config,
      score,
      criteria: s.criteria,
      reasons: byWeight(s.reasons).slice(0, 3),
      warnings: byWeight(s.warnings).slice(0, 2),
      price: { catalog, net, cee, monthly, monthlyKind },
      range: { winter, real, wltp, days },
    };
    const cheaper = best && (a.budgetType === "buy" ? net < best.price.net : monthly < best.price.monthly);
    if (!best || score > best.score || (score === best.score && cheaper)) best = result;
  }

  return best;
}

/** Classement complet : meilleur score d'abord, puis le moins cher */
export function rankVehicles(vehicles: Vehicle[], a: MatcherAnswers): MatchResult[] {
  const cost = (r: MatchResult) => (a.budgetType === "buy" ? r.price.net : r.price.monthly);
  return vehicles
    .map((v) => scoreVehicle(v, a))
    .filter((r): r is MatchResult => r !== null && r.score >= 40)
    .sort((x, y) => y.score - x.score || cost(x) - cost(y));
}
