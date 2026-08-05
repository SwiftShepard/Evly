import type { Vehicle } from "@/data/schemas";

/**
 * "Bons plans" : repère les cas où, pour un budget équivalent ou inférieur à
 * un modèle grand public connu, un autre véhicule de la même catégorie offre
 * un avantage net et mesurable (autonomie, vitesse de charge ou puissance).
 *
 * Comparaison honnête et multi-axes : on affiche toujours les trois écarts
 * (autonomie, charge, puissance), même quand l'un d'eux est défavorable,
 * dans le même esprit de transparence que le reste du site.
 */

// Marques que le grand public connaît déjà et vient chercher en concession.
// Ce sont elles qui servent de "référence" dans la comparaison.
const MAINSTREAM_BRANDS = new Set([
  "Peugeot", "Renault", "Citroën", "Volkswagen", "Opel", "Fiat", "Toyota",
  "Hyundai", "Kia", "Nissan", "Tesla", "BMW", "Mercedes", "Audi", "Skoda",
  "Mini", "Ford", "Mazda",
]);

// Exclus les utilitaires/fourgons, hors sujet pour un achat particulier.
const UTILITY_PATTERN = /fourgon|combi utilitaire/i;

function cheapestPrice(v: Vehicle): number | null {
  const prices = v.trims.map((t) => t.price_EUR).filter((p): p is number => p !== null);
  return prices.length > 0 ? Math.min(...prices) : null;
}

// Regroupe les véhicules par carrosserie réelle avant le segment : un
// monospace ne doit jamais se retrouver comparé à une berline sportive
// sous prétexte qu'ils partagent la même lettre de segment.
function bodyBucket(bodyType: string): string {
  const b = bodyType.toLowerCase();
  if (b.includes("monospace") || b.includes("ludospace") || b.includes("van") || b.includes("navette")) return "monospace";
  if (b.includes("tout-terrain") || b.includes("pick-up") || b.includes("pickup")) return "tout-terrain";
  if (b.includes("cabriolet") || b.includes("roadster") || b.includes("targa")) return "cabriolet";
  if (b.includes("coupé") || b.includes("coupe")) return "coupe";
  if (b.includes("suv") || b.includes("crossover")) return "suv";
  if (b.includes("citadine") || b.includes("urbain")) return "citadine";
  if (b.includes("break") || b.includes("shooting")) return "break";
  if (b.includes("berline") || b.includes("fastback") || b.includes("hatchback") || b.includes("compacte")) return "berline";
  if (b.includes("quadricycle")) return "quadricycle";
  return "autre";
}

// Regroupe les véhicules par gabarit comparable : carrosserie + segment officiel.
function categoryKey(v: Vehicle): string {
  return `${bodyBucket(v.bodyType)}-${v.segment.trim().toUpperCase()}`;
}

export interface ValueComparison {
  reference: Vehicle;
  referencePrice: number;
  alternative: Vehicle;
  alternativePrice: number;
  savingsEUR: number;
  rangeDeltaKm: number;
  chargeDeltaMin: number;
  powerDeltaHp: number;
  headline: string;
}

function buildHeadline(c: Omit<ValueComparison, "headline">): string {
  const points: string[] = [];
  if (c.savingsEUR > 0) points.push(`${Math.round(c.savingsEUR)} € de moins`);
  else if (c.savingsEUR === 0) points.push("même prix");
  if (c.rangeDeltaKm >= 20) points.push(`+${c.rangeDeltaKm} km d'autonomie réelle`);
  if (c.chargeDeltaMin >= 3) points.push(`${c.chargeDeltaMin} min de charge en moins`);
  if (c.powerDeltaHp >= 20) points.push(`+${c.powerDeltaHp} ch`);
  return points.join(" · ") || "Une alternative à regarder";
}

/**
 * Calcule les meilleures comparaisons "plus pour le même prix" du catalogue.
 * Un véhicule grand public sert de référence ; on cherche, dans la même
 * catégorie, l'alternative au prix égal ou inférieur qui l'emporte nettement
 * sur au moins un critère (autonomie, charge, puissance) sans être
 * catastrophique sur les autres.
 */
export function getValueComparisons(vehicles: Vehicle[], limit = 12): ValueComparison[] {
  const eligible = vehicles.filter((v) => !UTILITY_PATTERN.test(v.bodyType));
  const results: ValueComparison[] = [];

  for (const reference of eligible) {
    if (!MAINSTREAM_BRANDS.has(reference.brand)) continue;
    const referencePrice = cheapestPrice(reference);
    if (referencePrice == null) continue;

    const category = categoryKey(reference);
    let best: ValueComparison | null = null;

    for (const alternative of eligible) {
      if (alternative.slug === reference.slug) continue;
      if (categoryKey(alternative) !== category) continue;

      const alternativePrice = cheapestPrice(alternative);
      if (alternativePrice == null || alternativePrice > referencePrice) continue;

      const rangeDeltaKm = alternative.realRange.mixed_km - reference.realRange.mixed_km;
      const chargeDeltaMin = reference.chargingDC.time_10_80_min - alternative.chargingDC.time_10_80_min;
      const powerDeltaHp = alternative.power_hp - reference.power_hp;
      const savingsEUR = referencePrice - alternativePrice;

      // Garde-fou : il faut un net avantage sur au moins un axe, et pas de
      // contrepartie déraisonnable sur l'autonomie (le critère qu'Evly place
      // au-dessus des autres).
      const hasCleanWin = rangeDeltaKm >= 30 || chargeDeltaMin >= 5 || powerDeltaHp >= 30;
      const noDealbreaker = rangeDeltaKm >= -50;
      if (!hasCleanWin || !noDealbreaker) continue;

      const score = Math.max(0, rangeDeltaKm) * 1 + chargeDeltaMin * 8 + Math.max(0, powerDeltaHp) * 1.5 + savingsEUR * 0.02;
      const candidate: ValueComparison = {
        reference,
        referencePrice,
        alternative,
        alternativePrice,
        savingsEUR,
        rangeDeltaKm,
        chargeDeltaMin,
        powerDeltaHp,
        headline: "",
      };

      const bestScore = best
        ? Math.max(0, best.rangeDeltaKm) * 1 + best.chargeDeltaMin * 8 + Math.max(0, best.powerDeltaHp) * 1.5 + best.savingsEUR * 0.02
        : -Infinity;

      if (score > bestScore) best = candidate;
    }

    if (best) {
      best.headline = buildHeadline(best);
      results.push(best);
    }
  }

  const scoreOf = (c: ValueComparison) =>
    Math.max(0, c.rangeDeltaKm) + c.chargeDeltaMin * 8 + Math.max(0, c.powerDeltaHp) * 1.5 + c.savingsEUR * 0.02;

  const ranked = results.sort((a, b) => scoreOf(b) - scoreOf(a));

  // Diversité : on évite qu'une même "bonne pioche" écrase toute la page en
  // apparaissant comme alternative pour trop de références différentes.
  const usageCount = new Map<string, number>();
  const diversified: ValueComparison[] = [];
  for (const c of ranked) {
    const used = usageCount.get(c.alternative.slug) ?? 0;
    if (used >= 2) continue;
    usageCount.set(c.alternative.slug, used + 1);
    diversified.push(c);
    if (diversified.length >= limit) break;
  }

  return diversified;
}
