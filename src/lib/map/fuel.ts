/**
 * Prix actuel de l'essence pour comparer : moyenne nationale du SP95-E10 sur les stations
 * mises à jour dans la semaine (flux officiel prix-carburants, data.economie.gouv.fr).
 * Aucune position n'est envoyée. Sans réponse, on garde la valeur par défaut du simulateur.
 */
import { DEFAULTS } from "@/components/tco/TcoCalculator";

const ENDPOINT = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";

export interface FuelPrice {
  /** €/l */
  eur: number;
  /** Stations moyennées (0 : valeur par défaut) */
  stations: number;
  /** Dernière mise à jour du flux (ISO) */
  updated: string | null;
}

/** Voiture essence de comparaison : consommation réelle moyenne d'une compacte (l/100 km) */
export const ICE_L_100 = DEFAULTS.ice_conso_l_100;
/** Électricité à la maison et au travail (€/kWh), et sur borne publique rapide */
export const ELEC_EUR_KWH = 0.2;
export const PUBLIC_EUR_KWH = DEFAULTS.elec_fast_eur_kwh;
/** Pertes de recharge : l'énergie prise au réseau dépasse celle qui entre dans la batterie */
export const CHARGING_LOSSES = 1.1;

let pending: Promise<FuelPrice> | null = null;

export function fuelPrice(): Promise<FuelPrice> {
  pending ??= (async () => {
    const fallback: FuelPrice = { eur: DEFAULTS.essence_eur_l, stations: 0, updated: null };
    try {
      const params = new URLSearchParams({
        select: "avg(e10_prix) as eur, count(e10_prix) as n, max(e10_maj) as maj",
        where: "e10_maj >= now(days=-7)",
        limit: "1",
      });
      const res = await fetch(`${ENDPOINT}?${params}`);
      if (!res.ok) return fallback;
      const row = (await res.json())?.results?.[0];
      const eur = Number(row?.eur);
      // Garde-fou : une moyenne aberrante ne remplace pas la valeur par défaut
      if (!(eur > 0.8 && eur < 4) || !(row.n > 500)) return fallback;
      return { eur, stations: row.n, updated: row.maj ?? null };
    } catch {
      return fallback;
    }
  })();
  return pending;
}
