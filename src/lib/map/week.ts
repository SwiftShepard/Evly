/**
 * Une semaine type avec un modèle : sorties jour par jour, batterie au fil des
 * jours et recharges, selon trois façons de recharger. Fonctions pures.
 * Niveaux de batterie en fraction (0 à 1).
 */
import { RESERVE } from "./energy";

export type Scenario = "nightly" | "weekly" | "topup";

/** Lundi = 0 … dimanche = 6 */
export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

/** Niveau visé par une recharge du quotidien (habitude recommandée pour la batterie) */
export const DAILY_TARGET = 0.8;

export interface Outing {
  id: string;
  cat: string;
  /** Jours où l'on fait l'aller-retour, et combien de fois ce jour-là */
  days: number[];
  perDay: number;
  /** Aller simple : kilomètres et part de batterie */
  km: number;
  used: number;
}

export interface ChargerSpec {
  /** Puissance de la borne (kW) */
  kw: number;
  /** Jour et sortie pendant laquelle on recharge */
  day: number;
  outingId: string;
}

export interface VehicleCharging {
  usableKWh: number;
  /** Chargeur embarqué AC (kW) */
  acKW: number;
  /** Énergie ajoutée en 30 min sur borne rapide, depuis 10 % (kWh) */
  dc30KWh: number;
  dcPeakKW: number;
  /** Courbe de charge rapide de la version : [niveau de batterie %, kW] (planificateur de grand trajet) */
  curve?: [number, number][];
}

export interface DayResult {
  start: number;
  end: number;
  /** Plus bas niveau atteint dans la journée */
  low: number;
  trips: { outingId: string; used: number }[];
  /** Recharges du jour : sur une borne publique (stop), au travail (work), la nuit à domicile (home) */
  charges: ChargeEvent[];
}

export interface ChargeEvent {
  kind: "home" | "stop" | "work";
  /** Sortie pendant laquelle on recharge (stop, work) */
  trip?: number;
  added: number;
  minutes?: number;
}

export interface WeekResult {
  days: DayResult[];
  /** Kilomètres et batterie de la semaine */
  km: number;
  used: number;
  lowest: number;
  /** La semaine passe sans descendre sous la réserve */
  ok: boolean;
  /** Soirs de recharge à domicile, jours de recharge au travail, recharges d'appoint (jour, minutes) */
  homeNights: number[];
  workDays: number[];
  stops: { day: number; minutes: number }[];
}

export interface WeekOptions {
  /** Une borne au travail : la voiture se recharge pendant la journée */
  workCharging?: boolean;
  /** Sortie « travail » de la semaine */
  workOutingId?: string;
}

/** Borne de parking d'entreprise (AC) : la journée suffit pour revenir à 80 % */
export const WORK_KW = 7.4;

/** Puissance moyenne réellement reçue sur une borne (kW) */
export function chargePower(stationKW: number, v: VehicleCharging) {
  if (stationKW <= 22) return Math.min(stationKW, v.acKW) * 0.9;
  // Sur borne rapide : la moyenne d'une demi-heure de la voiture, plafonnée par la borne
  return Math.min(v.dc30KWh * 2, stationKW * 0.85, v.dcPeakKW);
}

/** Minutes pour faire passer la batterie de `from` à `to` */
export function chargeMinutes(from: number, to: number, stationKW: number, v: VehicleCharging) {
  return ((Math.max(0, to - from) * v.usableKWh) / chargePower(stationKW, v)) * 60;
}

function tripsOf(outings: Outing[], day: number) {
  const out: { outingId: string; used: number }[] = [];
  for (const o of outings) if (o.days.includes(day)) for (let k = 0; k < o.perDay; k++) out.push({ outingId: o.id, used: 2 * o.used });
  return out;
}

/** Recharge prévue : pendant la sortie n° `trip` du jour, ou la nuit (`trip` null) */
interface PlannedCharge {
  day: number;
  trip: number | null;
  target: number;
  kw: number;
  /** Recharge pendant une sortie : borne publique (par défaut) ou travail */
  kind?: "stop" | "work";
}

type Plan = { outingId: string; used: number }[][];

function run(plan: Plan, start: number, charges: PlannedCharge[], v: VehicleCharging) {
  let level = start;
  const days: DayResult[] = plan.map((trips, d) => {
    const dayStart = level;
    let low = level;
    const events: ChargeEvent[] = [];
    trips.forEach((t, k) => {
      const stop = charges.find((c) => c.day === d && c.trip === k);
      if (stop) {
        // Recharge à destination : aller, recharge, retour
        level -= t.used / 2;
        low = Math.min(low, level);
        events.push({ kind: stop.kind ?? "stop", trip: k, added: Math.max(0, stop.target - level), minutes: chargeMinutes(level, stop.target, stop.kw, v) });
        level = Math.max(level, stop.target) - t.used / 2;
      } else {
        level -= t.used;
      }
      low = Math.min(low, level);
    });
    const end = level;
    const night = charges.find((c) => c.day === d && c.trip === null);
    if (night && level < night.target) {
      events.push({ kind: "home", added: night.target - level });
      level = night.target;
    }
    return { start: dayStart, end, low, trips, charges: events };
  });
  return { days, end: level };
}

const firstFailing = (days: DayResult[]) => days.findIndex((d) => d.low < RESERVE);

/** Régime établi : la semaine commence au niveau où la précédente s'est terminée */
const settle = (plan: Plan, charges: PlannedCharge[], v: VehicleCharging) =>
  run(plan, run(plan, DAILY_TARGET, charges, v).end, charges, v).days;

const lowestOf = (days: DayResult[]) => Math.min(...days.map((d) => d.low));

/**
 * Recharge au travail : on part d'une semaine sans recharge et on ajoute, une à une, la
 * recharge qui évite de passer sous la réserve, en préférant le travail, puis la maison,
 * puis la borne publique.
 */
function withWorkCharging(plan: Plan, scenario: Scenario, stop: ChargerSpec | null, v: VehicleCharging, workId: string) {
  const options: { charge: PlannedCharge; rank: number }[] = [];
  plan.forEach((trips, d) => {
    const k = trips.findIndex((t) => t.outingId === workId);
    if (k >= 0) options.push({ charge: { day: d, trip: k, target: DAILY_TARGET, kw: WORK_KW, kind: "work" }, rank: 0 });
  });
  if (scenario === "weekly") plan.forEach((_, d) => options.push({ charge: { day: d, trip: null, target: 1, kw: 0 }, rank: 1 }));
  if (scenario === "topup" && stop) {
    const k = plan[stop.day]!.findIndex((t) => t.outingId === stop.outingId);
    if (k >= 0) options.push({ charge: { day: stop.day, trip: k, target: DAILY_TARGET, kw: stop.kw }, rank: 2 });
    plan.forEach((trips, d) => {
      if (trips.length && d !== stop.day) options.push({ charge: { day: d, trip: 0, target: DAILY_TARGET, kw: stop.kw }, rank: 3 });
    });
  }

  let charges: PlannedCharge[] = [];
  let days = settle(plan, charges, v);
  for (let tries = 0; tries < 7; tries++) {
    if (firstFailing(days) < 0) break;
    const current = lowestOf(days);
    let best: { charges: PlannedCharge[]; days: DayResult[]; lowest: number; rank: number } | null = null;
    for (const o of options) {
      // En régime établi, une recharge en fin de semaine remonte aussi le lundi suivant : tous les jours comptent
      if (charges.some((c) => c.day === o.charge.day && c.trip === o.charge.trip)) continue;
      const tryCharges = [...charges, o.charge];
      const tryDays = settle(plan, tryCharges, v);
      const lowest = lowestOf(tryDays);
      if (lowest <= current + 0.001) continue;
      if (!best || o.rank < best.rank || (o.rank === best.rank && lowest > best.lowest)) best = { charges: tryCharges, days: tryDays, lowest, rank: o.rank };
    }
    if (!best) break;
    charges = best.charges;
    days = best.days;
  }
  return days;
}

export function simulateWeek(
  outings: Outing[],
  scenario: Scenario,
  stop: ChargerSpec | null,
  v: VehicleCharging,
  opts: WeekOptions = {}
): WeekResult {
  const plan: Plan = DAYS.map((_, d) => tripsOf(outings, d));
  const km = outings.reduce((sum, o) => sum + 2 * o.km * o.perDay * o.days.length, 0);
  const used = plan.flat().reduce((sum, t) => sum + t.used, 0);
  let days: DayResult[];
  let charges: PlannedCharge[] = [];
  const workId = opts.workOutingId ?? "travail";

  if (opts.workCharging && scenario !== "nightly" && plan.some((trips) => trips.some((t) => t.outingId === workId))) {
    days = withWorkCharging(plan, scenario, stop, v, workId);
  } else if (scenario === "nightly") {
    // On rebranche chaque soir jusqu'à 80 %
    charges = DAYS.map((_, d) => ({ day: d, trip: null, target: DAILY_TARGET, kw: 0 }));
    days = run(plan, DAILY_TARGET, charges, v).days;
  } else if (scenario === "weekly") {
    // Recharge complète le dimanche soir ; s'il le faut, une de plus, le soir qui équilibre le mieux la semaine
    charges = [{ day: 6, trip: null, target: 1, kw: 0 }];
    days = run(plan, 1, charges, v).days;
    for (let f = firstFailing(days); f > 0; f = firstFailing(days)) {
      let best: { charges: PlannedCharge[]; days: DayResult[]; lowest: number } | null = null;
      for (let night = 0; night < f; night++) {
        if (charges.some((c) => c.day === night)) continue;
        const tryCharges = [...charges, { day: night, trip: null, target: 1, kw: 0 }];
        const tryDays = run(plan, 1, tryCharges, v).days;
        const lowest = Math.min(...tryDays.map((d) => d.low));
        if (!best || lowest >= best.lowest) best = { charges: tryCharges, days: tryDays, lowest };
      }
      if (!best) break;
      charges = best.charges;
      days = best.days;
    }
  } else {
    // Sans prise à domicile : recharge d'appoint jusqu'à 80 % pendant une sortie,
    // en régime établi (la semaine commence au niveau où la précédente s'est terminée)
    if (stop) {
      const k = plan[stop.day]!.findIndex((t) => t.outingId === stop.outingId);
      if (k >= 0) charges.push({ day: stop.day, trip: k, target: DAILY_TARGET, kw: stop.kw });
    }
    days = settle(plan, charges, v);
    // S'il le faut, un deuxième passage à la borne avant le jour où l'on manquerait
    for (let tries = 0, f = firstFailing(days); stop && f >= 0 && tries < 2; tries++, f = firstFailing(days)) {
      let day = f - 1;
      while (day >= 0 && !plan[day]!.length) day--;
      if (day < 0) day = f;
      if (!plan[day]!.length || charges.some((c) => c.day === day)) break;
      charges.push({ day, trip: 0, target: DAILY_TARGET, kw: stop.kw });
      days = settle(plan, charges, v);
    }
  }

  const lowest = lowestOf(days);
  return {
    days,
    km,
    used,
    lowest,
    ok: lowest >= RESERVE,
    homeNights: days.flatMap((d, i) => (d.charges.some((c) => c.kind === "home" && c.added > 0.005) ? [i] : [])),
    workDays: days.flatMap((d, i) => (d.charges.some((c) => c.kind === "work" && c.added > 0.005) ? [i] : [])),
    stops: days.flatMap((d, i) => d.charges.filter((c) => c.kind === "stop").map((c) => ({ day: i, minutes: c.minutes ?? 0 }))),
  };
}
