/**
 * Hypothèses de coût communes au calculateur de coût réel, à Ma semaine, aux fiches et à l'accueil.
 * Module sans dépendance : le calculateur (components/tco) et lib/map/fuel en dépendent tous deux.
 */
export const COST_DEFAULTS = {
  km_per_year: 15000,
  years: 5,
  elec_home_eur_kwh: 0.21,
  elec_fast_eur_kwh: 0.45,
  fast_charge_pct: 20,
  diesel_eur_l: 1.72,
  essence_eur_l: 1.78,
  ice_conso_l_100: 6.5,
  ice_price: 30000,
  ice_maintenance_eur_yr: 1100,
  ev_maintenance_eur_yr: 450,
  insurance_ev_eur_yr: 650,
  insurance_ice_eur_yr: 600,
  ev_residual_pct: 55,
  ice_residual_pct: 45,
  tvs_ice_eur_yr: 0,
};

/** Pertes de recharge : l'énergie prise au réseau dépasse celle qui entre dans la batterie */
export const CHARGING_LOSSES = 1.1;
