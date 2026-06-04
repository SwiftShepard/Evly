import { useState, useMemo, useCallback, useEffect, useRef } from "react";

/* ---------------------------------------------------------------- */
/* Types                                                             */
/* ---------------------------------------------------------------- */

interface ConfigSummary {
  id: string;
  label: string;
  trim: string;
  battery: string;
  price_EUR: number;
  consumption_kWh_100km: number;
  realRange_mixed_km: number;
}

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
  configs: ConfigSummary[];
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
/* Animated number hook                                              */
/* ---------------------------------------------------------------- */

function useAnimatedNumber(target: number, duration = 400): number {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number>(0);
  const startRef = useRef(target);
  const startTimeRef = useRef(0);

  useEffect(() => {
    startRef.current = display;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startRef.current + (target - startRef.current) * eased;
      setDisplay(current);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

function AnimatedAmount({ value, suffix = "EUR", className }: { value: number; suffix?: string; className?: string }) {
  const animated = useAnimatedNumber(value);
  return <span className={className}>{fmt(animated)} {suffix}</span>;
}

/* ---------------------------------------------------------------- */
/* Breakdown bar colors                                              */
/* ---------------------------------------------------------------- */

/* Bar colours are now handled purely in CSS (accent for EV, faint for ICE) */

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
}: {
  label: string;
  ev: number;
  ice: number;
  maxVal: number;
}) {
  const evW = maxVal > 0 ? Math.max((ev / maxVal) * 100, 0.5) : 0;
  const iceW = maxVal > 0 ? Math.max((ice / maxVal) * 100, 0.5) : 0;
  return (
    <div className="tco-bar-row">
      <div className="tco-bar-label">{label}</div>
      <div className="tco-bar-bars">
        <div className="tco-bar-track">
          <div className="tco-bar-fill ev" style={{ width: `${evW}%` }} />
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
/* Depreciation insight panel                                        */
/* ---------------------------------------------------------------- */

function DepreciationInsight({
  years,
  evResidual,
  iceResidual,
}: {
  years: number;
  evResidual: number;
  iceResidual: number;
}) {
  return (
    <div className="tco-depreciation-insight">
      <div className="tco-depreciation-header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="7" />
          <path d="M8 5v3" /><circle cx="8" cy="11" r="0.5" fill="currentColor" />
        </svg>
        <span className="tco-depreciation-title">Pourquoi le VE se deprecie moins</span>
      </div>

      <div className="tco-depreciation-body">
        <p>
          Les prejuges sur le vehicule electrique (durabilite de la batterie,
          risque d'incendie, cout reel) se deconstruisent progressivement a mesure
          que les retours d'experience s'accumulent. Les batteries modernes
          conservent 80 a 90 % de leur capacite apres 200 000 km, les risques
          d'incendie sont statistiquement inferieurs aux thermiques, et le cout
          d'entretien est 2 a 3 fois moindre.
        </p>
        <p>
          <strong>L'interdiction de vente de vehicules thermiques neufs en UE
          a partir de 2035</strong> accelerera mecaniquement la depreciation
          des thermiques : un marche de revente qui se retrecit, des couts de
          carburant croissants, et des ZFE (zones a faibles emissions) qui
          restreignent leur usage dans les centres urbains. A l'inverse,
          un VE achete aujourd'hui conservera sa pertinence sur le long terme.
        </p>
        <div className="tco-depreciation-values">
          <div className="tco-depreciation-val ev">
            <span className="tco-depreciation-val-label">VE apres {years} ans</span>
            <span className="tco-depreciation-val-pct">{evResidual} %</span>
            <span className="tco-depreciation-val-hint">du prix neuf conserve</span>
          </div>
          <div className="tco-depreciation-val ice">
            <span className="tco-depreciation-val-label">Thermique apres {years} ans</span>
            <span className="tco-depreciation-val-pct">{iceResidual} %</span>
            <span className="tco-depreciation-val-hint">du prix neuf conserve</span>
          </div>
        </div>
        <p className="tco-depreciation-footer">
          La tendance s'inversera : avec des batteries plus durables, un entretien
          negligeable, une securite accrue et une demande croissante, la valeur
          residuelle des VE depassera celle des thermiques bien avant 2035.
        </p>
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
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const vParam = params.get("v");
      if (vParam) {
        const found = vehicles.find((v) => v.slug === vParam);
        if (found) {
          setSelectedSlug(vParam);
          const configParam = params.get("config") || params.get("c");
          if (configParam && found.configs.some((c) => c.id === configParam)) {
            setSelectedConfigId(configParam);
          } else if (found.configs.length > 0) {
            setSelectedConfigId(found.configs[0].id);
          }
        }
      }
    }
  }, [vehicles]);

  // Selected configuration
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(
    selectedEv?.configs[0]?.id ?? null
  );
  const selectedConfig = selectedEv?.configs.find((c) => c.id === selectedConfigId) ?? null;

  // Active price / conso / range (from config if selected, otherwise vehicle base)
  const activePrice = selectedConfig?.price_EUR ?? selectedEv?.price_EUR ?? 0;
  const activeConso = selectedConfig?.consumption_kWh_100km ?? selectedEv?.consumption_kWh_100km ?? 16;
  const activeRange = selectedConfig?.realRange_mixed_km ?? selectedEv?.realRange_mixed_km ?? 300;

  // Usage params
  const [kmPerYear, setKmPerYear] = useState(DEFAULTS.km_per_year);
  const [years, setYears] = useState(DEFAULTS.years);

  // EV energy
  const [elecHome, setElecHome] = useState(DEFAULTS.elec_home_eur_kwh);
  const [elecFast, setElecFast] = useState(DEFAULTS.elec_fast_eur_kwh);
  const [fastPct, setFastPct] = useState(DEFAULTS.fast_charge_pct);
  const [evConsoOverride, setEvConsoOverride] = useState<number | null>(null);
  const evConso = evConsoOverride ?? activeConso;

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

  // States & handlers for premium report purchase (F8)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentEmail || !cardNumber || !cardExpiry || !cardCvc) {
      alert("Veuillez remplir tous les champs de paiement.");
      return;
    }
    setPaymentLoading(true);
    setTimeout(() => {
      setPaymentLoading(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
        setPaymentEmail("");
        setCardNumber("");
        setCardExpiry("");
        setCardCvc("");
        
        if (selectedEv) {
          const query = new URLSearchParams({
            v: selectedSlug,
            config: selectedConfigId || "",
            km: kmPerYear.toString(),
            years: years.toString(),
            eh: elecHome.toString(),
            ef: elecFast.toString(),
            fp: fastPct.toString(),
            fprice: fuelPrice.toString(),
            iconso: iceConso.toString(),
            evm: evMaint.toString(),
            icem: iceMaint.toString(),
            evins: evInsurance.toString(),
            iceins: iceInsurance.toString(),
            evres: evResidual.toString(),
            iceres: iceResidual.toString(),
            paid: "true"
          }).toString();
          window.location.href = `/simulateur/rapport-premium/?${query}`;
        }
      }, 1500);
    }, 2000);
  };

  // Update EV conso when vehicle changes
  const handleVehicleChange = useCallback(
    (slug: string) => {
      setSelectedSlug(slug);
      const v = vehicles.find((ve) => ve.slug === slug);
      if (v) {
        const firstConfig = v.configs[0] ?? null;
        setSelectedConfigId(firstConfig?.id ?? null);
        setEvConsoOverride(null);
      }
    },
    [vehicles]
  );

  // Update when config changes
  const handleConfigChange = useCallback(
    (configId: string) => {
      setSelectedConfigId(configId);
      setEvConsoOverride(null);
    },
    []
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
    const evPurchaseNet = Math.max(0, activePrice - ev.aids_EUR);
    const evResidualVal = activePrice * (evResidual / 100);
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
    activePrice,
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

  const hasConfigs = selectedEv.configs.length > 1;

  return (
    <div className="tco-calc no-glossary">
      {/* ══════════════════════════════════════════════════ */}
      {/* LEFT AREA : inputs (2-col sub-grid on desktop)    */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="tco-inputs-area">
      <div className="tco-col tco-col-vehicle">
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
                {v.brand} {v.model} {v.variant} -- des {fmt(v.price_EUR)} EUR
              </option>
            ))}
          </select>

          {/* Configuration selector */}
          {hasConfigs && (
            <div className="tco-config-selector">
              <span className="tco-config-label">Finition / batterie</span>
              <div className="tco-config-options">
                {selectedEv.configs.map((c) => (
                  <button
                    key={c.id}
                    className={`tco-config-btn ${c.id === selectedConfigId ? "active" : ""}`}
                    onClick={() => handleConfigChange(c.id)}
                  >
                    <span className="tco-config-btn-name">{c.label}</span>
                    <span className="tco-config-btn-price">{fmt(c.price_EUR)} EUR</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="tco-ev-summary">
            <div className="tco-ev-stat">
              <span className="tco-stat-label">Prix catalogue</span>
              <span className="tco-stat-value">{fmt(activePrice)} EUR</span>
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
                {fmt(activeRange)} km
              </span>
            </div>
            <div className="tco-ev-stat">
              <span className="tco-stat-label">Conso mixte</span>
              <span className="tco-stat-value">
                {fmtPct(evConso)} kWh/100 km
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
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* COL 2 : Energie + Avance                          */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="tco-col tco-col-params">
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
              onChange={(v) => setEvConsoOverride(v)}
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

      </div>
      </div>{/* /tco-inputs-area */}

      {/* ══════════════════════════════════════════════════ */}
      {/* RIGHT : RESULTS (sticky on desktop)              */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="tco-results-col">
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
          <div className="tco-savings-icon">
            {result.savings >= 0 ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
            )}
          </div>
          <span className="tco-savings-label">
            {result.savings >= 0
              ? "Economie avec le VE"
              : "Surcout du VE"}
          </span>
          <AnimatedAmount
            value={Math.abs(result.savings)}
            className="tco-savings-amount"
          />
          <div className="tco-savings-meta">
            <span className="tco-savings-pct">
              {result.savings >= 0 ? "-" : "+"}{fmtPct(Math.abs(result.savingsPct))} %
            </span>
            <span className="tco-savings-sep">·</span>
            <span className="tco-savings-monthly">
              {fmt(Math.abs(result.savings) / (years * 12))} EUR/mois
            </span>
            {result.breakeven !== null && result.breakeven > 0 && (
              <>
                <span className="tco-savings-sep">·</span>
                <span className="tco-breakeven">
                  rentable en {fmtPct(result.breakeven)} an{result.breakeven >= 2 ? "s" : ""}
                </span>
              </>
            )}
            {result.breakeven === 0 && (
              <>
                <span className="tco-savings-sep">·</span>
                <span className="tco-breakeven">immediat</span>
              </>
            )}
          </div>
        </div>

        {/* Cost per km visual comparison */}
        <div className="tco-perkm-compare">
          <div className="tco-perkm-item ev">
            <span className="tco-perkm-label">VE</span>
            <div className="tco-perkm-bar-wrap">
              <div
                className="tco-perkm-bar"
                style={{
                  width: `${Math.min((result.evPerKm / Math.max(result.evPerKm, result.icePerKm)) * 100, 100)}%`,
                }}
              />
            </div>
            <span className="tco-perkm-val">{(result.evPerKm * 100).toFixed(1)} ct/km</span>
          </div>
          <div className="tco-perkm-item ice">
            <span className="tco-perkm-label">Therm.</span>
            <div className="tco-perkm-bar-wrap">
              <div
                className="tco-perkm-bar"
                style={{
                  width: `${Math.min((result.icePerKm / Math.max(result.evPerKm, result.icePerKm)) * 100, 100)}%`,
                }}
              />
            </div>
            <span className="tco-perkm-val">{(result.icePerKm * 100).toFixed(1)} ct/km</span>
          </div>
        </div>

        {/* Side-by-side totals */}
        <div className="tco-totals-row">
          <div className="tco-total-card ev">
            <span className="tco-total-label">Cout total VE</span>
            <AnimatedAmount value={result.evTotal} className="tco-total-amount" />
            <span className="tco-total-monthly">
              {fmt(result.evTotal / (years * 12))} EUR/mois
            </span>
          </div>
          <div className="tco-total-card ice">
            <span className="tco-total-label">Cout total thermique</span>
            <AnimatedAmount value={result.iceTotal} className="tco-total-amount" />
            <span className="tco-total-monthly">
              {fmt(result.iceTotal / (years * 12))} EUR/mois
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

          <BarRow label="Decote" ev={result.evBreakdown.depreciation} ice={result.iceBreakdown.depreciation} maxVal={result.maxBar} />
          <BarRow label="Energie" ev={result.evBreakdown.energy} ice={result.iceBreakdown.energy} maxVal={result.maxBar} />
          <BarRow label="Entretien" ev={result.evBreakdown.maintenance} ice={result.iceBreakdown.maintenance} maxVal={result.maxBar} />
          <BarRow label="Assurance" ev={result.evBreakdown.insurance} ice={result.iceBreakdown.insurance} maxVal={result.maxBar} />
          {result.iceBreakdown.tvs > 0 && (
            <BarRow label="TVS" ev={0} ice={result.iceBreakdown.tvs} maxVal={result.maxBar} />
          )}
        </div>

        {/* Call to action for B2C Premium PDF report (F8) */}
        <div className="tco-premium-cta mt-6 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 dark:text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">Rapport PDF Premium</h4>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                TCO sur-mesure, météo, planificateur & aides 2026 détaillées.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 mt-1 border-t border-[var(--color-border)] pt-3">
            <div className="flex flex-col">
              <span className="text-xs text-[var(--color-text-faint)] line-through">19,90 €</span>
              <span className="text-base font-bold text-[var(--color-accent)]">9,90 €</span>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] text-[var(--color-accent-on)] text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Obtenir mon rapport
            </button>
          </div>
        </div>

        <p className="tco-disclaimer">
          Calcul indicatif. Moyennes marche France 2025.
          Electricite a {fmtPct(result.avgElecPrice * 100)} ct/kWh
          ({100 - fastPct} % domicile / {fastPct} % rapide).
        </p>
      </div>
      </div>

      {/* ── Advanced toggle (spans full width) ───────────── */}
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
        <div className="tco-advanced-grid">
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
              <span className="tco-section-title">Valeur residuelle (decote)</span>
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
            <DepreciationInsight
              years={years}
              evResidual={evResidual}
              iceResidual={iceResidual}
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
        </div>
      )}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative flex flex-col gap-5 text-[var(--color-text)]">
            <button
              onClick={() => {
                if (!paymentLoading && !paymentSuccess) setShowPaymentModal(false);
              }}
              className="absolute top-4 right-4 text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer"
              title="Fermer"
              disabled={paymentLoading || paymentSuccess}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {paymentSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[var(--color-accent-dim)] flex items-center justify-center text-[var(--color-accent)] animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Paiement validé !</h3>
                <p className="text-sm text-[var(--color-text-muted)] max-w-xs leading-relaxed">
                  Votre transaction de 9,90 € a été traitée avec succès. Préparation de votre rapport personnalisé...
                </p>
              </div>
            ) : paymentLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <div className="w-12 h-12 border-4 border-[var(--color-accent-dim)] border-t-[var(--color-accent)] rounded-full animate-spin"></div>
                <h3 className="text-lg font-semibold">Traitement en cours...</h3>
                <p className="text-xs text-[var(--color-text-faint)]">
                  Connexion sécurisée avec Stripe. Veuillez ne pas fermer cette fenêtre.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-bold">Rapport Premium B2C</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Accédez instantanément à l'analyse TCO 2026, au plan de recharge saisonnier et à l'éligibilité aux aides.
                  </p>
                </div>

                <div className="flex justify-between items-center bg-[var(--color-bg-subtle)] p-3 rounded-lg border border-[var(--color-border)]">
                  <span className="text-xs font-mono uppercase text-[var(--color-text-muted)]">Total à payer</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-[var(--color-text-faint)] line-through">19,90 €</span>
                    <span className="text-xl font-bold text-[var(--color-accent)]">9,90 €</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)]">Adresse e-mail</label>
                    <input
                      type="email"
                      required
                      placeholder="votre@email.com"
                      value={paymentEmail}
                      onChange={(e) => setPaymentEmail(e.target.value)}
                      className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)]">Numéro de carte</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={19}
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                          const matches = val.match(/\d{4,16}/g);
                          const match = (matches && matches[0]) || "";
                          const parts = [];
                          for (let i = 0, len = match.length; i < len; i += 4) {
                            parts.push(match.substring(i, i + 4));
                          }
                          if (parts.length > 0) {
                            setCardNumber(parts.join(" "));
                          } else {
                            setCardNumber(val);
                          }
                        }}
                        className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-[var(--color-accent)]"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <rect width="22" height="16" x="1" y="4" rx="3" />
                          <line x1="1" x2="23" y1="10" y2="10" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)]">Date d'exp.</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                          if (val.length >= 2) {
                            val = val.substring(0, 2) + "/" + val.substring(2, 4);
                          }
                          setCardExpiry(val);
                        }}
                        className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)]">CVC</label>
                      <input
                        type="password"
                        required
                        maxLength={3}
                        placeholder="123"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/gi, ""))}
                        className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] text-[var(--color-accent-on)] text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-md mt-2 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  Payer 9,90 € via Stripe
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--color-text-faint)] font-mono mt-1">
                  <span>🔒 SSL chiffré 100% sécurisé</span>
                  <span>·</span>
                  <span>Garantie 14j</span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
