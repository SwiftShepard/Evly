import type { Vehicle } from "@/data/schemas";
import { DUELS, duelSlug } from "@/data/duels";
import { getVehicleBySlug } from "@/lib/vehicles";
import { getVehicleName, getVehicleSeoFacts, isMasculine, withArticle, withDe, type VehicleSeoFacts } from "@/lib/seo";
import { confidenceLevel, isMeasured } from "@/lib/confidence";
import { formatKm, formatNumber, formatPrice } from "@/lib/format";

/**
 * Duel « X vs Y » (roadmap E10) : tout est calculé depuis les deux fiches, rien n'est écrit
 * à la main, pour que chaque phrase reste vraie quand une fiche change.
 * Chiffres de gamme (prix d'entrée, meilleure autonomie, recharge la plus rapide), comme
 * sur les pages marques et sélections ; la règle de chaque modèle montre sa version la plus endurante.
 */

export interface DuelSide {
  v: Vehicle;
  name: string;
  facts: VehicleSeoFacts;
  /** Version la plus endurante (règle d'autonomie) */
  best: { id: string; label: string; real: number; winter: number; wltp: number; confidence: string };
  winterBest: number;
  powerHp: number;
  /** Versions commercialisées : [prix, autonomie hiver, libellé] (trajet, calculé aussi dans le navigateur) */
  versions: [number | null, number, string][];
}

export type Better = "high" | "low" | null;

export interface DuelRow {
  key: string;
  label: string;
  a: string;
  b: string;
  /** Côté gagnant ; null si égalité, critère neutre ou donnée manquante */
  winner: "a" | "b" | null;
  /** Code de confiance à afficher sous la valeur (autonomies) */
  confA?: string;
  confB?: string;
}

export interface Duel {
  slug: string;
  a: DuelSide;
  b: DuelSide;
  rows: DuelRow[];
  /** Phrases du verdict, de la plus décisive à la moins */
  verdict: string[];
  /** « Plutôt A si… », « plutôt B si… » */
  pick: { a: string[]; b: string[] };
  faq: { question: string; answer: string }[];
  scale: number;
  lastUpdated: string;
}

const shortLabel = (v: Vehicle, label: string) => label.replace(v.model, "").replace(/^[\s·]+/, "").trim() || label;

function side(v: Vehicle): DuelSide {
  const configs = v.configurations.filter((c) => c.availability !== "discontinued");
  const pool = configs.length ? configs : v.configurations;
  const rr = (c: (typeof pool)[number]) => c.realRange ?? v.realRange;
  const bestCfg = pool.length ? pool.reduce((a, b) => (rr(b).mixed_km > rr(a).mixed_km ? b : a)) : null;
  const best = bestCfg
    ? {
        id: bestCfg.id,
        label: shortLabel(v, bestCfg.label),
        real: rr(bestCfg).mixed_km,
        winter: rr(bestCfg).winter_minus5_km,
        wltp: Math.max(bestCfg.wltp_km ?? v.wltp_max_km, rr(bestCfg).mixed_km),
        confidence: rr(bestCfg).confidence,
      }
    : { id: "", label: v.variant, real: v.realRange.mixed_km, winter: v.realRange.winter_minus5_km, wltp: v.wltp_max_km, confidence: v.realRange.confidence };
  return {
    v,
    name: getVehicleName(v),
    facts: getVehicleSeoFacts(v),
    best,
    winterBest: Math.max(v.realRange.winter_minus5_km, ...pool.map((c) => rr(c).winter_minus5_km)),
    powerHp: Math.max(v.power_hp, ...pool.map((c) => c.power_hp ?? 0)),
    versions: pool.map((c) => [c.price_EUR, rr(c).winter_minus5_km, shortLabel(v, c.label)]),
  };
}

/** Gagnant d'un critère chiffré ; `tie` = écart relatif sous lequel on parle d'égalité */
function winnerOf(a: number | null, b: number | null, better: Better, tie = 0): "a" | "b" | null {
  if (better === null || a === null || b === null || a === b) return null;
  if (tie > 0 && Math.abs(a - b) / Math.max(a, b) < tie) return null;
  return (better === "high") === a > b ? "a" : "b";
}

const pct = (a: number, b: number) => Math.round((Math.abs(a - b) / Math.min(a, b)) * 100);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function getDuel(aSlug: string, bSlug: string): Duel | null {
  const va = getVehicleBySlug(aSlug);
  const vb = getVehicleBySlug(bSlug);
  if (!va || !vb) return null;
  const A = side(va);
  const B = side(vb);
  const fa = A.facts;
  const fb = B.facts;

  const aidedA = fa.priceAfterAids ?? fa.priceMin;
  const aidedB = fb.priceAfterAids ?? fb.priceMin;
  const price = (n: number | null) => (n != null ? formatPrice(n) : "Non communiqué");
  const minutes = (n: number | null) => (n != null ? `${n} min` : "Pas de charge rapide");

  const rows: DuelRow[] = [
    { key: "price", label: "Prix d'entrée", a: price(fa.priceMin), b: price(fb.priceMin), winner: winnerOf(fa.priceMin, fb.priceMin, "low") },
    {
      key: "aided",
      label: "Après prime CEE*",
      a: fa.priceAfterAids != null ? formatPrice(fa.priceAfterAids) : fa.priceMin != null ? "Pas de prime" : "Non communiqué",
      b: fb.priceAfterAids != null ? formatPrice(fb.priceAfterAids) : fb.priceMin != null ? "Pas de prime" : "Non communiqué",
      winner: winnerOf(aidedA, aidedB, "low"),
    },
    { key: "range", label: "Autonomie réelle, usage mixte", a: formatKm(fa.rangeBest), b: formatKm(fb.rangeBest), winner: winnerOf(fa.rangeBest, fb.rangeBest, "high", 0.03), confA: fa.rangeBestConfidence, confB: fb.rangeBestConfidence },
    { key: "highway", label: "Sur autoroute, à 130 km/h", a: formatKm(fa.rangeHighway), b: formatKm(fb.rangeHighway), winner: winnerOf(fa.rangeHighway, fb.rangeHighway, "high", 0.03) },
    { key: "winter", label: "En hiver, par -5 °C", a: formatKm(A.winterBest), b: formatKm(B.winterBest), winner: winnerOf(A.winterBest, B.winterBest, "high", 0.03) },
    { key: "charge", label: "Recharge rapide 10 → 80 %", a: minutes(fa.dcMin), b: minutes(fb.dcMin), winner: winnerOf(fa.dcMin ?? 999, fb.dcMin ?? 999, "low", 0.05) },
    { key: "peak", label: "Puissance de recharge maximale", a: `${fa.dcPeak} kW`, b: `${fb.dcPeak} kW`, winner: winnerOf(fa.dcPeak, fb.dcPeak, "high", 0.05) },
    { key: "trunk", label: "Coffre", a: `${va.trunkCapacity_L} L`, b: `${vb.trunkCapacity_L} L`, winner: winnerOf(va.trunkCapacity_L, vb.trunkCapacity_L, "high", 0.05) },
    { key: "length", label: "Longueur", a: `${formatNumber(va.length_mm / 1000, 2)} m`, b: `${formatNumber(vb.length_mm / 1000, 2)} m`, winner: null },
    { key: "power", label: "Puissance maximale", a: `${A.powerHp} ch`, b: `${B.powerHp} ch`, winner: winnerOf(A.powerHp, B.powerHp, "high", 0.05) },
    {
      key: "warranty",
      label: "Garantie batterie",
      a: `${va.warranty.battery_years} ans, ${formatNumber(va.warranty.battery_km)} km`,
      b: `${vb.warranty.battery_years} ans, ${formatNumber(vb.warranty.battery_km)} km`,
      winner: winnerOf(va.warranty.battery_years * 1e6 + va.warranty.battery_km, vb.warranty.battery_years * 1e6 + vb.warranty.battery_km, "high"),
    },
  ];

  /* ── Verdict : une phrase par critère qui départage vraiment ── */
  const theA = withArticle(va);
  const theB = withArticle(vb);
  const of = (s: DuelSide) => withDe(s.v);
  const sideOf = (w: "a" | "b") => (w === "a" ? A : B);
  const otherOf = (w: "a" | "b") => (w === "a" ? B : A);
  const art = (s: DuelSide, capitalize = false) => withArticle(s.v, capitalize);
  const verdict: string[] = [];
  const pick = { a: [] as string[], b: [] as string[] };
  const win = (key: string) => rows.find((r) => r.key === key)!.winner;

  const wRange = win("range");
  if (wRange) {
    const w = sideOf(wRange);
    const l = otherOf(wRange);
    verdict.push(
      `${art(w, true)} va plus loin : ${formatKm(w.facts.rangeBest)} réels en usage mixte contre ${formatKm(l.facts.rangeBest)} (${pct(w.facts.rangeBest, l.facts.rangeBest)} % de plus), et ${formatKm(w.winterBest)} contre ${formatKm(l.winterBest)} par -5 °C.`
    );
    pick[wRange].push("l'autonomie");
  } else {
    verdict.push(`Autonomie au coude-à-coude : ${formatKm(fa.rangeBest)} réels pour ${theA}, ${formatKm(fb.rangeBest)} pour ${theB} dans leur version la plus endurante.`);
  }
  const estimated = [A, B].filter((s) => !isMeasured(s.facts.rangeBestConfidence));
  if (estimated.length === 2) verdict.push("Aucune des deux autonomies n'a encore été mesurée sur route : ce sont des estimations, en attendant un essai.");
  else if (estimated.length === 1) verdict.push(`L'autonomie ${of(estimated[0]!)} est estimée, celle ${of(estimated[0] === A ? B : A)} mesurée sur route.`);

  const wPrice = winnerOf(aidedA, aidedB, "low");
  if (wPrice && aidedA != null && aidedB != null) {
    const w = sideOf(wPrice);
    const l = otherOf(wPrice);
    const wp = w.facts.priceAfterAids ?? w.facts.priceMin!;
    const lp = l.facts.priceAfterAids ?? l.facts.priceMin!;
    const aidNote = w.facts.priceAfterAids != null || l.facts.priceAfterAids != null ? ", prime CEE de tout ménage déduite" : "";
    verdict.push(`${art(w, true)} coûte ${formatPrice(lp - wp)} de moins à l'entrée de gamme (${formatPrice(wp)} contre ${formatPrice(lp)}${aidNote}).`);
    pick[wPrice].push("le prix");
  }

  const wCharge = win("charge");
  if (wCharge && fa.dcMin != null && fb.dcMin != null) {
    const w = sideOf(wCharge);
    const l = otherOf(wCharge);
    verdict.push(`Sur borne rapide, ${art(w)} remonte de 10 à 80 % en ${w.facts.dcMin} min, contre ${l.facts.dcMin} min pour ${art(l)}.`);
    pick[wCharge].push("la recharge rapide");
  } else if (fa.dcMin == null || fb.dcMin == null) {
    const noDc = fa.dcMin == null ? A : B;
    if (fa.dcMin !== fb.dcMin) verdict.push(`${art(noDc, true)} ne se recharge pas sur borne rapide en série.`);
  }

  const wTrunk = win("trunk");
  if (wTrunk) {
    const w = sideOf(wTrunk);
    const l = otherOf(wTrunk);
    verdict.push(`${cap(`le coffre ${of(w)}`)} est plus grand : ${w.v.trunkCapacity_L} L contre ${l.v.trunkCapacity_L} L.`);
    pick[wTrunk].push("le coffre");
  }
  const wPower = win("power");
  if (wPower) pick[wPower].push("les performances");
  const wWarranty = win("warranty");
  if (wWarranty) pick[wWarranty].push("la garantie batterie");

  /* ── Questions fréquentes ── */
  // « Lequel » pour deux utilitaires ou monospaces (« le Kangoo »), « laquelle » dès qu'une voiture est en jeu
  const which = isMasculine(va) && isMasculine(vb) ? "Lequel" : "Laquelle";
  const faq: Duel["faq"] = [
    {
      question: `Quelle est la différence d'autonomie entre ${theA} et ${theB} ?`,
      answer: `En usage mixte, ${theA} parcourt jusqu'à ${formatKm(fa.rangeBest)} (${confidenceWord(fa.rangeBestConfidence)}) et ${theB} jusqu'à ${formatKm(fb.rangeBest)} (${confidenceWord(fb.rangeBestConfidence)}). Sur autoroute à 130 km/h : ${formatKm(fa.rangeHighway)} contre ${formatKm(fb.rangeHighway)}. Par -5 °C : ${formatKm(A.winterBest)} contre ${formatKm(B.winterBest)}.`,
    },
    {
      question: `${which} est ${which === "Lequel" ? "le moins cher" : "la moins chère"}, ${A.name} ou ${B.name} ?`,
      answer:
        fa.priceMin != null && fb.priceMin != null
          ? `${cap(theA)} démarre à ${formatPrice(fa.priceMin)}${fa.priceAfterAids != null ? ` (${formatPrice(fa.priceAfterAids)} après la prime CEE de tout ménage)` : ""}, ${theB} à ${formatPrice(fb.priceMin)}${fb.priceAfterAids != null ? ` (${formatPrice(fb.priceAfterAids)} après la prime)` : ""}. Prix catalogue hors options, relevés sur les configurateurs officiels.`
          : `Les deux prix ne sont pas encore tous communiqués : ${theA} ${fa.priceMin != null ? `dès ${formatPrice(fa.priceMin)}` : "sans tarif officiel"}, ${theB} ${fb.priceMin != null ? `dès ${formatPrice(fb.priceMin)}` : "sans tarif officiel"}.`,
    },
    {
      question: `${which} recharge le plus vite ?`,
      answer:
        fa.dcMin != null && fb.dcMin != null
          ? `De 10 à 80 % sur borne rapide : ${fa.dcMin} min pour ${theA} (jusqu'à ${fa.dcPeak} kW), ${fb.dcMin} min pour ${theB} (jusqu'à ${fb.dcPeak} kW).`
          : `${cap(fa.dcMin == null ? theA : theB)} n'accepte pas la recharge rapide en série ; ${fa.dcMin == null ? theB : theA} remonte de 10 à 80 % en ${fa.dcMin ?? fb.dcMin} min.`,
    },
    {
      question: `${which} a le plus grand coffre ?`,
      answer: `${cap(theA)} offre ${va.trunkCapacity_L} L (${va.trunkCapacityFolded_L} L sièges rabattus), ${theB} ${vb.trunkCapacity_L} L (${vb.trunkCapacityFolded_L} L sièges rabattus).`,
    },
  ];

  const scale = Math.ceil((Math.max(A.best.wltp, B.best.wltp) * 1.15) / 100) * 100;
  return {
    slug: duelSlug(aSlug, bSlug),
    a: A,
    b: B,
    rows,
    verdict,
    pick,
    faq,
    scale,
    lastUpdated: [va.lastUpdated, vb.lastUpdated].sort().at(-1)!,
  };
}

function confidenceWord(code: string): string {
  const level = confidenceLevel(code);
  return level === "measured" ? "mesurée sur route" : level === "manufacturer" ? "chiffre constructeur" : "estimée";
}

export function getAllDuels(): Duel[] {
  return DUELS.map(([a, b]) => getDuel(a, b)).filter((d): d is Duel => d !== null);
}
