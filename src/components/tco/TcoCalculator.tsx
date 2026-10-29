import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { url } from "@/lib/url";
import { CEE_PRICE_CAP_EUR } from "@/lib/cee";
import { formatNumber } from "@/lib/format";
import { COST_DEFAULTS, residualPct } from "@/lib/costDefaults";
import { computeTco } from "@/lib/tco";
import { iceTwinOf, realL100 } from "@/data/iceTwins";
import { INSURANCE, MAINTENANCE, RESALE_3Y } from "@/data/runningCosts";

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

export interface TcoVehicleSummary {
  slug: string;
  brand: string;
  model: string;
  variant: string;
  segment: string;
  price_EUR: number;
  /** Prime CEE de tout ménage, et d'une personne morale (mode entreprise) */
  aids_EUR: number;
  aidsPro_EUR: number;
  consumption_kWh_100km: number;
  realRange_mixed_km: number;
  configs: ConfigSummary[];
}

type Mode = "particulier" | "entreprise";

interface Props {
  vehicles: TcoVehicleSummary[];
  /** Mode de départ (la page Entreprises ouvre en mode entreprise) ; ?profil=entreprise le force */
  initialMode?: Mode;
}

const KM_DEFAULT: Record<Mode, number> = { particulier: 15000, entreprise: 25000 };

/* ---------------------------------------------------------------- */
/* Constants                                                         */
/* ---------------------------------------------------------------- */

/** Hypothèses par défaut (lib/costDefaults), réexportées pour les pages qui les citent */
export const DEFAULTS = COST_DEFAULTS;

const fmt = (n: number) => formatNumber(Math.round(n));

const fmtPct = (n: number) => formatNumber(n, 1);

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

function AnimatedAmount({ value, suffix = "€", className }: { value: number; suffix?: string; className?: string }) {
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
          <span className="tco-bar-amount">{fmt(ev)} €</span>
        </div>
        <div className="tco-bar-track">
          <div className="tco-bar-fill ice" style={{ width: `${iceW}%` }} />
          <span className="tco-bar-amount">{fmt(ice)} €</span>
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
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="7" />
          <path d="M8 5v3" /><circle cx="8" cy="11" r="0.5" fill="currentColor" />
        </svg>
        <span className="tco-depreciation-title">Ce que dit le marché de l'occasion</span>
      </div>

      <div className="tco-depreciation-body">
        <p>
          Aujourd'hui, l'électrique perd plus de valeur que le thermique. Après 3 ans et 60 000 km, une électrique se revend en
          moyenne {RESALE_3Y.ev} % de son prix catalogue, contre {RESALE_3Y.ice} % pour une essence
          (<a href={RESALE_3Y.sourceUrl} target="_blank" rel="noopener">Autovista</a>, grands marchés européens, fin 2025). Les
          valeurs par défaut prolongent ce rythme sur la durée choisie.
        </p>
        <p>
          Les électriques récentes à grande autonomie tiennent mieux leur valeur ; les petites, que les primes et le leasing
          social ont rendues moins chères neuves, décotent davantage. Réglez ces pourcentages selon le modèle et son état.
        </p>
        <div className="tco-depreciation-values">
          <div className="tco-depreciation-val ev">
            <span className="tco-depreciation-val-label">VE après {years} ans</span>
            <span className="tco-depreciation-val-pct">{evResidual} %</span>
            <span className="tco-depreciation-val-hint">du prix neuf conservé</span>
          </div>
          <div className="tco-depreciation-val ice">
            <span className="tco-depreciation-val-label">Thermique après {years} ans</span>
            <span className="tco-depreciation-val-pct">{iceResidual} %</span>
            <span className="tco-depreciation-val-hint">du prix neuf conservé</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Main component                                                    */
/* ---------------------------------------------------------------- */

export default function TcoCalculator({ vehicles, initialMode = "particulier" }: Props) {
  // Particulier ou société : prime CEE, taxes du thermique, TVA récupérable sur l'énergie
  const [mode, setMode] = useState<Mode>(initialMode);
  const pro = mode === "entreprise";
  // Selected EV
  const [selectedSlug, setSelectedSlug] = useState(vehicles[0]?.slug ?? "");
  const selectedEv = vehicles.find((v) => v.slug === selectedSlug);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("profil") === "entreprise") {
        setMode("entreprise");
        setKmPerYear(KM_DEFAULT.entreprise);
      }
      const vParam = params.get("v");
      if (vParam) {
        const found = vehicles.find((v) => v.slug === vParam);
        if (found) {
          setSelectedSlug(vParam);
          applyTwin(vParam);
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

  // Prime de la version selon le mode (aucune au-dessus du plafond de prix)
  const aidsFor = (ev: TcoVehicleSummary) => (activePrice > CEE_PRICE_CAP_EUR ? 0 : pro ? ev.aidsPro_EUR : ev.aids_EUR);

  // Usage params
  const [kmPerYear, setKmPerYear] = useState(KM_DEFAULT[initialMode]);
  const [years, setYears] = useState(DEFAULTS.years);

  // EV energy
  const [elecHome, setElecHome] = useState(DEFAULTS.elec_home_eur_kwh);
  const [elecFast, setElecFast] = useState(DEFAULTS.elec_fast_eur_kwh);
  const [fastPct, setFastPct] = useState(DEFAULTS.fast_charge_pct);
  const [evConsoOverride, setEvConsoOverride] = useState<number | null>(null);
  const evConso = evConsoOverride ?? activeConso;

  // Thermique comparé : le jumeau relevé du modèle (data/iceTwins) tant que la personne n'a rien
  // réglé à la main, sinon un thermique type
  const initialTwin = iceTwinOf(vehicles[0]?.slug ?? "");
  const [fuelType, setFuelType] = useState<"diesel" | "essence">("essence");
  const [fuelPrice, setFuelPrice] = useState(DEFAULTS.essence_eur_l);
  const [iceConso, setIceConso] = useState(initialTwin ? realL100(initialTwin) : DEFAULTS.ice_conso_l_100);
  const [icePrice, setIcePrice] = useState(initialTwin?.price ?? DEFAULTS.ice_price);
  const [iceTouched, setIceTouched] = useState(false);
  const twin = iceTouched ? undefined : iceTwinOf(selectedSlug);
  function applyTwin(slug: string) {
    if (iceTouched) return;
    const t = iceTwinOf(slug);
    setFuelType("essence");
    setFuelPrice(DEFAULTS.essence_eur_l);
    setIcePrice(t?.price ?? DEFAULTS.ice_price);
    setIceConso(t ? realL100(t) : DEFAULTS.ice_conso_l_100);
  }
  const touchIce = <T,>(set: (v: T) => void) => (v: T) => {
    setIceTouched(true);
    set(v);
  };

  // Maintenance
  const [evMaint, setEvMaint] = useState(DEFAULTS.ev_maintenance_eur_yr);
  const [iceMaint, setIceMaint] = useState(DEFAULTS.ice_maintenance_eur_yr);

  // Insurance
  const [evInsurance, setEvInsurance] = useState(DEFAULTS.insurance_ev_eur_yr);
  const [iceInsurance, setIceInsurance] = useState(
    DEFAULTS.insurance_ice_eur_yr
  );

  // Revente : suit la durée de détention (data/runningCosts) tant qu'elle n'est pas réglée à la main
  const [residualTouched, setResidualTouched] = useState(false);
  const [evResidual, setEvResidual] = useState(residualPct("ev", DEFAULTS.years));
  const [iceResidual, setIceResidual] = useState(residualPct("ice", DEFAULTS.years));
  useEffect(() => {
    if (residualTouched) return;
    setEvResidual(residualPct("ev", years));
    setIceResidual(residualPct("ice", years));
  }, [years, residualTouched]);
  const touchResidual = (set: (v: number) => void) => (v: number) => {
    setResidualTouched(true);
    set(v);
  };

  // TVS
  const [tvsIce, setTvsIce] = useState(DEFAULTS.tvs_ice_eur_yr);

  // Advanced toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Lien vers le rapport détaillé (F8, gratuit) : il reprend tous les réglages, pour le même calcul (lib/tco)
  const reportHref = selectedEv
    ? url(`/simulateur/rapport-premium/?${new URLSearchParams({
        v: selectedSlug,
        config: selectedConfigId || "",
        km: kmPerYear.toString(),
        years: years.toString(),
        eh: elecHome.toString(),
        ef: elecFast.toString(),
        fp: fastPct.toString(),
        econso: evConso.toString(),
        aid: aidsFor(selectedEv).toString(),
        fprice: fuelPrice.toString(),
        iconso: iceConso.toString(),
        iprice: icePrice.toString(),
        evm: evMaint.toString(),
        icem: iceMaint.toString(),
        evins: evInsurance.toString(),
        iceins: iceInsurance.toString(),
        evres: evResidual.toString(),
        iceres: iceResidual.toString(),
      }).toString()}`)
    : null;

  // Update EV conso when vehicle changes
  const handleVehicleChange = (slug: string) => {
    setSelectedSlug(slug);
    applyTwin(slug);
    const v = vehicles.find((ve) => ve.slug === slug);
    if (v) {
      const firstConfig = v.configs[0] ?? null;
      setSelectedConfigId(firstConfig?.id ?? null);
      setEvConsoOverride(null);
    }
  };

  // Update when config changes
  const handleConfigChange = useCallback(
    (configId: string) => {
      setSelectedConfigId(configId);
      setEvConsoOverride(null);
    },
    []
  );

  // Changer de mode remet le kilométrage type du mode, sauf s'il a été réglé à la main
  const handleMode = useCallback(
    (m: Mode) => {
      setMode(m);
      setKmPerYear((km) => (km === KM_DEFAULT[mode] ? KM_DEFAULT[m] : km));
    },
    [mode]
  );

  const handleFuelType = useCallback(
    (ft: "diesel" | "essence") => {
      setIceTouched(true);
      setFuelType(ft);
      setFuelPrice(ft === "diesel" ? DEFAULTS.diesel_eur_l : DEFAULTS.essence_eur_l);
      setIceConso(ft === "diesel" ? 5.8 : 6.5);
    },
    []
  );

  // Calcul partagé avec le rapport et les pages « Électrique ou essence » (lib/tco)
  const result = useMemo(() => {
    const ev = selectedEv;
    if (!ev) return null;
    const inputs = {
      km: kmPerYear,
      years,
      // Pas de prime au-dessus du plafond de prix (version plus chère que celle d'entrée)
      evPrice: activePrice,
      evAid: aidsFor(ev),
      evConso,
      elecHome,
      elecFast,
      fastPct,
      icePrice,
      iceConso,
      fuelPrice,
      evMaint,
      iceMaint,
      evInsurance,
      iceInsurance,
      evResidualPct: evResidual,
      iceResidualPct: iceResidual,
      pro,
      tvsIce,
    };
    const r = computeTco(inputs);
    const maxBar = Math.max(
      r.ev.depreciation,
      r.ice.depreciation,
      r.ev.energy,
      r.ice.energy,
      r.ev.maintenance,
      r.ice.maintenance,
      r.ev.insurance,
      r.ice.insurance,
      r.ice.tvs
    );
    return { ...r, evTotal: r.ev.total, iceTotal: r.ice.total, evBreakdown: r.ev, iceBreakdown: r.ice, breakeven: r.paybackYears, maxBar };
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
    pro,
  ]);

  if (!selectedEv || !result) {
    return <p>Aucun véhicule disponible.</p>;
  }

  const hasConfigs = selectedEv.configs.length > 1;

  return (
    <div className="tco-calc no-glossary" data-mode={mode}>
      {/* ── Particulier ou société ─────────────────────── */}
      <div className="tco-mode">
        <span className="tco-mode-label" id="tco-mode-label">Vous achetez</span>
        <span className="tco-mode-seg" role="radiogroup" aria-labelledby="tco-mode-label">
          <button type="button" role="radio" aria-checked={!pro} onClick={() => handleMode("particulier")}>En particulier</button>
          <button type="button" role="radio" aria-checked={pro} onClick={() => handleMode("entreprise")}>Pour une société</button>
        </span>
        <span className="tco-mode-hint">
          {pro
            ? "Prime CEE d'une personne morale, taxes du thermique, TVA récupérable sur l'énergie."
            : "Prime CEE de tout ménage ; la vôtre peut être plus élevée selon vos revenus."}
        </span>
      </div>
      {/* ══════════════════════════════════════════════════ */}
      {/* LEFT AREA : inputs (2-col sub-grid on desktop)    */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="tco-inputs-area">
      <div className="tco-col tco-col-vehicle">
        {/* ── Vehicle selector ────────────────────────────── */}
        <div className="tco-section">
          <div className="tco-section-header">
            <span className="tco-section-number">01</span>
            <span className="tco-section-title">Véhicule électrique</span>
          </div>

          <select
            className="tco-select"
            aria-label="Véhicule électrique"
            value={selectedSlug}
            onChange={(e) => handleVehicleChange(e.target.value)}
          >
            {vehicles.map((v) => (
              <option key={v.slug} value={v.slug}>
                {v.brand} {v.model}, dès {fmt(v.price_EUR)} €
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
                    type="button"
                    aria-pressed={c.id === selectedConfigId}
                    className={`tco-config-btn ${c.id === selectedConfigId ? "active" : ""}`}
                    onClick={() => handleConfigChange(c.id)}
                  >
                    <span className="tco-config-btn-name">{c.label}</span>
                    <span className="tco-config-btn-price">{fmt(c.price_EUR)} €</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="tco-ev-summary">
            <div className="tco-ev-stat">
              <span className="tco-stat-label">Prix catalogue</span>
              <span className="tco-stat-value">{fmt(activePrice)} €</span>
            </div>
            <div className="tco-ev-stat">
              <span className="tco-stat-label">{pro ? "Prime CEE (société)" : "Prime CEE (tout ménage)"}</span>
              <span className="tco-stat-value accent">
                -{fmt(aidsFor(selectedEv))} €
              </span>
            </div>
            <div className="tco-ev-stat">
              <span className="tco-stat-label">Autonomie réelle</span>
              <span className="tco-stat-value">
                {fmt(activeRange)} km
              </span>
            </div>
            <div className="tco-ev-stat">
              <span className="tco-stat-label">Conso réelle</span>
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
            label="Kilomètres par an"
            unit="km/an"
            value={kmPerYear}
            min={3000}
            max={60000}
            step={1000}
            onChange={setKmPerYear}
            accent
          />
          <SliderField
            label="Durée de détention"
            unit="ans"
            value={years}
            min={1}
            max={10}
            step={1}
            onChange={setYears}
          />
        </div>

        {/* ── Taxes du thermique (société) ───────────────── */}
        {pro && (
          <div className="tco-section">
            <div className="tco-section-header">
              <span className="tco-section-number">02b</span>
              <span className="tco-section-title">Taxes annuelles du thermique</span>
            </div>
            <NumberField
              label="Taxes CO2 et polluants (ex-TVS)"
              unit="€/an"
              value={tvsIce}
              min={0}
              max={5000}
              step={50}
              onChange={setTvsIce}
            />
            <p className="tco-hint">
              Taxes annuelles d'une voiture de tourisme de société : reprenez celles du thermique comparé. Le VE en est exonéré ; un
              utilitaire n'y est pas soumis.
            </p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* COL 2 : Énergie + avancé                          */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="tco-col tco-col-params">
        {/* ── Energy ──────────────────────────────────────── */}
        <div className="tco-section">
          <div className="tco-section-header">
            <span className="tco-section-number">03</span>
            <span className="tco-section-title">Énergie</span>
          </div>

          <div className="tco-subsection">
            <span className="tco-sub-label">Électricité (VE)</span>
            <div className="tco-row-2">
              <NumberField
                label="Tarif domicile"
                unit="€/kWh"
                value={elecHome}
                min={0.05}
                max={0.60}
                step={0.01}
                onChange={setElecHome}
              />
              <NumberField
                label="Tarif rapide"
                unit="€/kWh"
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
                unit="€/L"
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
                onChange={touchIce(setIceConso)}
              />
            </div>
            <NumberField
              label="Prix thermique neuf"
              unit="€"
              value={icePrice}
              min={10000}
              max={80000}
              step={500}
              onChange={touchIce(setIcePrice)}
            />
            {!iceTouched && (
              <p className="tco-hint">
                {twin ? (
                  <>
                    Comparée à la <a href={url(`/electrique-ou-essence/${twin.slug}/`)}>{twin.name} {twin.version}</a> : prix
                    catalogue relevé sur L'argus, consommation homologuée plus 20 %, l'écart mesuré sur route.
                  </>
                ) : (
                  "Thermique type : une compacte essence, consommation réelle moyenne. Réglez-la sur le modèle qui vous intéresse."
                )}
              </p>
            )}
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
            Résultat sur {years} ans, {fmt(result.totalKm)} km
          </span>
        </div>

        {/* Headline savings */}
        <div
          className={`tco-savings-hero ${result.savings < 0 ? "negative" : ""}`}
        >
          <div className="tco-savings-icon">
            {result.savings >= 0 ? (
              <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            ) : (
              <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
            )}
          </div>
          <span className="tco-savings-label">
            {result.savings >= 0
              ? "Économie avec le VE"
              : "Surcoût du VE"}
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
              {fmt(Math.abs(result.savings) / (years * 12))} €/mois
            </span>
            {result.breakeven !== null && result.breakeven > 0 && (
              <>
                <span className="tco-savings-sep">·</span>
                <span className="tco-breakeven">
                  {result.breakeven < 1
                    ? "achat rattrapé en moins d'un an"
                    : `achat rattrapé en ${Math.ceil(result.breakeven)} ans`}
                </span>
              </>
            )}
            {result.breakeven === 0 && (
              <>
                <span className="tco-savings-sep">·</span>
                <span className="tco-breakeven">moins chère à l'achat</span>
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
            <span className="tco-perkm-val">{formatNumber(result.evPerKm * 100, 1)}&nbsp;ct/km</span>
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
            <span className="tco-perkm-val">{formatNumber(result.icePerKm * 100, 1)}&nbsp;ct/km</span>
          </div>
        </div>

        {/* Side-by-side totals */}
        <div className="tco-totals-row">
          <div className="tco-total-card ev">
            <span className="tco-total-label">Coût total VE</span>
            <AnimatedAmount value={result.evTotal} className="tco-total-amount" />
            <span className="tco-total-monthly">
              {fmt(result.evTotal / (years * 12))} €/mois
            </span>
          </div>
          <div className="tco-total-card ice">
            <span className="tco-total-label">Coût total thermique</span>
            <AnimatedAmount value={result.iceTotal} className="tco-total-amount" />
            <span className="tco-total-monthly">
              {fmt(result.iceTotal / (years * 12))} €/mois
            </span>
          </div>
        </div>

        {/* Bar chart breakdown */}
        <div className="tco-breakdown">
          <div className="tco-breakdown-header">
            <span className="tco-section-title">Décomposition</span>
            <div className="tco-legend">
              <span className="tco-legend-ev">VE</span>
              <span className="tco-legend-ice">Thermique</span>
            </div>
          </div>

          <BarRow label="Décote" ev={result.evBreakdown.depreciation} ice={result.iceBreakdown.depreciation} maxVal={result.maxBar} />
          <BarRow label="Énergie" ev={result.evBreakdown.energy} ice={result.iceBreakdown.energy} maxVal={result.maxBar} />
          <BarRow label="Entretien" ev={result.evBreakdown.maintenance} ice={result.iceBreakdown.maintenance} maxVal={result.maxBar} />
          <BarRow label="Assurance" ev={result.evBreakdown.insurance} ice={result.iceBreakdown.insurance} maxVal={result.maxBar} />
          {result.iceBreakdown.tvs > 0 && (
            <BarRow label="Taxes" ev={0} ice={result.iceBreakdown.tvs} maxVal={result.maxBar} />
          )}
        </div>

        {/* Call to action for B2C Premium PDF report (F8) */}
        <div className="tco-premium-cta mt-6 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700 shrink-0">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">Rapport PDF détaillé</h2>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                TCO sur-mesure, météo, planificateur & aides 2026 détaillées.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 mt-1 border-t border-[var(--color-border)] pt-3">
            <span className="text-xs font-semibold text-[var(--color-accent)]">Gratuit</span>
            {reportHref && (
              <a
                href={reportHref}
                className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] text-[var(--color-accent-on)] text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                Obtenir mon rapport
              </a>
            )}
          </div>
        </div>

        <p className="tco-disclaimer">
          Calcul indicatif, moyennes du marché français. Consommation réelle de la version (autonomie de la fiche), électricité à{" "}
          {fmtPct(result.avgElecPrice * 100)} ct par kWh consommé ({100 - fastPct} % à domicile, {fastPct} % sur borne rapide, 10 % de
          pertes de recharge comprises){pro ? ", hors TVA récupérable (100 % sur l'électricité, 80 % sur le carburant)" : ""}.
        </p>
      </div>
      </div>

      {/* ── Advanced toggle (spans full width) ───────────── */}
      <button
        className="tco-advanced-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <span>{showAdvanced ? "Masquer" : "Afficher"} les paramètres avancés</span>
        <svg aria-hidden="true"
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
                unit="€/an"
                value={evMaint}
                min={0}
                max={3000}
                step={50}
                onChange={setEvMaint}
              />
              <NumberField
                label="Entretien thermique"
                unit="€/an"
                value={iceMaint}
                min={0}
                max={3000}
                step={50}
                onChange={setIceMaint}
              />
            </div>
            <p className="tco-hint">
              Moyennes 2025 des automobilistes : {MAINTENANCE.evMonthly} € par mois en électrique, {MAINTENANCE.iceMonthly} € en
              thermique (<a href={MAINTENANCE.sourceUrl} target="_blank" rel="noopener">Roole data</a>).
            </p>
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
                unit="€/an"
                value={evInsurance}
                min={0}
                max={3000}
                step={25}
                onChange={setEvInsurance}
              />
              <NumberField
                label="Assurance thermique"
                unit="€/an"
                value={iceInsurance}
                min={0}
                max={3000}
                step={25}
                onChange={setIceInsurance}
              />
            </div>
            <p className="tco-hint">
              Primes moyennes 2025 : {fmt(INSURANCE.ev)} € en électrique, {fmt(INSURANCE.essence)} € en essence
              (<a href={INSURANCE.sourceUrl} target="_blank" rel="noopener">baromètre Assurland</a>).
            </p>
          </div>

          {/* ── Residual value ─────────────────────────── */}
          <div className="tco-section">
            <div className="tco-section-header">
              <span className="tco-section-number">06</span>
              <span className="tco-section-title">Valeur résiduelle (décote)</span>
            </div>
            <SliderField
              label={`VE après ${years} ans`}
              unit="% du prix neuf"
              value={evResidual}
              min={0}
              max={80}
              step={1}
              onChange={touchResidual(setEvResidual)}
            />
            <SliderField
              label={`Thermique après ${years} ans`}
              unit="% du prix neuf"
              value={iceResidual}
              min={0}
              max={80}
              step={1}
              onChange={touchResidual(setIceResidual)}
            />
            <DepreciationInsight
              years={years}
              evResidual={evResidual}
              iceResidual={iceResidual}
            />
          </div>

        </div>
      )}
    </div>
  );
}
