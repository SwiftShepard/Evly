/**
 * Électrique ou essence (roadmap M10) : la version électrique d'entrée face à son jumeau thermique
 * (data/iceTwins), sur les hypothèses du simulateur de coût réel (lib/costDefaults) :
 * consommation réelle des deux côtés (autonomie réelle de la fiche pour l'électrique, WLTP corrigé
 * de l'écart mesuré par la Commission européenne pour le thermique), prime CEE de tout ménage,
 * entretien et assurance moyens. La revente n'est pas comptée : elle se règle dans le simulateur.
 */
import type { Vehicle, VehicleConfiguration } from "@/data/schemas";
import { ICE_TWINS, type IceTwin } from "@/data/iceTwins";
import { FUEL_PRICES, REAL_WORLD_GAP } from "@/data/fuelPrices";
import { TARIF_BLEU } from "@/data/electricity";
import { COST_DEFAULTS, CHARGING_LOSSES } from "@/lib/costDefaults";
import { isVehicleEligibleCEE, primeFor } from "@/lib/cee";
import { batteryOf } from "@/lib/map/versions";
import { getVehicleBySlug } from "@/lib/vehicles";
import { getVehicleName } from "@/lib/seo";

/** Hypothèses de la comparaison, aussi passées au script de la page (curseur des kilomètres) */
export const EVI = {
  km: COST_DEFAULTS.km_per_year,
  years: COST_DEFAULTS.years,
  elecHome: TARIF_BLEU.base,
  elecFast: COST_DEFAULTS.elec_fast_eur_kwh,
  fastShare: COST_DEFAULTS.fast_charge_pct / 100,
  fuel: FUEL_PRICES.e10,
  gap: REAL_WORLD_GAP.petrol,
  maintEv: COST_DEFAULTS.ev_maintenance_eur_yr,
  maintIce: COST_DEFAULTS.ice_maintenance_eur_yr,
  insEv: COST_DEFAULTS.insurance_ev_eur_yr,
  insIce: COST_DEFAULTS.insurance_ice_eur_yr,
};

export interface EvVsIce {
  twin: IceTwin;
  vehicle: Vehicle;
  config: VehicleConfiguration;
  evName: string;
  /** Le thermique sans la marque quand c'est la même (« 208 »), sinon en entier (« Renault Clio ») */
  iceName: string;
  evVersion: string;
  evPrice: number;
  /** Prime CEE de tout ménage (0 si la version n'y a pas droit) */
  aid: number;
  evNet: number;
  battery: number;
  /** Consommations réelles : kWh/100 km (batterie) et l/100 km */
  evKwh100: number;
  iceL100: number;
  /** Prix moyen du kWh payé (80 % à la maison, 20 % sur borne rapide) */
  eurKwh: number;
  /** Énergie aux 100 km (€) */
  ev100: number;
  ice100: number;
  /** Écart à l'achat, prime déduite (positif : l'électrique coûte plus cher) */
  gap: number;
  /** Ce que l'électrique fait gagner chaque année au kilométrage par défaut */
  yearlySaving: number;
  /** Années pour rattraper l'écart à l'achat (0 : moins chère dès l'achat ; null : jamais) */
  breakevenYears: number | null;
  /** Kilomètres par an à partir desquels l'électrique est rentable sur la durée */
  breakevenKm: number | null;
  total: { ev: number; ice: number };
  range: { mixed: number; winter: number };
  dcMin: number | null;
}

/** Coûts annuels (énergie, entretien, assurance) pour un kilométrage donné */
function yearly(c: Pick<EvVsIce, "ev100" | "ice100">, km: number) {
  return {
    ev: (km / 100) * c.ev100 + EVI.maintEv + EVI.insEv,
    ice: (km / 100) * c.ice100 + EVI.maintIce + EVI.insIce,
  };
}

function compute(twin: IceTwin): EvVsIce | null {
  const vehicle = getVehicleBySlug(twin.ev);
  const config = vehicle?.configurations.find((c) => c.id === twin.evConfig);
  if (!vehicle || !config?.price_EUR) return null;
  const rr = config.realRange ?? vehicle.realRange;
  const battery = batteryOf(vehicle, config);
  const aid = isVehicleEligibleCEE(vehicle, config.price_EUR) ? primeFor(vehicle, "autres") : 0;
  const evNet = config.price_EUR - aid;
  const evKwh100 = (battery / rr.mixed_km) * 100;
  const eurKwh = EVI.elecHome * (1 - EVI.fastShare) + EVI.elecFast * EVI.fastShare;
  const ev100 = evKwh100 * CHARGING_LOSSES * eurKwh;
  const iceL100 = twin.wltpL100 * (1 + EVI.gap);
  const ice100 = iceL100 * EVI.fuel;
  const base = { ev100, ice100 };
  const y = yearly(base, EVI.km);
  const yearlySaving = y.ice - y.ev;
  const gap = evNet - twin.price;
  const breakevenYears = gap <= 0 ? 0 : yearlySaving > 0 ? gap / yearlySaving : null;
  // Kilométrage annuel qui rattrape l'écart sur la durée : gap = années × (km × écart au km + écart fixe)
  const perKm = (ice100 - ev100) / 100;
  const fixed = EVI.maintIce + EVI.insIce - EVI.maintEv - EVI.insEv;
  const breakevenKm = gap <= 0 ? 0 : perKm > 0 ? Math.max(0, (gap / EVI.years - fixed) / perKm) : null;
  return {
    twin,
    vehicle,
    config,
    // « Peugeot E-308 & E-308 SW » : la carrosserie comparée seulement
    evName: getVehicleName(vehicle).split(" & ")[0]!,
    iceName: twin.name.startsWith(vehicle.brand) ? twin.name.slice(vehicle.brand.length).trim() : twin.name,
    evVersion: config.label,
    evPrice: config.price_EUR,
    aid,
    evNet,
    battery,
    evKwh100,
    iceL100,
    eurKwh,
    ev100,
    ice100,
    gap,
    yearlySaving,
    breakevenYears,
    breakevenKm,
    total: { ev: evNet + EVI.years * y.ev, ice: twin.price + EVI.years * y.ice },
    range: { mixed: rr.mixed_km, winter: rr.winter_minus5_km },
    dcMin: config.chargingDC_10_80_min ?? vehicle.chargingDC.time_10_80_min ?? null,
  };
}

let cache: EvVsIce[] | null = null;
export function getEvVsIce(): EvVsIce[] {
  cache ??= ICE_TWINS.map(compute).filter((c): c is EvVsIce => c !== null);
  return cache;
}

export const evVsIceOf = (slug: string) => getEvVsIce().find((c) => c.twin.slug === slug);
/** Comparaison où figure une fiche électrique (lien depuis la fiche) */
export const evVsIceForVehicle = (evSlug: string) => getEvVsIce().find((c) => c.twin.ev === evSlug);

/** « essence » ou « hybride », avec l'article qu'il faut */
export const energyLabel = (t: IceTwin) => (t.energy === "hybride" ? "hybride" : "essence");
