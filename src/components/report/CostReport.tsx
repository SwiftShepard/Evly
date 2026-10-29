import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import type { ReportVehicle } from "@/lib/report";
import { computeTco } from "@/lib/tco";
import { COST_DEFAULTS, residualPct } from "@/lib/costDefaults";
import { CEE_PRICE_CAP_EUR } from "@/lib/cee";
import { iceTwinOf, realL100 } from "@/data/iceTwins";
import { FUEL_PRICES } from "@/data/fuelPrices";
import { INSURANCE, MAINTENANCE, RESALE_3Y } from "@/data/runningCosts";
import { chargeCosts, eur as eurCents, eurKwh } from "@/lib/chargingCost";
import { infoOfLevel } from "@/lib/confidence";
import { daysOf, readTrip, type Trip } from "@/lib/trip";
import { formatNumber, formatPrice } from "@/lib/format";
import { url } from "@/lib/url";

/**
 * Rapport imprimable du simulateur (roadmap F8), gratuit : la comparaison du simulateur avec ses
 * réglages (lib/tco, même calcul), puis l'autonomie réelle de la version, « Mon trajet », la
 * recharge et les grands trajets du modèle (lib/report). Uniquement des chiffres publiés sur le site.
 */
interface Props {
  vehicles: ReportVehicle[];
}

const eur = (n: number) => formatPrice(Math.round(n));
/** « 4 h 35 », « 45 min » (arrondi aux 5 minutes, comme les pages /trajets/) */
const duration = (min: number) => {
  const m = Math.max(5, Math.ceil(min / 5) * 5);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};
const dec1 = (x: number) => x.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const range = ([a, b]: [number, number]) => (Math.round(b) - Math.round(a) < 1 ? `${Math.round(a)} €` : `${Math.round(a)} à ${Math.round(b)} €`);

export default function CostReport({ vehicles }: Props) {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (!p.get("v")) {
      window.location.href = url("/simulateur/");
      return;
    }
    setParams(p);
    setTrip(readTrip());
  }, []);

  const data = useMemo(() => {
    if (!params) return null;
    const vehicle = vehicles.find((v) => v.slug === params.get("v"));
    if (!vehicle) return null;
    const version = vehicle.versions.find((c) => c.id === params.get("config")) ?? vehicle.versions[0];
    if (!version) return null;
    // Réglages transmis par le simulateur ; sans eux, ses valeurs par défaut
    const num = (key: string, fallback: number) => {
      const x = parseFloat(params.get(key) ?? "");
      return Number.isFinite(x) ? x : fallback;
    };
    const pro = params.get("pro") === "1";
    const twin = iceTwinOf(vehicle.slug);
    const years = num("years", COST_DEFAULTS.years);
    const defaultAid = version.price > CEE_PRICE_CAP_EUR ? 0 : pro ? vehicle.aidPro : vehicle.aid;
    const inputs = {
      km: num("km", COST_DEFAULTS.km_per_year),
      years,
      evPrice: version.price,
      evAid: num("aid", defaultAid),
      evConso: num("econso", Math.round((version.battery / version.mixed) * 1000) / 10),
      elecHome: num("eh", COST_DEFAULTS.elec_home_eur_kwh),
      elecFast: num("ef", COST_DEFAULTS.elec_fast_eur_kwh),
      fastPct: num("fp", COST_DEFAULTS.fast_charge_pct),
      icePrice: num("iprice", twin?.price ?? COST_DEFAULTS.ice_price),
      iceConso: num("iconso", twin ? realL100(twin) : COST_DEFAULTS.ice_conso_l_100),
      fuelPrice: num("fprice", COST_DEFAULTS.essence_eur_l),
      evMaint: num("evm", COST_DEFAULTS.ev_maintenance_eur_yr),
      iceMaint: num("icem", COST_DEFAULTS.ice_maintenance_eur_yr),
      evInsurance: num("evins", COST_DEFAULTS.insurance_ev_eur_yr),
      iceInsurance: num("iceins", COST_DEFAULTS.insurance_ice_eur_yr),
      evResidualPct: num("evres", residualPct("ev", years)),
      iceResidualPct: num("iceres", residualPct("ice", years)),
      pro,
      tvsIce: num("tvs", 0),
    };
    // Le jumeau n'est cité que si le simulateur l'a gardé tel quel
    const twinUsed = twin && inputs.icePrice === twin.price && inputs.iceConso === realL100(twin) ? twin : null;
    return { vehicle, version, inputs, twinUsed, tco: computeTco(inputs) };
  }, [params, vehicles]);

  if (!params) return null;
  if (!data) {
    return (
      <div className="rp-empty">
        <p>Ce modèle n'est pas dans le simulateur.</p>
        <a href={url("/simulateur/")}>Retour au simulateur</a>
      </div>
    );
  }

  const { vehicle, version, inputs, twinUsed, tco } = data;
  const saving = tco.savings;
  const payback = tco.paybackYears;
  const t = trip!;
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const level = infoOfLevel(version.rangeLevel, "range").label.toLowerCase();
  const charge = chargeCosts(version.battery, version.mixed).filter((r) => !r.label.startsWith("Tempo"));
  const iceLabel = twinUsed ? `${twinUsed.name} ${twinUsed.version}` : "Thermique de comparaison";
  const rows = [
    { label: "Achat", ev: tco.ev.purchase, ice: tco.ice.purchase, note: inputs.evAid ? `prime CEE de ${eur(inputs.evAid)} déduite` : "sans prime CEE" },
    { label: `Revente après ${inputs.years} ans`, ev: -tco.ev.resale, ice: -tco.ice.resale, note: `${inputs.evResidualPct} % et ${inputs.iceResidualPct} % du prix catalogue` },
    { label: "Énergie", ev: tco.ev.energy, ice: tco.ice.energy, note: `${formatNumber(inputs.km)} km par an` },
    { label: "Entretien", ev: tco.ev.maintenance, ice: tco.ice.maintenance, note: `${eur(inputs.evMaint)} et ${eur(inputs.iceMaint)} par an` },
    { label: "Assurance", ev: tco.ev.insurance, ice: tco.ice.insurance, note: `${eur(inputs.evInsurance)} et ${eur(inputs.iceInsurance)} par an` },
    ...(tco.ice.tvs > 0 ? [{ label: "Taxes du thermique", ev: 0, ice: tco.ice.tvs, note: "voiture de société" }] : []),
  ];

  return (
    <>
      <div className="rp-bar no-print">
        <span>Rapport de coût · gratuit</span>
        <div>
          <a href={url(`/simulateur/?${new URLSearchParams({ v: vehicle.slug, config: version.id })}`)}>Retour au simulateur</a>
          <button type="button" onClick={() => window.print()}>
            <Printer aria-hidden="true" size={14} />
            Imprimer ou enregistrer en PDF
          </button>
        </div>
      </div>

      <div className="premium-report-container rp">
        {/* ── Page 1 : la comparaison ───────────────────────── */}
        <section className="report-page">
          <div className="rp-head">
            <span className="report-logo">evly</span>
            <span>Établi le {today} · page 1/2</span>
          </div>
          <span className="label-eyebrow">Électrique ou thermique · {inputs.pro ? "pour une société" : "en particulier"}</span>
          <h1>{vehicle.name}, {version.label}</h1>
          <p className="rp-sub">Face à : {iceLabel}, sur {inputs.years} ans à {formatNumber(inputs.km)} km par an.</p>

          <p className="rp-verdict">
            {saving >= 0
              ? `Revente comprise, l'électrique revient ${eur(saving)} moins cher sur ${inputs.years} ans.`
              : `Revente comprise, l'électrique coûte ${eur(-saving)} de plus sur ${inputs.years} ans.`}{" "}
            {payback === 0
              ? "Elle est moins chère dès l'achat."
              : payback !== null
                ? `À l'usage, elle fait gagner ${eur(tco.yearlySaving)} par an : l'écart d'achat de ${eur(tco.gap)} est rattrapé en ${Math.max(1, Math.ceil(payback))} an${Math.ceil(payback) > 1 ? "s" : ""}.`
                : "À l'usage, elle ne coûte pas moins cher."}
          </p>

          <table className="rp-table">
            <thead>
              <tr><th>Poste, sur {inputs.years} ans</th><th>Électrique</th><th>Thermique</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th>{r.label}<span>{r.note}</span></th>
                  <td>{eur(r.ev)}</td>
                  <td>{eur(r.ice)}</td>
                </tr>
              ))}
              <tr className="rp-total">
                <th>Total</th>
                <td>{eur(tco.ev.total)}</td>
                <td>{eur(tco.ice.total)}</td>
              </tr>
            </tbody>
          </table>
          <p className="rp-small">
            Soit {formatNumber(tco.evPerKm * 100, 1)} centimes par kilomètre en électrique, {formatNumber(tco.icePerKm * 100, 1)} en thermique.
            Aux 100 km : {eurCents(tco.ev100)} d'électricité contre {eurCents(tco.ice100)} de carburant.
          </p>

          <h2>Les hypothèses</h2>
          <ul className="rp-list">
            <li>
              Électricité : {eurKwh(inputs.elecHome)} à la maison, {eurKwh(inputs.elecFast)} sur borne rapide pour {inputs.fastPct} % des
              kilomètres, 10 % de pertes de recharge ; consommation réelle de {dec1(inputs.evConso)} kWh/100 km, tirée de
              l'autonomie de la version ({level}).
            </li>
            <li>
              Carburant : {formatNumber(inputs.fuelPrice, 2)} €/l (SP95-E10 : moyenne nationale du flux officiel au {new Date(`${FUEL_PRICES.date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}),
              {" "}{dec1(inputs.iceConso)} l/100 km{twinUsed ? ", la consommation homologuée plus 20 %, l'écart mesuré sur route par la Commission européenne" : ""}.
            </li>
            <li>
              Entretien : moyennes 2025 du parc, {MAINTENANCE.evMonthly} € par mois en électrique et {MAINTENANCE.iceMonthly} € en thermique
              (Roole data). Assurance : primes moyennes 2025, {eur(INSURANCE.ev)} et {eur(INSURANCE.essence)} (Assurland).
            </li>
            <li>
              Revente : après 3 ans et 60 000 km, une électrique garde en moyenne {RESALE_3Y.ev} % de son prix catalogue, une essence{" "}
              {RESALE_3Y.ice} % (Autovista), prolongé au même rythme sur la durée choisie.
            </li>
          </ul>
          <p className="rp-foot">Calcul du simulateur de coût réel d'Evly, avec vos réglages. Indicatif, sans valeur contractuelle.</p>
        </section>

        {/* ── Page 2 : l'usage ──────────────────────────────── */}
        <section className="report-page">
          <div className="rp-head">
            <span className="report-logo">evly</span>
            <span>{vehicle.name} · page 2/2</span>
          </div>

          <h2>Au quotidien</h2>
          <p className="rp-text">
            {t.set ? "Votre trajet" : "Un trajet type"} de <b>{formatNumber(t.dailyKm)} km par jour</b>, aller et retour : la batterie pleine
            couvre <b>{daysOf(version.winter, t)} jours</b> par -5 °C et <b>{daysOf(version.mixed, t)} jours</b> le reste de l'année.
            {!t.set && " Réglez « Mon trajet » sur ev-ly.com pour un rapport à votre mesure."}
          </p>
          <table className="rp-table rp-compact">
            <thead>
              <tr><th>Autonomie réelle ({level})</th><th>km</th></tr>
            </thead>
            <tbody>
              <tr><th>Usage mixte</th><td>{formatNumber(version.mixed)}</td></tr>
              {version.highway > 0 && <tr><th>Autoroute à 130 km/h</th><td>{formatNumber(version.highway)}</td></tr>}
              <tr><th>Hiver, -5 °C</th><td>{formatNumber(version.winter)}</td></tr>
            </tbody>
          </table>

          <h2>Recharger</h2>
          <table className="rp-table rp-compact">
            <thead>
              <tr><th>Une recharge</th><th>Coût</th><th>Aux 100 km</th></tr>
            </thead>
            <tbody>
              {charge.map((r) => (
                <tr key={r.label}>
                  <th>{r.label}<span>{r.window}, {eurKwh(r.price)}</span></th>
                  <td>{Array.isArray(r.charge) ? range(r.charge) : eurCents(r.charge)}</td>
                  <td>{Array.isArray(r.per100) ? `${eurCents(r.per100[0])} à ${eurCents(r.per100[1])}` : eurCents(r.per100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {version.dcMin && <p className="rp-small">De 10 à 80 % en {version.dcMin} min sur une borne rapide assez puissante.</p>}

          {vehicle.trips.length > 0 && (
            <>
              <h2>En voyage, l'été</h2>
              <table className="rp-table rp-compact">
                <thead>
                  <tr><th>Trajet</th><th>Arrêts</th><th>Durée</th><th>Énergie</th></tr>
                </thead>
                <tbody>
                  {vehicle.trips.map((tr) => (
                    <tr key={tr.slug}>
                      <th>{tr.title}<span>{formatNumber(tr.km)} km{tr.winterStops !== null ? `, ${tr.winterStops} arrêt${tr.winterStops > 1 ? "s" : ""} par -5 °C` : ""}</span></th>
                      <td>{tr.stops === 0 ? "aucun" : tr.stops}</td>
                      <td>{duration(tr.totalMin)}</td>
                      <td>{range(tr.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="rp-small">
                Arrêts posés sur les vraies bornes rapides du tracé, à 130 km/h, version la plus rapide du modèle ; énergie : batterie
                pleine rechargée à la maison, puis bornes de 0,40 à 0,70 €/kWh. Le détail sur ev-ly.com/trajets/.
              </p>
            </>
          )}

          <h2>Les aides</h2>
          <p className="rp-text">
            {inputs.evAid > 0
              ? inputs.pro
                ? `Prime CEE d'une société : ${eur(inputs.evAid)}, déduite par le vendeur.`
                : params.get("aidlabel")
                  ? `Prime CEE de votre profil (${params.get("aidlabel")}) : ${eur(inputs.evAid)}, déduite par le vendeur, d'après les revenus enregistrés sur ev-ly.com/aides/.`
                  : `Prime CEE de tout ménage : ${eur(inputs.evAid)}, déduite par le vendeur. Un ménage modeste touche davantage : votre montant selon vos revenus sur ev-ly.com/aides/.`
              : "Cette version n'ouvre pas droit à la prime CEE (prix ou score environnemental). Le détail des conditions sur ev-ly.com/aides/."}
          </p>

          <p className="rp-foot">
            Evly est un comparateur indépendant : aucun constructeur ni vendeur ne le rémunère. Chiffres des fiches publiées sur ev-ly.com,
            autonomies mesurées sur route ou estimées comme indiqué. Document indicatif, sans valeur contractuelle.
          </p>
        </section>
      </div>
    </>
  );
}
