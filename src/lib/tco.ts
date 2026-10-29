/**
 * Coût total de possession, électrique contre thermique : un seul calcul pour le simulateur
 * (components/tco), le rapport imprimable et les pages « Électrique ou essence » (lib/evVsIce),
 * pour que la même voiture donne partout le même chiffre.
 */
import { CHARGING_LOSSES } from "@/lib/costDefaults";

/** TVA récupérable par une société assujettie : 100 % sur l'électricité, 80 % sur le carburant */
const VAT = 0.2;
const ELEC_HT = 1 / (1 + VAT);
const FUEL_HT = 1 - 0.8 * (VAT / (1 + VAT));

export interface TcoInputs {
  km: number;
  years: number;
  /** Électrique : prix catalogue, prime déduite à l'achat, consommation réelle (kWh/100 km côté batterie) */
  evPrice: number;
  evAid: number;
  evConso: number;
  elecHome: number;
  elecFast: number;
  /** Part des kilomètres rechargés sur borne rapide (%) */
  fastPct: number;
  /** Thermique : prix catalogue, consommation réelle (l/100 km), prix du carburant */
  icePrice: number;
  iceConso: number;
  fuelPrice: number;
  evMaint: number;
  iceMaint: number;
  evInsurance: number;
  iceInsurance: number;
  /** Revente en fin de période, en % du prix catalogue */
  evResidualPct: number;
  iceResidualPct: number;
  /** Société : TVA récupérable sur l'énergie, taxes annuelles du thermique */
  pro?: boolean;
  tvsIce?: number;
}

export interface TcoSide {
  purchase: number;
  resale: number;
  /** Achat moins revente */
  depreciation: number;
  energy: number;
  maintenance: number;
  insurance: number;
  tvs: number;
  total: number;
}

export interface TcoResult {
  ev: TcoSide;
  ice: TcoSide;
  /** Positif : l'électrique coûte moins sur la période */
  savings: number;
  savingsPct: number;
  evPerKm: number;
  icePerKm: number;
  totalKm: number;
  /** Prix du kWh payé, pertes de recharge comprises */
  avgElecPrice: number;
  /** Énergie aux 100 km (€) */
  ev100: number;
  ice100: number;
  /** Ce que l'électrique fait gagner chaque année à l'usage (énergie, entretien, assurance, taxes) */
  yearlySaving: number;
  /** Écart à l'achat, prime déduite (positif : l'électrique coûte plus cher) */
  gap: number;
  /** Années d'usage pour rattraper cet écart (0 : moins chère dès l'achat ; null : jamais). La revente n'y entre pas : elle est dans le total */
  paybackYears: number | null;
}

export function computeTco(i: TcoInputs): TcoResult {
  const pro = i.pro ?? false;
  const totalKm = i.km * i.years;
  const avgElecPrice = (i.elecHome * (1 - i.fastPct / 100) + i.elecFast * (i.fastPct / 100)) * CHARGING_LOSSES * (pro ? ELEC_HT : 1);
  const fuel = i.fuelPrice * (pro ? FUEL_HT : 1);
  const ev100 = i.evConso * avgElecPrice;
  const ice100 = i.iceConso * fuel;
  const tvs = pro ? (i.tvsIce ?? 0) : 0;

  const side = (purchase: number, list: number, residualPct: number, per100: number, maint: number, ins: number, tvsYr: number): TcoSide => {
    const resale = list * (residualPct / 100);
    const energy = (totalKm / 100) * per100;
    const s = { purchase, resale, depreciation: purchase - resale, energy, maintenance: maint * i.years, insurance: ins * i.years, tvs: tvsYr * i.years };
    return { ...s, total: s.depreciation + s.energy + s.maintenance + s.insurance + s.tvs };
  };
  const ev = side(Math.max(0, i.evPrice - i.evAid), i.evPrice, i.evResidualPct, ev100, i.evMaint, i.evInsurance, 0);
  const ice = side(i.icePrice, i.icePrice, i.iceResidualPct, ice100, i.iceMaint, i.iceInsurance, tvs);

  const yearlySaving = (i.km / 100) * (ice100 - ev100) + i.iceMaint + i.iceInsurance + tvs - i.evMaint - i.evInsurance;
  const gap = ev.purchase - ice.purchase;
  const savings = ice.total - ev.total;
  return {
    ev,
    ice,
    savings,
    savingsPct: ice.total > 0 ? (savings / ice.total) * 100 : 0,
    evPerKm: totalKm > 0 ? ev.total / totalKm : 0,
    icePerKm: totalKm > 0 ? ice.total / totalKm : 0,
    totalKm,
    avgElecPrice,
    ev100,
    ice100,
    yearlySaving,
    gap,
    paybackYears: gap <= 0 ? 0 : yearlySaving > 0 ? gap / yearlySaving : null,
  };
}

