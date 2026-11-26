/**
 * Chiffres propres aux utilitaires et à leurs jumeaux (roadmap G16). Les fiches de fourgons étaient
 * courtes et presque identiques d'une marque à l'autre (e-Boxer, ë-Jumper, Movano-e : 51 à 55 % de
 * texte commun, « explorée, actuellement non indexée » dans Search Console). Chaque fiche reçoit :
 *  - son rang face aux autres fourgons du catalogue, situé par ses voisins de classement ;
 *  - ce qui la distingue de ses jumeaux (data/utilityTwins), en écarts comptés depuis elle : les
 *    signes et les noms changent d'une fiche à l'autre, le texte ne se répète pas.
 * Rangs partagés en cas d'égalité (on compte ceux qui font strictement mieux). Module serveur.
 */
import type { Vehicle } from "@/data/schemas";
import { TWIN_GROUPS } from "@/data/utilityTwins";
import { getMarketStatus, getVehicleName, getVehicleSeoFacts, withArticle } from "@/lib/seo";
import { formatNumber, formatPrice } from "@/lib/format";
import { url } from "@/lib/url";

export interface UtilityFigure {
  title: string;
  value: string;
  /** « 3e sur 17 fourgons », « à égalité avec … » */
  rank: string;
  /** Ses voisins de classement */
  text: string;
}

export interface TwinLine {
  name: string;
  href: string;
  text: string;
}

export interface UtilityNumbers {
  /** Nombre de fourgons comparés, 0 si le véhicule n'en est pas un */
  vans: number;
  figures: UtilityFigure[];
  twins: { lead: string; lines: TwinLine[]; summary: string } | null;
  faq: { question: string; answer: string } | null;
}

const isVan = (v: Vehicle) => /^fourgon/i.test(v.bodyType);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const rankWord = (n: number) => (n === 1 ? "1er" : `${n}e`);
const m3 = (l: number) => `${formatNumber(l / 1000, 1)} m³`;
const andList = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} et ${xs.at(-1)}`);

interface Metric {
  title: string;
  of: (v: Vehicle) => number | null;
  /** true : plus grand vaut mieux */
  high: boolean;
  show: (x: number) => string;
  /** « le plus endurant », pour le premier et le dernier du classement */
  best: string;
  worst: string;
}

const METRICS: Metric[] = [
  { title: "Autonomie réelle", of: (v) => getVehicleSeoFacts(v).rangeBest, high: true, show: (x) => `${formatNumber(x)} km`, best: "le plus endurant", worst: "le moins endurant" },
  { title: "Volume utile", of: (v) => v.trunkCapacity_L || null, high: true, show: m3, best: "le plus spacieux", worst: "le moins spacieux" },
  { title: "Recharge 10-80 %", of: (v) => getVehicleSeoFacts(v).dcMin, high: false, show: (x) => `${formatNumber(x)} min`, best: "le plus rapide à la borne", worst: "le plus lent à la borne" },
  { title: "Prix d'entrée", of: (v) => getVehicleSeoFacts(v).priceMin, high: false, show: formatPrice, best: "le moins cher", worst: "le plus cher" },
];

function figure(v: Vehicle, vans: Vehicle[], m: Metric, twinSlugs: Set<string>): UtilityFigure | null {
  const mine = m.of(v);
  if (mine == null) return null;
  const rows = vans.map((o) => ({ o, x: m.of(o) })).filter((r): r is { o: Vehicle; x: number } => r.x != null && r.o.slug !== v.slug);
  const better = rows.filter((r) => (m.high ? r.x > mine : r.x < mine));
  const worse = rows.filter((r) => (m.high ? r.x < mine : r.x > mine));
  const ties = rows.filter((r) => r.x === mine);
  const total = rows.length + 1;
  const rank = better.length + 1;
  // Voisins immédiats : le moins bon de ceux qui font mieux, le meilleur de ceux qui font moins bien
  const above = better.sort((a, b) => (m.high ? a.x - b.x : b.x - a.x))[0];
  const below = worse.sort((a, b) => (m.high ? b.x - a.x : a.x - b.x))[0];
  const named = (r: { o: Vehicle; x: number }) => `${withArticle(r.o)} (${m.show(r.x)})`;
  // Jumeaux à égalité : « ses 4 jumeaux » plutôt que leurs noms sous chaque chiffre (déjà listés plus bas)
  const twinTies = ties.filter((r) => twinSlugs.has(r.o.slug));
  const tieNames = ties.filter((r) => !twinSlugs.has(r.o.slug)).map((r) => withArticle(r.o));
  if (twinTies.length) {
    const all = twinTies.length === twinSlugs.size;
    tieNames.unshift(
      twinSlugs.size === 1 ? `son jumeau, ${withArticle(twinTies[0]!.o)}` : all ? `ses ${twinSlugs.size} jumeaux` : andList(twinTies.map((r) => withArticle(r.o))),
    );
  }
  const tieText = tieNames.length ? `À égalité avec ${andList(tieNames)}. ` : "";
  let text: string;
  if (!above && below) text = `${cap(m.best)} des fourgons du catalogue, devant ${named(below)}.`;
  else if (above && !below) text = `${cap(m.worst)} des fourgons du catalogue, derrière ${named(above)}.`;
  else if (above && below) text = `Juste derrière ${named(above)}, devant ${named(below)}.`;
  else text = "";
  return { title: m.title, value: m.show(mine), rank: `${rankWord(rank)} sur ${total} fourgons`, text: tieText + text };
}

function twinLine(v: Vehicle, t: Vehicle): string {
  const fv = getVehicleSeoFacts(v);
  const ft = getVehicleSeoFacts(t);
  const parts: string[] = [];
  if (fv.priceMin != null && ft.priceMin != null) {
    const d = ft.priceMin - fv.priceMin;
    parts.push(Math.abs(d) < 50 ? "même prix d'entrée" : `${formatPrice(Math.abs(d))} de ${d > 0 ? "plus" : "moins"} à l'entrée`);
  }
  const same: string[] = [];
  if (t.usableCapacity_kWh !== v.usableCapacity_kWh) parts.push(`batterie de ${formatNumber(t.usableCapacity_kWh, 1)} kWh au lieu de ${formatNumber(v.usableCapacity_kWh, 1)}`);
  else same.push("batterie");
  if (t.power_kW !== v.power_kW) parts.push(`${formatNumber(t.power_kW)} kW au lieu de ${formatNumber(v.power_kW)}`);
  else same.push("puissance");
  if (t.warranty.vehicle_years !== v.warranty.vehicle_years) parts.push(`garantie de ${t.warranty.vehicle_years} ans au lieu de ${v.warranty.vehicle_years}`);
  else same.push("garantie");
  if (Math.abs(ft.rangeBest - fv.rangeBest) >= 10) parts.push(`${formatNumber(ft.rangeBest)} km réels au lieu de ${formatNumber(fv.rangeBest)}`);
  const sameText = same.length === 3 ? "mêmes batterie, puissance et garantie" : same.map((x) => `même ${x}`).join(" et ");
  return cap([...parts, sameText].filter(Boolean).join(", ")) + ".";
}

export function utilityNumbers(v: Vehicle, all: Vehicle[]): UtilityNumbers {
  const live = all.filter((o) => getMarketStatus(o) !== "discontinued");
  const vans = isVan(v) ? live.filter(isVan) : [];
  const group = TWIN_GROUPS.find((g) => g.slugs.includes(v.slug));
  const twinSlugs = new Set(group?.slugs.filter((s) => s !== v.slug && all.some((o) => o.slug === s)) ?? []);
  const figures = vans.length > 1 ? METRICS.map((m) => figure(v, vans, m, twinSlugs)).filter((f): f is UtilityFigure => f !== null) : [];

  const twinVehicles = group ? group.slugs.filter((s) => s !== v.slug).map((s) => all.find((o) => o.slug === s)).filter((o): o is Vehicle => !!o) : [];
  let twins: UtilityNumbers["twins"] = null;
  let faq: UtilityNumbers["faq"] = null;
  if (group && twinVehicles.length) {
    const family = [v, ...twinVehicles];
    const plants = new Set(family.map((o) => `${o.assemblyPlant}|${o.productionCountry}`));
    const [plant, country] = [...plants][0]!.split("|");
    const where = plants.size === 1 ? `, ${family.length > 2 ? "tous assemblés" : "assemblés"} à ${plant} (${country})` : "";
    const names = twinVehicles.map((o) => withArticle(o));
    const lead = `${withArticle(v, true)} partage sa base avec ${andList(names)} : ${group.what}${where}. Ce qui change, vu depuis ${withArticle(v)} :`;
    const lines = twinVehicles
      .map((t) => ({ t, price: getVehicleSeoFacts(t).priceMin ?? Infinity }))
      .sort((a, b) => a.price - b.price)
      .map(({ t }) => ({ name: getVehicleName(t), href: url(`/vehicules/${t.slug}/`), text: twinLine(v, t) }));

    const priced = family.map((o) => ({ o, p: getVehicleSeoFacts(o).priceMin })).filter((x): x is { o: Vehicle; p: number } => x.p != null);
    const mine = getVehicleSeoFacts(v).priceMin;
    let summary = "";
    if (priced.length > 1 && mine != null) {
      const cheapest = priced.reduce((a, b) => (b.p < a.p ? b : a));
      summary =
        cheapest.o.slug === v.slug || cheapest.p === mine
          ? `${withArticle(v, true)} est ${twinVehicles.length > 1 ? "le moins cher de la famille" : "le moins cher des deux"} à l'entrée.`
          : `Le moins cher à l'entrée est ${withArticle(cheapest.o)} : ${withArticle(v)} coûte ${formatPrice(mine - cheapest.p)} de plus pour la même base.`;
    }
    twins = { lead, lines, summary };

    const all3 = [getVehicleName(v), ...twinVehicles.map(getVehicleName)];
    faq = {
      question: `${andList(all3).replace(/ et ([^,]+)$/, " ou $1")} : quelle différence ?`,
      answer: `${family.length > 2 ? `Ces ${family.length} modèles` : "Les deux modèles"} partagent la même base : ${group.what}${where}. ${lines.map((l) => `${l.name} face ${withArticle(v).startsWith("le ") ? `au ${getVehicleName(v)}` : `à ${withArticle(v)}`} : ${l.text.charAt(0).toLowerCase()}${l.text.slice(1)}`).join(" ")} ${summary}`.trim(),
    };
  }

  return { vans: vans.length, figures, twins, faq };
}
