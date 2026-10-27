/**
 * Planificateur de grand trajet (roadmap K10) : les arrêts de recharge posés sur de vraies bornes
 * rapides IRVE le long du tracé, le temps de chaque arrêt intégré sur la courbe de charge de la
 * version, la consommation selon la vitesse choisie sur autoroute. Fonctions pures.
 *
 * Hypothèses (dites dans « Méthode ») : départ batterie pleine, jamais moins de 10 % à l'arrivée
 * d'un arrêt ou à destination, arrêts jusqu'à 80 % (au-delà la charge ralentit trop ; 90 % si cela
 * évite un arrêt de plus) et seulement ce qu'il faut pour finir. Bornes de 50 kW et plus à moins de 2 km du tracé.
 */
import { RESERVE, climateRatio, type Climate, type RangeSource } from "./energy";
import { CLASS_SPEED, type RangeProfile } from "./roadGraph";
import { chargePower, type VehicleCharging } from "./week";

export type HwSpeed = 110 | 120 | 130;
export const HW_SPEEDS: HwSpeed[] = [110, 120, 130];

/** Plafond d'un arrêt, et jusqu'où on accepte de pousser quand cela évite un arrêt de plus */
const STOP_TARGET = 0.8;
const STOP_STRETCH = 0.9;
/** Marge gardée en repartant d'un arrêt vers la destination */
const MARGIN = 0.05;
/**
 * Vitesse moyenne réellement tenue, pour le temps de conduite (la consommation, elle, suit la
 * vitesse choisie) : sur autoroute, limitations à 110, péages et dépassements ramènent la moyenne
 * à 85 % de la vitesse de croisière ; voie express à 82 % de 110 km/h ; routes et traversées de
 * ville à 50 km/h. Calé sur les temps habituels des grands axes (Paris → Lyon ≈ 4 h 30).
 */
const HW_AVG = 0.85;
const EXPRESS_AVG = 0.82;
const ROAD_AVG_KMH = 50;
/** Bornes retenues : puissance minimale (kW) et écart au tracé (m) */
export const MIN_STATION_KW = 50;
export const CORRIDOR_M = 2_000;

/**
 * Autonomies par type de route à une vitesse d'autoroute donnée. La consommation suit
 * a + b·v², calée sur l'autonomie mixte de la fiche (≈ 105 km/h, moyenne des essais à 90 et
 * 120 km/h) et celle à 130 km/h : à 130 km/h on retrouve exactement l'autonomie autoroute de la fiche.
 */
export function speedProfile(r: RangeSource, usableKWh: number, season: Climate, speed: HwSpeed): RangeProfile {
  const k = climateRatio(r, season);
  const hw130 = r.highway_130_km || r.mixed_km * 0.75;
  const cMix = usableKWh / r.mixed_km;
  const c130 = usableKWh / hw130;
  const b = (c130 - cMix) / (130 ** 2 - 105 ** 2);
  const at = (v: number) => (b > 0 ? usableKWh / (cMix + b * (v ** 2 - 105 ** 2)) : hw130);
  return {
    hw: at(speed) * k,
    express: at(Math.min(speed, 110)) * k,
    road: ((r.mixed_km + r.urban_km) / 2) * k,
  };
}

/** Puissance de la courbe de charge à un niveau de batterie (0-1), en kW */
function curveAt(curve: [number, number][], soc: number) {
  const s = soc * 100;
  if (s <= curve[0]![0]) return curve[0]![1];
  for (let i = 1; i < curve.length; i++) {
    const [s1, p1] = curve[i]!;
    const [s0, p0] = curve[i - 1]!;
    if (s <= s1) return p0 + ((p1 - p0) * (s - s0)) / (s1 - s0);
  }
  return curve.at(-1)![1];
}

/**
 * Minutes de charge entre deux niveaux sur une borne : intégrées pas à pas sur la courbe mesurée
 * (plafonnée par la borne), sinon d'après l'énergie gagnée en 30 minutes.
 */
export function chargeMinutesCurve(from: number, to: number, stationKW: number, v: VehicleCharging) {
  if (to <= from) return 0;
  const curve = v.curve && v.curve.length >= 2 ? v.curve : null;
  if (!curve) return ((to - from) * v.usableKWh) / chargePower(stationKW, v) * 60;
  const step = 0.005;
  let hours = 0;
  for (let s = from; s < to - 1e-9; s += step) {
    const ds = Math.min(step, to - s);
    const p = Math.min(curveAt(curve, s + ds / 2), stationKW * 0.95);
    hours += (ds * v.usableKWh) / Math.max(p, 3);
  }
  return hours * 60;
}

/** Tracé avec, pour chaque point, les kilomètres cumulés par type de route depuis le départ */
export interface RouteProfile {
  coords: [number, number][];
  /** [autoroute, voie express, route] cumulés, même longueur que coords */
  cum: [number, number, number][];
}

/** Borne rapide repérée le long du tracé */
export interface RouteCharger {
  name: string;
  lat: number;
  lon: number;
  kw: number;
  points: number;
  /** Indice du point du tracé le plus proche, et écart au tracé (m) */
  at: number;
  off: number;
}

/** Bornes rapides à moins de CORRIDOR_M du tracé, avec leur position sur celui-ci */
export function chargersOnRoute(route: RouteProfile, chargers: { lat: number; lon: number; kw: number; points: number; name: string }[]): RouteCharger[] {
  const out: RouteCharger[] = [];
  const { coords } = route;
  for (const c of chargers) {
    if (c.kw < MIN_STATION_KW) continue;
    // Écart au segment le plus proche (projection locale en mètres) : les points du tracé sont espacés
    const kx = 111_320 * Math.cos((c.lat * Math.PI) / 180);
    const ky = 110_540;
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lon1, lat1] = coords[i]!;
      const [lon2, lat2] = coords[i + 1]!;
      // Filtre grossier avant le calcul exact (≈ 3 km autour du segment)
      if (Math.min(lat1, lat2) - c.lat > 0.03 || c.lat - Math.max(lat1, lat2) > 0.03) continue;
      if (Math.min(lon1, lon2) - c.lon > 0.045 || c.lon - Math.max(lon1, lon2) > 0.045) continue;
      const ax = (lon1 - c.lon) * kx, ay = (lat1 - c.lat) * ky;
      const bx = (lon2 - c.lon) * kx, by = (lat2 - c.lat) * ky;
      const dx = bx - ax, dy = by - ay;
      const len = dx * dx + dy * dy;
      const u = len > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
      const d = Math.hypot(ax + u * dx, ay + u * dy);
      if (d < bestD) {
        bestD = d;
        best = u < 0.5 ? i : i + 1;
      }
    }
    if (best >= 0 && bestD <= CORRIDOR_M) out.push({ name: c.name, lat: c.lat, lon: c.lon, kw: c.kw, points: c.points, at: best, off: bestD });
  }
  return out;
}

export interface RoadStop {
  name: string;
  lat: number;
  lon: number;
  kw: number;
  /** Kilomètres depuis le départ */
  km: number;
  /** Batterie à l'arrivée et au départ de la borne (0-1) */
  arrive: number;
  leave: number;
  minutes: number;
}

export interface RoadPlan {
  stops: RoadStop[];
  /** Minutes de recharge et de route, par aller */
  chargeMinutes: number;
  driveMinutes: number;
  /** Batterie à destination (0-1) */
  arrive: number;
  /** Énergie d'un aller (kWh batterie) et part rechargée sur borne rapide */
  kwh: number;
  kwhRoad: number;
  /** Tronçon sans borne rapide assez proche : kilomètres depuis le départ où le plan s'arrête */
  gapKm: number | null;
}

/** Un aller : les arrêts nécessaires, choisis parmi les bornes du tracé */
export function planRoadTrip(
  route: RouteProfile,
  chargers: RouteCharger[],
  range: RangeSource,
  charging: VehicleCharging,
  season: Climate,
  speed: HwSpeed
): RoadPlan {
  const p = speedProfile(range, charging.usableKWh, season, speed);
  const used = route.cum.map(([hw, ex, rd]) => hw / p.hw + ex / p.express + rd / p.road);
  const kmAt = route.cum.map(([hw, ex, rd]) => hw + ex + rd);
  const last = used.length - 1;
  const [hwKm, exKm, rdKm] = route.cum[last]!;
  const driveMinutes = (hwKm / (speed * HW_AVG) + exKm / (Math.min(speed, CLASS_SPEED[1]!) * EXPRESS_AVG) + rdKm / ROAD_AVG_KMH) * 60;

  // Une borne par point du tracé au plus : la plus puissante
  const byPoint = new Map<number, RouteCharger>();
  for (const c of chargers) {
    const cur = byPoint.get(c.at);
    if (!cur || c.kw > cur.kw || (c.kw === cur.kw && c.points > cur.points)) byPoint.set(c.at, c);
  }
  const candidates = [...byPoint.values()].sort((a, b) => a.at - b.at);

  const stops: RoadStop[] = [];
  let soc = 1;
  let at = 0;
  let charged = 0;
  let gapKm: number | null = null;
  while (stops.length < 15) {
    const toEnd = used[last]! - used[at]!;
    if (soc - toEnd >= RESERVE) break;
    const budget = soc - RESERVE;
    const reachable = candidates.filter((c) => c.at > at && used[c.at]! - used[at]! <= budget && kmAt[c.at]! - kmAt[at]! > 5);
    if (!reachable.length) {
      gapKm = Math.round(kmAt[at]!);
      break;
    }
    // La plus lointaine, mais une borne de 150 kW et plus (puis 100 kW) si elle tombe dans les
    // derniers 15 % de batterie atteignables : moins de minutes à la borne pour peu de distance perdue
    const far = used[reachable.at(-1)!.at]!;
    const window = reachable.filter((c) => used[c.at]! >= far - 0.15);
    const pick = [...window].reverse().find((c) => c.kw >= 150) ?? [...window].reverse().find((c) => c.kw >= 100) ?? reachable.at(-1)!;
    const arrive = soc - (used[pick.at]! - used[at]!);
    const need = used[last]! - used[pick.at]! + RESERVE + MARGIN;
    // Jusqu'à 80 %, ou un peu plus si cela suffit à finir sans nouvel arrêt
    const leave = Math.max(arrive, need <= STOP_STRETCH ? need : need - MARGIN <= STOP_STRETCH ? STOP_STRETCH : STOP_TARGET);
    const minutes = chargeMinutesCurve(arrive, leave, pick.kw, charging);
    stops.push({ name: pick.name, lat: pick.lat, lon: pick.lon, kw: pick.kw, km: Math.round(kmAt[pick.at]!), arrive, leave, minutes });
    charged += leave - arrive;
    soc = leave;
    at = pick.at;
  }
  const arrive = soc - (used[last]! - used[at]!);
  return {
    stops,
    chargeMinutes: stops.reduce((s, x) => s + x.minutes, 0),
    driveMinutes,
    arrive,
    kwh: used[last]! * charging.usableKWh,
    kwhRoad: charged * charging.usableKWh,
    gapKm,
  };
}
