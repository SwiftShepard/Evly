/**
 * Électrique ou essence (roadmap M10) : la version électrique d'entrée face à son jumeau thermique
 * (data/iceTwins), avec le calcul du simulateur de coût réel (lib/tco) et ses hypothèses par défaut
 * (lib/costDefaults) : le simulateur ouvert sur le même modèle donne les mêmes chiffres.
 * Consommation réelle des deux côtés (autonomie réelle de la fiche pour l'électrique, WLTP corrigé
 * de l'écart mesuré par la Commission européenne pour le thermique), prime CEE de tout ménage,
 * entretien, assurance et revente moyens (data/runningCosts).
 */
import type { Vehicle, VehicleConfiguration } from "@/data/schemas";
import { ICE_TWINS, realL100, type IceTwin } from "@/data/iceTwins";
import { COST_DEFAULTS, residualPct } from "@/lib/costDefaults";
import { computeTco, type TcoInputs, type TcoResult } from "@/lib/tco";
import { isVehicleEligibleCEE, primeFor, primeGridOf } from "@/lib/cee";
import { batteryOf } from "@/lib/map/versions";
import { getVehicleBySlug } from "@/lib/vehicles";
import { getVehicleName } from "@/lib/seo";

/** Hypothèses de la comparaison, aussi passées au script de la page (curseur des kilomètres) */
export const EVI = {
  km: COST_DEFAULTS.km_per_year,
  years: COST_DEFAULTS.years,
  elecHome: COST_DEFAULTS.elec_home_eur_kwh,
  elecFast: COST_DEFAULTS.elec_fast_eur_kwh,
  fastPct: COST_DEFAULTS.fast_charge_pct,
  fuel: COST_DEFAULTS.essence_eur_l,
  maintEv: COST_DEFAULTS.ev_maintenance_eur_yr,
  maintIce: COST_DEFAULTS.ice_maintenance_eur_yr,
  insEv: COST_DEFAULTS.insurance_ev_eur_yr,
  insIce: COST_DEFAULTS.insurance_ice_eur_yr,
  resEv: residualPct("ev", COST_DEFAULTS.years),
  resIce: residualPct("ice", COST_DEFAULTS.years),
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
  /** Prime CEE de tout ménage (0 si la version n'y a pas droit) et sa grille, pour « votre prix » */
  aid: number;
  primeGrid: "standard" | "europe" | null;
  evNet: number;
  battery: number;
  /** Consommations réelles, au dixième comme dans le simulateur : kWh/100 km (batterie) et l/100 km */
  evKwh100: number;
  iceL100: number;
  /** Énergie aux 100 km (€) */
  ev100: number;
  ice100: number;
  /** Écart à l'achat, prime déduite (positif : l'électrique coûte plus cher) */
  gap: number;
  /** Ce que l'électrique fait gagner chaque année à l'usage, au kilométrage par défaut */
  yearlySaving: number;
  /** Années d'usage pour rattraper l'écart à l'achat (0 : moins chère dès l'achat ; null : jamais) ; la revente est dans le total */
  breakevenYears: number | null;
  /** Kilomètres par an à partir desquels l'électrique coûte moins sur la durée, revente comprise */
  breakevenKm: number | null;
  /** Coût sur la durée par défaut, poste par poste (lib/tco) */
  tco: TcoResult;
  total: { ev: number; ice: number };
  range: { mixed: number; winter: number };
  dcMin: number | null;
}

function compute(twin: IceTwin): EvVsIce | null {
  const vehicle = getVehicleBySlug(twin.ev);
  const config = vehicle?.configurations.find((c) => c.id === twin.evConfig);
  if (!vehicle || !config?.price_EUR) return null;
  const rr = config.realRange ?? vehicle.realRange;
  const battery = batteryOf(vehicle, config);
  const aid = isVehicleEligibleCEE(vehicle, config.price_EUR) ? primeFor(vehicle, "autres") : 0;
  const evKwh100 = Math.round((battery / rr.mixed_km) * 1000) / 10;
  const iceL100 = realL100(twin);
  const inputs: TcoInputs = {
    km: EVI.km,
    years: EVI.years,
    evPrice: config.price_EUR,
    evAid: aid,
    evConso: evKwh100,
    elecHome: EVI.elecHome,
    elecFast: EVI.elecFast,
    fastPct: EVI.fastPct,
    icePrice: twin.price,
    iceConso: iceL100,
    fuelPrice: EVI.fuel,
    evMaint: EVI.maintEv,
    iceMaint: EVI.maintIce,
    evInsurance: EVI.insEv,
    iceInsurance: EVI.insIce,
    evResidualPct: EVI.resEv,
    iceResidualPct: EVI.resIce,
  };
  const tco = computeTco(inputs);
  // Kilométrage annuel où les deux coûts sur la durée s'égalent : écart de décote = années × (km × écart au km + écart fixe)
  const perKm = (tco.ice100 - tco.ev100) / 100;
  const fixed = EVI.maintIce + EVI.insIce - EVI.maintEv - EVI.insEv;
  const depGap = tco.ev.depreciation - tco.ice.depreciation;
  const breakevenKm = perKm > 0 ? Math.max(0, (depGap / EVI.years - fixed) / perKm) : null;
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
    primeGrid: primeGridOf(vehicle, config.price_EUR),
    evNet: tco.ev.purchase,
    battery,
    evKwh100,
    iceL100,
    ev100: tco.ev100,
    ice100: tco.ice100,
    gap: tco.gap,
    yearlySaving: tco.yearlySaving,
    breakevenYears: tco.paybackYears,
    breakevenKm,
    tco,
    total: { ev: tco.ev.total, ice: tco.ice.total },
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
