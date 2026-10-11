/**
 * « Mon trajet » : le trajet quotidien du visiteur, qui personnalise tout le site
 * (repère sur les règles d'autonomie, filtre du catalogue, panneau des fiches).
 * Stocké sur l'appareil uniquement (localStorage, clé déclarée dans data/legal.ts).
 * Module navigateur : à n'importer que dans des scripts côté client.
 */

export interface Trip {
  /** Trajet quotidien en semaine, aller et retour (km) */
  dailyKm: number;
  /** Recharge possible à domicile */
  homeCharging: boolean;
  /** Le visiteur a réglé son trajet au moins une fois */
  set: boolean;
}

export const TRIP_KEY = "evly-trajet";
/** Une semaine de trajets sans recharger : la règle « ça colle à mon trajet » */
export const TRIP_DAYS = 5;
/** Jours de trajet par mois pour les coûts mensuels */
export const TRIP_DAYS_PER_MONTH = 21;
export const TRIP_MIN = 10;
export const TRIP_MAX = 200;

export const DEFAULT_TRIP: Trip = { dailyKm: 40, homeCharging: true, set: false };

export function readTrip(): Trip {
  try {
    const raw = localStorage.getItem(TRIP_KEY);
    if (raw) {
      const t = JSON.parse(raw) as Partial<Trip>;
      const dailyKm = Math.min(TRIP_MAX, Math.max(TRIP_MIN, Number(t.dailyKm) || DEFAULT_TRIP.dailyKm));
      return { dailyKm, homeCharging: t.homeCharging !== false, set: true };
    }
  } catch {
    /* stockage indisponible : trajet par défaut */
  }
  return DEFAULT_TRIP;
}

export function writeTrip(patch: Partial<Trip>): Trip {
  const next: Trip = { ...readTrip(), ...patch, set: true };
  try {
    localStorage.setItem(TRIP_KEY, JSON.stringify({ dailyKm: next.dailyKm, homeCharging: next.homeCharging }));
  } catch {
    /* stockage indisponible : le réglage vaut pour la page en cours */
  }
  window.dispatchEvent(new CustomEvent<Trip>("trip-changed", { detail: next }));
  return next;
}

/** Abonnement aux changements (même onglet et autres onglets) ; renvoie la fonction de désabonnement */
export function onTripChange(cb: (t: Trip) => void): () => void {
  const local = (e: Event) => cb((e as CustomEvent<Trip>).detail);
  const other = (e: StorageEvent) => { if (e.key === TRIP_KEY) cb(readTrip()); };
  window.addEventListener("trip-changed", local);
  window.addEventListener("storage", other);
  return () => {
    window.removeEventListener("trip-changed", local);
    window.removeEventListener("storage", other);
  };
}

/** Kilomètres d'une semaine de trajets */
export const weekNeed = (t: Trip) => t.dailyKm * TRIP_DAYS;

/** Le modèle tient une semaine de trajets sans recharger, même par -5 °C */
export const fitsTrip = (winterKm: number, t: Trip) => winterKm >= weekNeed(t);

/** Nombre de jours de trajet couverts par une autonomie */
export const daysOf = (km: number, t: Trip) => Math.floor(km / t.dailyKm);

/** Pose le repère « votre semaine » sur toutes les règles d'autonomie de `root` */
export function paintRails(t: Trip = readTrip(), root: ParentNode = document) {
  const need = weekNeed(t);
  root.querySelectorAll<HTMLElement>(".rail").forEach((rail) => {
    rail.style.setProperty("--need", String(need));
    rail.dataset.need = String(need);
    rail.dataset.fit = Number(rail.dataset.winter) >= need ? "1" : "0";
  });
}
