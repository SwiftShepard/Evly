/**
 * Chiffres propres à une marque (roadmap G12) : ce que la page marque peut dire que les fiches
 * ne disent pas, situé face au reste du catalogue. Écart entre l'annonce WLTP et la route (mêmes
 * mesures que l'observatoire), meilleur modèle par -5 °C (classement d'hiver), plus rapide sur
 * Paris → Lyon (grands trajets) et coût sur 5 ans de la moins chère (même calcul que les duels).
 * Module serveur, appelé au build.
 */
import type { Vehicle } from "@/data/schemas";
import { getBrandGaps, getMeasuredModels, getObservatoryFacts } from "@/lib/observatory";
import { getWinterRanking } from "@/lib/winterRanking";
import { costText, duration, getTripResult, stopsText, tripCost, tripTitle } from "@/lib/roadTrips";
import { fiveYears } from "@/lib/duelNumbers";
import { COST_DEFAULTS } from "@/lib/costDefaults";
import { getVehicleName, withArticle } from "@/lib/seo";
import { formatNumber, formatPrice } from "@/lib/format";
import { url } from "@/lib/url";

const TRIP = "paris-lyon";
/** Sous cet écart de points, la marque est « dans la médiane » du catalogue */
const SAME_PCT = 2;

export interface BrandFigure {
  title: string;
  /** Le chiffre, en grand */
  value: string;
  /** De quel modèle il s'agit, et son rang */
  detail: string;
  /** Ce que le chiffre veut dire face au reste du catalogue */
  text: string;
  href: string;
  link: string;
}

export interface BrandNumbers {
  figures: BrandFigure[];
  faq: { question: string; answer: string }[];
}

const rankOf = (i: number) => (i === 0 ? "1re" : `${i + 1}e`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** « inférieure de 12 % », ou « supérieure » quand la route bat l'annonce */
const versusWltp = (gap: number) => `${gap >= 0 ? "inférieure" : "supérieure"} de ${pct(gap)}`;
const pct = (x: number) => `${formatNumber(Math.round(Math.abs(x)))} %`;
const signed = (x: number) => (Math.round(x) === 0 ? "0 %" : `${x > 0 ? "-" : "+"}${pct(x)}`);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** Coût sur 5 ans de la version d'entrée de chaque voiture vendue, du moins cher au plus cher */
let costCache: { vehicle: Vehicle; total: number }[] | null = null;
function costRanking() {
  costCache ??= getWinterRanking()
    .map((r) => ({ vehicle: r.vehicle, total: fiveYears(r.vehicle) }))
    .filter((x): x is { vehicle: Vehicle; total: number } => x.total !== null)
    .sort((a, b) => a.total - b.total);
  return costCache;
}

export async function brandNumbers(brand: string): Promise<BrandNumbers> {
  const figures: BrandFigure[] = [];
  const faq: BrandNumbers["faq"] = [];
  const mine = (v: Vehicle) => v.brand === brand;

  // Annonce et route : écart médian des modèles mesurés, face au catalogue
  const measured = getMeasuredModels().filter((m) => mine(m.vehicle));
  if (measured.length) {
    const fleet = getObservatoryFacts();
    const gap = median(measured.map((m) => m.gapPct));
    const ranked = getBrandGaps();
    const mineGap = ranked.find((g) => g.brand === brand);
    // Rang partagé en cas d'égalité : on compte ceux qui font strictement mieux
    const rank = mineGap ? ranked.filter((g) => g.medianPct < mineGap.medianPct).length : -1;
    const versus =
      Math.abs(gap - fleet.medianGapPct) < SAME_PCT
        ? `dans la médiane du catalogue (${signed(fleet.medianGapPct)})`
        : gap < fleet.medianGapPct
          ? `plus près de l'annonce que la médiane du catalogue (${signed(fleet.medianGapPct)})`
          : `plus loin de l'annonce que la médiane du catalogue (${signed(fleet.medianGapPct)})`;
    const who =
      measured.length === 1
        ? `${getVehicleName(measured[0]!.vehicle)}, seule mesurée sur route`
        : `médiane de ${measured.length} modèles mesurés sur route`;
    figures.push({
      title: "Annonce et route",
      value: signed(gap),
      detail: rank >= 0 ? `${who}, ${rankOf(rank)} marque la plus fidèle sur ${ranked.length}` : who,
      text: `En usage mixte, face au chiffre WLTP : ${versus}.`,
      href: url("/observatoire/"),
      link: "L'observatoire de l'autonomie",
    });
    faq.push({
      question: `Les ${brand} électriques tiennent-elles leur autonomie annoncée ?`,
      answer:
        measured.length === 1
          ? `${withArticle(measured[0]!.vehicle, true)}, seule ${brand} mesurée sur route, fait ${formatNumber(measured[0]!.realKm)} km réels en usage mixte pour ${formatNumber(measured[0]!.wltpKm)} km WLTP : une autonomie ${versusWltp(gap)} à l'annonce. Sur les ${fleet.measuredModels} modèles mesurés, l'écart médian est de ${signed(fleet.medianGapPct)}.`
          : `Sur ${measured.length} ${brand} mesurées sur route, l'autonomie réelle en usage mixte est ${versusWltp(gap)} à l'annonce WLTP en valeur médiane. Sur les ${fleet.measuredModels} modèles mesurés, l'écart médian est de ${signed(fleet.medianGapPct)}.`,
    });
  }

  // Par -5 °C : le plus endurant de la marque dans le classement d'hiver
  const winter = getWinterRanking();
  const wi = winter.findIndex((r) => mine(r.vehicle));
  if (wi >= 0) {
    const w = winter[wi]!;
    figures.push({
      title: "Par -5 °C",
      value: `${formatNumber(w.winter)} km`,
      detail: `${w.name}, ${rankOf(winter.filter((r) => r.winter > w.winter).length)} sur ${winter.length}`,
      text: `${pct(w.lossPct)} de moins qu'en usage mixte, dans sa version la plus endurante. Médiane du classement : ${formatNumber(Math.round(median(winter.map((r) => r.winter))))} km.`,
      href: url("/autonomie-hiver/"),
      link: "Le classement d'hiver",
    });
  }

  // Paris → Lyon : le plus rapide de la marque, l'été, recharges comprises
  const trip = await getTripResult(TRIP);
  if (trip) {
    const rows = [...trip.rows].sort((a, b) => a.summer.totalMin - b.summer.totalMin);
    const ti = rows.findIndex((r) => mine(r.vehicle));
    if (ti >= 0) {
      const t = rows[ti]!;
      const best = rows[0]!;
      const rank = rows.filter((r) => r.summer.totalMin < t.summer.totalMin).length;
      figures.push({
        title: `${tripTitle(trip.axis)}, l'été`,
        value: duration(t.summer.totalMin),
        detail: `${t.name}, ${rankOf(rank)} sur ${rows.length}`,
        text:
          rank === 0
            ? `${cap(stopsText(t.summer.stops))}, ${costText(tripCost(t.summer).total)} d'énergie : le meilleur temps du classement, recharges comprises.`
            : `${cap(stopsText(t.summer.stops))}, ${costText(tripCost(t.summer).total)} d'énergie. Le meilleur temps du classement : ${duration(best.summer.totalMin)}.`,
        href: url(`/trajets/${trip.axis.slug}/`),
        link: "Tout le classement du trajet",
      });
    }
  }

  // Sur 5 ans : la moins chère à l'usage de la marque, face au catalogue
  const costs = costRanking();
  const ci = costs.findIndex((x) => mine(x.vehicle));
  if (ci >= 0) {
    const c = costs[ci]!;
    figures.push({
      title: `Sur ${COST_DEFAULTS.years} ans`,
      value: formatPrice(Math.round(c.total / 10) * 10),
      detail: `${getVehicleName(c.vehicle)}, ${rankOf(costs.filter((x) => x.total < c.total).length)} sur ${costs.length}`,
      text: `Version d'entrée à ${formatNumber(COST_DEFAULTS.km_per_year)} km par an : achat moins revente, énergie, entretien et assurance, prime de tout ménage déduite. Médiane du catalogue : ${formatPrice(Math.round(median(costs.map((x) => x.total)) / 100) * 100)}.`,
      href: url(`/simulateur/?v=${c.vehicle.slug}`),
      link: "Votre cas dans le simulateur",
    });
  }

  return { figures, faq };
}
