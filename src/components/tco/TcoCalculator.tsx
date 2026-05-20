import { useState, useMemo, useCallback } from "react";

/* ---------------------------------------------------------------- */
/* Types                                                             */
/* ---------------------------------------------------------------- */

interface VehicleSummary {
  slug: string;
  brand: string;
  model: string;
  variant: string;
  segment: string;
  price_EUR: number;
  aids_EUR: number;
  consumption_kWh_100km: number;
  realRange_mixed_km: number;
}

interface Props {
  vehicles: VehicleSummary[];
}

/* ---------------------------------------------------------------- */
/* Constants                                                         */
/* ---------------------------------------------------------------- */

const DEFAULTS = {
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

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    Math.round(n)
  );

const fmtPct = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);

/* ---------------------------------------------------------------- */
/* Slider field                                                      */
/* ---------------------------------------------------------------- */

function SliderField({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  accent = false,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  accent?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="tco-slider-field">
      <span className="tco-slider-label">
        <span>{label}</span>
        <span className={accent ? "tco-slider-val accent" : "tco-slider-val"}>
          {fmt(value)} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{
          background: `linear-gradient(to right, var(--color-accent) ${pct}%, var(--color-border) ${pct}%)`,
        }}
      />
    </label>
  );
}

/* ---------------------------------------------------------------- */
/* Number input field                                                */
/* ---------------------------------------------------------------- */

function NumberField({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="tco-number-field">
      <span className="tco-number-label">{label}</span>
      <div className="tco-number-wrap">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
        />
        <span className="tco-number-unit">{unit}</span>
      </div>
    </label>
  );
}

/* ---------------------------------------------------------------- */
/* Bar chart row                                                     */
/* ---------------------------------------------------------------- */

function BarRow({
  label,
  ev,
  ice,
  maxVal,
  color,
}: {
  label: string;
  ev: number;
  ice: number;
  maxVal: number;
  color: string;
}) {
  const evW = maxVal > 0 ? Math.max((ev / maxVal) * 100, 0.5) : 0;
  const iceW = maxVal > 0 ? Math.max((ice / maxVal) * 100, 0.5) : 0;
  return (
    <div className="tco-bar-row">
      <div className="tco-bar-label">{label}</div>
      <div className="tco-bar-bars">
        <div className="tco-bar-track">
          <div
            className="tco-bar-fill ev"
            style={{ width: `${evW}%`, background: color }}
          />
          <span className="tco-bar-amount">{fmt(ev)} EUR</span>
        </div>
        <div className="tco-bar-track">
          <div className="tco-bar-fill ice" style={{ width: `${iceW}%` }} />
          <span className="tco-bar-amount">{fmt(ice)} EUR</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Main component                                                    */
/* ---------------------------------------------------------------- */

export default function TcoCalculator({ vehicles }: Props) {
  // Selected EV
  const [selectedSlug, setSelectedSlug] = useState(vehicles[0]?.slug ?? "");
  const selectedEv = vehicles.find((v) => v.slug === selectedSlug);

  // Usage params
  const [kmPerYear, setKmPerYear] = useState(DEFAULTS.km_per_year);
  const [years, setYears] = useState(DEFAULTS.years);

  // EV energy
  const [elecHome, setElecHome] = useState(DEFAULTS.elec_home_eur_kwh);
  const [elecFast, setElecFast] = useState(DEFAULTS.elec_fast_eur_kwh);
  const [fastPct, setFastPct] = useState(DEFAULTS.fast_charge_pct);
  const [evConso, setEvConso] = useState(
    selectedEv?.consumption_kWh_100km ?? 16
  );

  // ICE ref
  const [fuelType, setFuelType] = useState<"diesel" | "essence">("essence");
  const [fuelPrice, setFuelPrice] = useState(DEFAULTS.essence_eur_l);
  const [iceConso, setIceConso] = useState(DEFAULTS.ice_conso_l_100);
  const [icePrice, setIcePrice] = useState(DEFAULTS.ice_price);

  // Maintenance
  const [evMaint, setEvMaint] = useState(DEFAULTS.ev_maintenance_eur_yr);
  const [iceMaint, setIceMaint] = useState(DEFAULTS.ice_maintenance_eur_yr);

  // Insurance
  const [evInsurance, setEvInsurance] = useState(DEFAULTS.insurance_ev_eur_yr);
  const [iceInsurance, setIceInsurance] = useState(
    DEFAULTS.insurance_ice_eur_yr
  );

  // Residual value
  const [evResidual, setEvResidual] = useState(DEFAULTS.ev_residual_pct);
  const [iceResidual, setIceResidual] = useState(DEFAULTS.ice_residual_pct);

  // TVS
  const [tvsIce, setTvsIce] = useState(DEFAULTS.tvs_ice_eur_yr);

  // Advanced toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update EV conso when vehicle changes
  const handleVehicleChange = useCallback(
    (slug: string) => {
      setSelectedSlug(slug);
      const v = vehicles.find((ve) => ve.slug === slug);
      if (v) setEvConso(v.consumption_kWh_100km);
    },
    [vehicles]
  );

  const handleFuelType = useCallback(
    (ft: "diesel" | "essence") => {
      setFuelType(ft);
      setFuelPrice(ft === "diesel" ? DEFAULTS.diesel_eur_l : DEFAULTS.essence_eur_l);
      setIceConso(ft === "diesel" ? 5.8 : 6.5);
    },
    []
  );

  // Computation
  const result = useMemo(() => {
    const ev = selectedEv;
    if (!ev) return null;

    const totalKm = kmPerYear * years;

    // EV purchase
    const evPurchaseNet = Math.max(0, ev.price_EUR - ev.aids_EUR);
    const evResidualVal = ev.price_EUR * (evResidual / 100);
    const evDepreciation = evPurchaseNet - evResidualVal;

    // EV energy
    const avgElecPrice =
      elecHome * (1 - fastPct / 100) + elecFast * (fastPct / 100);
    const evEnergyCost = (totalKm * evConso) / 100 * avgElecPrice;

    // EV maintenance + insurance
    const evMaintenanceCost = evMaint * years;
    const evInsuranceCost = evInsurance * years;

    const evTotal =
      evDepreciation + evEnergyCost + evMaintenanceCost + evInsuranceCost;

    // ICE purchase
    const iceResidualVal = icePrice * (iceResidual / 100);
    const iceDepreciation = icePrice - iceResidualVal;

    // ICE energy
    const iceEnergyCost = (totalKm * iceConso) / 100 * fuelPrice;

    // ICE maintenance + insurance + TVS
    const iceMaintenanceCost = iceMaint * years;
    const iceInsuranceCost = iceInsurance * years;
    const iceTvsCost = tvsIce * years;

    const iceTotal =
      iceDepreciation +
      iceEnergyCost +
      iceMaintenanceCost +
      iceInsuranceCost +
      iceTvsCost;

    const savings = iceTotal - evTotal;
    const savingsPct = iceTotal > 0 ? (savings / iceTotal) * 100 : 0;

    // Cost per km
    const evPerKm = totalKm > 0 ? evTotal / totalKm : 0;
    const icePerKm = totalKm > 0 ? iceTotal / totalKm : 0;

    // Breakdowns
    const evBreakdown = {
      depreciation: evDepreciation,
      energy: evEnergyCost,
      maintenance: evMaintenanceCost,
      insurance: evInsuranceCost,
      tvs: 0,
    };

    const iceBreakdown = {
      depreciation: iceDepreciation,
      energy: iceEnergyCost,
      maintenance: iceMaintenanceCost,
      insurance: iceInsuranceCost,
      tvs: iceTvsCost,
    };

    // Breakeven in years
    const evFixedAnnual = evDepreciation / years;
    const iceFixedAnnual = iceDepreciation / years;
    const evVarAnnual =
      (kmPerYear * evConso / 100) * avgElecPrice + evMaint + evInsurance;
    const iceVarAnnual =
      (kmPerYear * iceConso / 100) * fuelPrice +
      iceMaint +
      iceInsurance +
      tvsIce;
    const annualDiff = iceVarAnnual - evVarAnnual;
    const fixedOvercost = evFixedAnnual - iceFixedAnnual;
    let breakeven: number | null = null;
    if (annualDiff > 0 && fixedOvercost > 0) {
      breakeven = fixedOvercost / annualDiff;
    } else if (fixedOvercost <= 0) {
      breakeven = 0;
    }

    // Max for bar chart
    const maxBar = Math.max(
      evBreakdown.depreciation,
      iceBreakdown.depreciation,
      evBreakdown.energy,
      iceBreakdown.energy,
      evBreakdown.maintenance,
      iceBreakdown.maintenance,
      evBreakdown.insurance,
      iceBreakdown.insurance,
      iceBreakdown.tvs
    );

    return {
      evTotal,
      iceTotal,
      savings,
      savingsPct,
      evPerKm,
      icePerKm,
      evBreakdown,
      iceBreakdown,
      breakeven,
      maxBar,
      totalKm,
      avgElecPrice,
    };
  }, [
    selectedEv,
    kmPerYear,
    years,
    elecHome,
    elecFast,
    fastPct,
    evConso,
    fuelPrice,
    iceConso,
    icePrice,
    evMaint,
    iceMaint,
    evInsurance,
    iceInsurance,
    evResidual,
    iceResidual,
    tvsIce,
  ]);

  if (!selectedEv || !result) {
    return <p>Aucun vehicule disponible.</p>;
  }

  return (
    <div className="tco-calc">
      {/* ── Vehicle selector ────────────────────────────── */}
      <div className="tco-section">
        <div className="tco-section-header">
          <span className="tco-section-number">01</span>
          <span className="tco-section-title">Vehicule electrique</span>
        </div>

        <select
          className="tco-select"
          value={selectedSlug}
          onChange={(e) => handleVehicleChange(e.target.value)}
        >
          {vehicles.map((v) => (
            <option key={v.slug} value={v.slug}>
              {v.brand} {v.model} {v.variant} — {fmt(v.price_EUR)} EUR
            </option>
          ))}
        </select>

        <div className="tco-ev-summary">
          <div className="tco-ev-stat">
            <span className="tco-stat-label">Prix catalogue</span>
            <span className="tco-stat-value">{fmt(selectedEv.price_EUR)} EUR</span>
          </div>
          <div className="tco-ev-stat">
            <span className="tco-stat-label">Aides deduites</span>
            <span className="tco-stat-value accent">
              -{fmt(selectedEv.aids_EUR)} EUR
            </span>
          </div>
          <div className="tco-ev-stat">
            <span className="tco-stat-label">Autonomie mixte</span>
            <span className="tco-stat-value">
              {fmt(selectedEv.realRange_mixed_km)} km
            </span>
          </div>
          <div className="tco-ev-stat">
            <span className="tco-stat-label">Conso mixte</span>
            <span className="tco-stat-value">
              {fmtPct(selectedEv.consumption_kWh_100km)} kWh/100 km
            </span>
          </div>
        </div>
      </div>

      {/* ── Usage params ────────────────────────────────── */}
      <div className="tco-section">
        <div className="tco-section-header">
          <span className="tco-section-number">02</span>
          <span className="tco-section-title">Votre usage</span>
        </div>

        <SliderField
          label="Kilometres par an"
          unit="km/an"
          value={kmPerYear}
          min={3000}
          max={60000}
          step={1000}
          onChange={setKmPerYear}
          accent
        />
        <SliderField
          label="Duree de detention"
          unit="ans"
          value={years}
          min={1}
          max={10}
          step={1}
          onChange={setYears}
        />
      </div>

      {/* ── Energy ──────────────────────────────────────── */}
      <div className="tco-section">
        <div className="tco-section-header">
          <span className="tco-section-number">03</span>
          <span className="tco-section-title">Energie</span>
        </div>

        <div className="tco-subsection">
          <span className="tco-sub-label">Electricite (VE)</span>
          <div className="tco-row-2">
            <NumberField
              label="Tarif domicile"
              unit="EUR/kWh"
              value={elecHome}
              min={0.05}
              max={0.60}
              step={0.01}
              onChange={setElecHome}
            />
            <NumberField
              label="Tarif rapide"
              unit="EUR/kWh"
              value={elecFast}
              min={0.10}
              max={1.0}
              step={0.01}
              onChange={setElecFast}
            />
          </div>
          <SliderField
            label="Part recharge rapide"
            unit="%"
            value={fastPct}
            min={0}
            max={100}
            step={5}
            onChange={setFastPct}
          />
          <NumberField
            label="Consommation VE"
            unit="kWh/100 km"
            value={evConso}
            min={8}
            max={35}
            step={0.5}
            onChange={setEvConso}
          />
        </div>

        <div className="tco-subsection">
          <span className="tco-sub-label">Carburant (thermique)</span>
          <div className="tco-fuel-toggle">
            <button
              className={fuelType === "essence" ? "active" : ""}
              onClick={() => handleFuelType("essence")}
            >
              Essence
            </button>
            <button
              className={fuelType === "diesel" ? "active" : ""}
              onClick={() => handleFuelType("diesel")}
            >
              Diesel
            </button>
          </div>
          <div className="tco-row-2">
            <NumberField
              label={`Prix ${fuelType}`}
              unit="EUR/L"
              value={fuelPrice}
              min={0.5}
              max={3.0}
              step={0.01}
              onChange={setFuelPrice}
            />
            <NumberField
              label="Consommation"
              unit="L/100 km"
              value={iceConso}
              min={3}
              max={15}
              step={0.1}
              onChange={setIceConso}
            />
          </div>
          <NumberField
            label="Prix thermique neuf"
            unit="EUR"
            value={icePrice}
            min={10000}
            max={80000}
            step={500}
            onChange={setIcePrice}
          />
        </div>
      </div>

      {/* ── Advanced toggle ─────────────────────────────── */}
      <button
        className="tco-advanced-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <span>{showAdvanced ? "Masquer" : "Afficher"} les parametres avances</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{
            transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {showAdvanced && (
        <>
          {/* ── Maintenance ─────────────────────────────── */}
          <div className="tco-section">
            <div className="tco-section-header">
              <span className="tco-section-number">04</span>
              <span className="tco-section-title">Entretien</span>
            </div>
            <div className="tco-row-2">
              <NumberField
                label="Entretien VE"
                unit="EUR/an"
                value={evMaint}
                min={0}
                max={3000}
                step={50}
                onChange={setEvMaint}
              />
              <NumberField
                label="Entretien thermique"
                unit="EUR/an"
                value={iceMaint}
                min={0}
                max={3000}
                step={50}
                onChange={setIceMaint}
              />
            </div>
          </div>

          {/* ── Insurance ──────────────────────────────── */}
          <div className="tco-section">
            <div className="tco-section-header">
              <span className="tco-section-number">05</span>
              <span className="tco-section-title">Assurance</span>
            </div>
            <div className="tco-row-2">
              <NumberField
                label="Assurance VE"
                unit="EUR/an"
                value={evInsurance}
                min={0}
                max={3000}
                step={25}
                onChange={setEvInsurance}
              />
              <NumberField
                label="Assurance thermique"
                unit="EUR/an"
                value={iceInsurance}
                min={0}
                max={3000}
                step={25}
                onChange={setIceInsurance}
              />
            </div>
          </div>

          {/* ── Residual value ─────────────────────────── */}
          <div className="tco-section">
            <div className="tco-section-header">
              <span className="tco-section-number">06</span>
              <span className="tco-section-title">Valeur residuelle</span>
            </div>
            <SliderField
              label={`VE apres ${years} ans`}
              unit="% du prix neuf"
              value={evResidual}
              min={10}
              max={80}
              step={5}
              onChange={setEvResidual}
            />
            <SliderField
              label={`Thermique apres ${years} ans`}
              unit="% du prix neuf"
              value={iceResidual}
              min={10}
              max={80}
              step={5}
              onChange={setIceResidual}
            />
          </div>

          {/* ── TVS (pro only) ─────────────────────────── */}
          <div className="tco-section">
            <div className="tco-section-header">
              <span className="tco-section-number">07</span>
              <span className="tco-section-title">TVS (vehicule de societe)</span>
            </div>
            <NumberField
              label="TVS annuelle thermique"
              unit="EUR/an"
              value={tvsIce}
              min={0}
              max={5000}
              step={50}
              onChange={setTvsIce}
            />
            <p className="tco-hint">
              VE exonere a 100 %. Mettez 0 si vehicule particulier.
            </p>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* RESULTS                                           */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="tco-results">
        <div className="tco-results-header">
          <span className="tco-section-number">R</span>
          <span className="tco-section-title">
            Resultat sur {years} ans / {fmt(result.totalKm)} km
          </span>
        </div>

        {/* Headline savings */}
        <div
          className={`tco-savings-hero ${result.savings < 0 ? "negative" : ""}`}
        >
          <span className="tco-savings-label">
            {result.savings >= 0
              ? "Economie avec le VE"
              : "Surcout du VE"}
          </span>
          <span className="tco-savings-amount">
            {fmt(Math.abs(result.savings))} EUR
          </span>
          <span className="tco-savings-pct">
            {result.savings >= 0 ? "-" : "+"}{fmtPct(Math.abs(result.savingsPct))} %
            {result.breakeven !== null && result.breakeven > 0 && (
              <span className="tco-breakeven">
                {" "}· rentable en {fmtPct(result.breakeven)} an{result.breakeven >= 2 ? "s" : ""}
              </span>
            )}
            {result.breakeven === 0 && (
              <span className="tco-breakeven"> · immediat</span>
            )}
          </span>
        </div>

        {/* Side-by-side totals */}
        <div className="tco-totals-row">
          <div className="tco-total-card ev">
            <span className="tco-total-label">Cout total VE</span>
            <span className="tco-total-amount">{fmt(result.evTotal)} EUR</span>
            <span className="tco-total-perkm">
              {(result.evPerKm * 100).toFixed(1)} ct/km
            </span>
          </div>
          <div className="tco-total-card ice">
            <span className="tco-total-label">Cout total thermique</span>
            <span className="tco-total-amount">{fmt(result.iceTotal)} EUR</span>
            <span className="tco-total-perkm">
              {(result.icePerKm * 100).toFixed(1)} ct/km
            </span>
          </div>
        </div>

        {/* Bar chart breakdown */}
        <div className="tco-breakdown">
          <div className="tco-breakdown-header">
            <span className="tco-section-title">Decomposition</span>
            <div className="tco-legend">
              <span className="tco-legend-ev">VE</span>
              <span className="tco-legend-ice">Thermique</span>
            </div>
          </div>

          <BarRow
            label="Decote"
            ev={result.evBreakdown.depreciation}
            ice={result.iceBreakdown.depreciation}
            maxVal={result.maxBar}
            color="var(--color-accent)"
          />
          <BarRow
            label="Energie"
            ev={result.evBreakdown.energy}
            ice={result.iceBreakdown.energy}
            maxVal={result.maxBar}
            color="var(--color-accent)"
          />
          <BarRow
            label="Entretien"
            ev={result.evBreakdown.maintenance}
            ice={result.iceBreakdown.maintenance}
            maxVal={result.maxBar}
            color="var(--color-accent)"
          />
          <BarRow
            label="Assurance"
            ev={result.evBreakdown.insurance}
            ice={result.iceBreakdown.insurance}
            maxVal={result.maxBar}
            color="var(--color-accent)"
          />
          {result.iceBreakdown.tvs > 0 && (
            <BarRow
              label="TVS"
              ev={0}
              ice={result.iceBreakdown.tvs}
              maxVal={result.maxBar}
              color="var(--color-accent)"
            />
          )}
        </div>

        <p className="tco-disclaimer">
          Calcul indicatif. Les valeurs par defaut (entretien, assurance, decote)
          sont des moyennes marche France 2025 pour le segment concerne.
          Ajustez-les a votre situation. L'electricite est calculee a{" "}
          {fmtPct(result.avgElecPrice * 100)} ct/kWh (mix{" "}
          {100 - fastPct} % domicile / {fastPct} % rapide).
        </p>
      </div>
    </div>
  );
}
