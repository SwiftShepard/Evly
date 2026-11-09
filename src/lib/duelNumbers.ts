/**
 * Chiffres propres à une paire de duel (roadmap G12) : ce qui sépare vraiment les deux modèles,
 * calculé et non répété des fiches. Coût sur 5 ans des versions d'entrée (lib/tco, hypothèses du
 * simulateur), Paris → Lyon (lib/roadTrips, version la plus rapide de chacun) et autonomie par
 * -5 °C avec le rang du classement d'hiver (lib/winterRanking). Module serveur, appelé au build.
 */
import type { Vehicle } from "@/data/schemas";
import { COST_DEFAULTS, residualPct } from "@/lib/costDefaults";
import { computeTco } from "@/lib/tco";
import { isVehicleEligibleCEE, primeFor } from "@/lib/cee";
import { batteryOf } from "@/lib/map/versions";
import { costText, duration, getTripResult, stopsText, tripCost, tripTitle } from "@/lib/roadTrips";
import { getWinterRanking } from "@/lib/winterRanking";
import { withArticle } from "@/lib/seo";
import { formatNumber, formatPrice } from "@/lib/format";

/** Le trajet de référence : le plus cherché des grands trajets */
const TRIP = "paris-lyon";
/** Sous ces écarts, on parle d'égalité */
const SAME_EUR = 300;
const SAME_MIN = 5;
const SAME_KM = 10;

export interface DuelNumbers {
  cost: { a: number; b: number; text: string } | null;
  trip: { slug: string; title: string; km: number; a: string; b: string; text: string } | null;
  winter: { a: string; b: string; text: string } | null;
  /** Une question de plus pour la FAQ, propre à la paire */
  faq: { question: string; answer: string } | null;
}

/** Coût sur 5 ans de la version d'entrée, revente comprise, aux hypothèses par défaut du simulateur */
export function fiveYears(v: Vehicle) {
  const priced = v.configurations.filter((c) => c.price_EUR && c.availability !== "discontinued");
  if (!priced.length) return null;
  const c = priced.reduce((x, y) => (y.price_EUR! < x.price_EUR! ? y : x));
  const rr = c.realRange ?? v.realRange;
  const tco = computeTco({
    km: COST_DEFAULTS.km_per_year,
    years: COST_DEFAULTS.years,
    evPrice: c.price_EUR!,
    evAid: isVehicleEligibleCEE(v, c.price_EUR) ? primeFor(v, "autres") : 0,
    evConso: Math.round((batteryOf(v, c) / rr.mixed_km) * 1000) / 10,
    elecHome: COST_DEFAULTS.elec_home_eur_kwh,
    elecFast: COST_DEFAULTS.elec_fast_eur_kwh,
    fastPct: COST_DEFAULTS.fast_charge_pct,
    // Le côté thermique n'est pas lu ici : seules les deux électriques sont comparées
    icePrice: COST_DEFAULTS.ice_price,
    iceConso: COST_DEFAULTS.ice_conso_l_100,
    fuelPrice: COST_DEFAULTS.essence_eur_l,
    evMaint: COST_DEFAULTS.ev_maintenance_eur_yr,
    iceMaint: COST_DEFAULTS.ice_maintenance_eur_yr,
    evInsurance: COST_DEFAULTS.insurance_ev_eur_yr,
    iceInsurance: COST_DEFAULTS.insurance_ice_eur_yr,
    evResidualPct: residualPct("ev", COST_DEFAULTS.years),
    iceResidualPct: residualPct("ice", COST_DEFAULTS.years),
  });
  return tco.ev.total;
}

export async function duelNumbers(va: Vehicle, vb: Vehicle): Promise<DuelNumbers> {
  const la = (v: Vehicle) => withArticle(v);
  const La = (v: Vehicle) => withArticle(v, true);

  // Coût sur 5 ans
  const ca = fiveYears(va);
  const cb = fiveYears(vb);
  let cost: DuelNumbers["cost"] = null;
  if (ca !== null && cb !== null) {
    const [cheap, dear] = ca <= cb ? [va, vb] : [vb, va];
    const diff = Math.abs(ca - cb);
    const text =
      diff < SAME_EUR
        ? `Sur ${COST_DEFAULTS.years} ans à ${formatNumber(COST_DEFAULTS.km_per_year)} km par an, les deux reviennent au même prix, à ${formatPrice(SAME_EUR)} près, prime et revente comprises.`
        : `Sur ${COST_DEFAULTS.years} ans à ${formatNumber(COST_DEFAULTS.km_per_year)} km par an, ${la(cheap)} revient ${formatPrice(Math.round(diff / 10) * 10)} moins cher que ${la(dear)}, prime et revente comprises (versions d'entrée).`;
    cost = { a: ca, b: cb, text };
  }

  // Paris → Lyon
  let trip: DuelNumbers["trip"] = null;
  const r = await getTripResult(TRIP);
  const ra = r?.rows.find((x) => x.vehicle.slug === va.slug);
  const rb = r?.rows.find((x) => x.vehicle.slug === vb.slug);
  if (r && ra && rb) {
    const line = (row: typeof ra) => `${duration(row.summer.totalMin)}, ${stopsText(row.summer.stops)}, ${costText(tripCost(row.summer).total)} d'énergie`;
    const diff = Math.abs(ra.summer.totalMin - rb.summer.totalMin);
    const [fast, slow] = ra.summer.totalMin <= rb.summer.totalMin ? [va, vb] : [vb, va];
    const text =
      diff < SAME_MIN
        ? `Sur ${tripTitle(r.axis)} (${formatNumber(Math.round(r.km))} km), les deux arrivent en même temps, à quelques minutes près.`
        : `Sur ${tripTitle(r.axis)} (${formatNumber(Math.round(r.km))} km), ${la(fast)} arrive ${duration(diff)} plus tôt que ${la(slow)}, l'été, recharges comprises.`;
    trip = { slug: r.axis.slug, title: tripTitle(r.axis), km: Math.round(r.km), a: line(ra), b: line(rb), text };
  }

  // Par -5 °C
  let winter: DuelNumbers["winter"] = null;
  const ranking = getWinterRanking();
  const ia = ranking.findIndex((x) => x.vehicle.slug === va.slug);
  const ib = ranking.findIndex((x) => x.vehicle.slug === vb.slug);
  if (ia >= 0 && ib >= 0) {
    const wa = ranking[ia]!;
    const wb = ranking[ib]!;
    // Rang partagé en cas d'égalité : on compte ceux qui vont strictement plus loin
    const line = (w: typeof wa) => {
      const i = ranking.filter((x) => x.winter > w.winter).length;
      return `${formatNumber(w.winter)} km, ${i === 0 ? "1er" : `${i + 1}e`} sur ${ranking.length}`;
    };
    const diff = Math.abs(wa.winter - wb.winter);
    const [far, near] = wa.winter >= wb.winter ? [va, vb] : [vb, va];
    const text =
      diff < SAME_KM
        ? `Par -5 °C, les deux font jeu égal, à ${SAME_KM} km près, dans leur version la plus endurante.`
        : `Par -5 °C, ${la(far)} garde ${formatNumber(diff)} km de plus que ${la(near)}, dans leur version la plus endurante.`;
    winter = { a: line(wa), b: line(wb), text };
  }

  const faq = cost
    ? {
        question: `Entre ${la(va)} et ${la(vb)}, laquelle coûte le moins sur ${COST_DEFAULTS.years} ans ?`,
        answer: `${cost.text} ${La(va)} : ${formatPrice(Math.round(cost.a / 10) * 10)} au total, ${la(vb)} : ${formatPrice(Math.round(cost.b / 10) * 10)} (achat moins revente, énergie, entretien et assurance).`,
      }
    : null;

  return { cost, trip, winter, faq };
}
