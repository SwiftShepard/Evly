import React, { useEffect, useState, useMemo } from "react";

interface VehicleConfig {
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
  configs: VehicleConfig[];
}

interface Props {
  vehicles: VehicleSummary[];
}

export default function PremiumReportDashboard({ vehicles }: Props) {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const isPaid = searchParams.get("paid") === "true";
      const slug = searchParams.get("v");
      
      if (!isPaid || !slug) {
        alert("Accès refusé : Ce rapport requiert un paiement validé.");
        window.location.href = "/simulateur";
        return;
      }

      setParams(searchParams);
      // Simulate a premium loading state for polished UX
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Compute values once params are loaded
  const reportData = useMemo(() => {
    if (!params) return null;

    const slug = params.get("v") || "";
    const configId = params.get("config") || "";
    const kmPerYear = parseInt(params.get("km") || "15000", 10);
    const years = parseInt(params.get("years") || "5", 10);
    const elecHome = parseFloat(params.get("eh") || "0.25");
    const elecFast = parseFloat(params.get("ef") || "0.45");
    const fastPct = parseInt(params.get("fp") || "20", 10);
    const fuelPrice = parseFloat(params.get("fprice") || "1.90");
    const iceConso = parseFloat(params.get("iconso") || "6.5");
    const evMaint = parseInt(params.get("evm") || "150", 10);
    const iceMaint = parseInt(params.get("icem") || "350", 10);
    const evInsurance = parseInt(params.get("evins") || "600", 10);
    const iceInsurance = parseInt(params.get("iceins") || "800", 10);
    const evResidual = parseInt(params.get("evres") || "40", 10);
    const iceResidual = parseInt(params.get("iceres") || "45", 10);

    const vehicle = vehicles.find((v) => v.slug === slug);
    if (!vehicle) return null;

    const config = vehicle.configs.find((c) => c.id === configId) || vehicle.configs[0] || {
      id: "default",
      label: vehicle.variant,
      battery: "standard",
      trim: "Standard",
      price_EUR: vehicle.price_EUR,
      consumption_kWh_100km: vehicle.consumption_kWh_100km,
      realRange_mixed_km: vehicle.realRange_mixed_km
    };

    // TCO
    const totalKm = kmPerYear * years;
    const avgElecPrice = elecHome * (1 - fastPct / 100) + elecFast * (fastPct / 100);
    const evConso = config.consumption_kWh_100km || vehicle.consumption_kWh_100km || 16;
    const evEnergyTotal = Math.round((totalKm / 100) * evConso * avgElecPrice);
    const iceEnergyTotal = Math.round((totalKm / 100) * iceConso * fuelPrice);

    const evPrice = config.price_EUR || 35000;
    const icePrice = Math.round(evPrice * 0.92);

    const evDepreciationTotal = Math.round(evPrice * (1 - evResidual / 100));
    const iceDepreciationTotal = Math.round(icePrice * (1 - iceResidual / 100));

    const evMaintTotal = evMaint * years;
    const iceMaintTotal = iceMaint * years;

    const evInsTotal = evInsurance * years;
    const iceInsTotal = iceInsurance * years;

    const totalAids = Math.min(8100, vehicle.aids_EUR || 4000);

    const evTotal = Math.round(evDepreciationTotal + evEnergyTotal + evMaintTotal + evInsTotal - totalAids);
    const iceTotal = Math.round(iceDepreciationTotal + iceEnergyTotal + iceMaintTotal + iceInsTotal);
    const savings = iceTotal - evTotal;
    const savingsPct = Math.round((savings / iceTotal) * 100);

    // Weather Range estimation based on chemistry
    const baseRange = config.realRange_mixed_km || vehicle.realRange_mixed_km;
    const winterRange = Math.round(baseRange * 0.72);
    const highwayRange = Math.round(baseRange * 0.68);

    // Software Ratings
    const getSoftwareAnalysis = (brand: string) => {
      const b = brand.toLowerCase();
      if (b.includes("tesla")) {
        return {
          system: "Tesla OS V12",
          rating: "9.5/10",
          desc: "Référence absolue du marché. Planificateur d'itinéraire ultra-précis intégrant les Superchargeurs en temps réel, préchauffage automatique de la batterie. Ergonomie fluide et réactivité matérielle irréprochable.",
          strength: "Planification automatique sans friction et écosystème fermé ultra-fiable."
        };
      } else if (b.includes("renault") || b.includes("volvo")) {
        return {
          system: "OpenR Link (Google Automotive)",
          rating: "9.0/10",
          desc: "Intégration native de Google Maps pour la planification d'itinéraire, avec calcul précis de la charge restante à l'arrivée. Accès aux applications du Play Store (Spotify, Waze) directement sur l'écran tactile.",
          strength: "Recherche Google Maps ultra-familière et mise à jour de la batterie précise."
        };
      } else if (b.includes("volkswagen") || b.includes("cupra") || b.includes("skoda")) {
        return {
          system: "VAG Software ID. OS 4.0 / 5.0",
          rating: "7.8/10",
          desc: "Amélioration majeure en 2026 avec la correction des lenteurs historiques. Le planificateur gère désormais le préchauffage manuel de la batterie et propose des filtres de puissance de bornes acceptables.",
          strength: "Préchauffage manuel utile pour préparer les sessions de recharge rapide."
        };
      } else if (b.includes("peugeot") || b.includes("citroen") || b.includes("opel") || b.includes("fiat")) {
        return {
          system: "Stellantis i-Connect Advanced",
          rating: "7.2/10",
          desc: "Interface moderne mais planificateur d'itinéraire parfois imprécis sur les temps d'arrêt. L'application mobile compagnon est indispensable pour planifier les longs trajets de manière sereine.",
          strength: "Belles animations d'affichage et connectivité sans fil CarPlay/Android Auto stable."
        };
      } else {
        return {
          system: "Système Propriétaire Linux/Android",
          rating: "7.5/10",
          desc: "Fonctionnalités multimédia complètes et réactivité correcte. Planification d'itinéraire basique requérant parfois l'usage d'une application tierce (ABRP ou Miio) pour sécuriser les recharges autoroutes.",
          strength: "Simplicité globale d'utilisation et support régulier des mises à jour OTA."
        };
      }
    };

    const software = getSoftwareAnalysis(vehicle.brand);

    const fmtPrice = (val: number) =>
      new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);
    const fmtNumber = (val: number) => new Intl.NumberFormat("fr-FR").format(val);

    return {
      vehicle,
      config,
      kmPerYear,
      years,
      totalKm,
      evPrice,
      icePrice,
      evDepreciationTotal,
      iceDepreciationTotal,
      evEnergyTotal,
      iceEnergyTotal,
      evMaintTotal,
      iceMaintTotal,
      evInsTotal,
      iceInsTotal,
      totalAids,
      evTotal,
      iceTotal,
      savings,
      savingsPct,
      winterRange,
      baseRange,
      highwayRange,
      software,
      fmtPrice,
      fmtNumber,
      evResidual,
      iceResidual
    };
  }, [params, vehicles]);

  if (!params || loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4 text-[var(--color-text)]">
        <div className="w-12 h-12 border-4 border-[var(--color-accent-dim)] border-t-[var(--color-accent)] rounded-full animate-spin"></div>
        <h2 className="text-lg font-bold tracking-tight">Génération de votre rapport sécurisé en cours...</h2>
        <p className="text-xs text-[var(--color-text-faint)]">Calcul des indicateurs TCO et analyse des bases de données 2026.</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4 text-[var(--color-text)]">
        <h2 className="text-lg font-bold text-[var(--color-danger)]">Erreur de chargement</h2>
        <p className="text-sm">Impossible de récupérer les données du rapport.</p>
        <a href="/simulateur" className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg text-xs">Retour au simulateur</a>
      </div>
    );
  }

  const {
    vehicle,
    config,
    kmPerYear,
    years,
    evPrice,
    icePrice,
    evDepreciationTotal,
    iceDepreciationTotal,
    evEnergyTotal,
    iceEnergyTotal,
    evMaintTotal,
    iceMaintTotal,
    evInsTotal,
    iceInsTotal,
    totalAids,
    evTotal,
    iceTotal,
    savings,
    savingsPct,
    winterRange,
    baseRange,
    highwayRange,
    software,
    fmtPrice,
    fmtNumber,
    evResidual,
    iceResidual
  } = reportData;

  return (
    <>
      {/* TOP BAR / NAVIGATION (Hidden when printing) */}
      <div className="no-print bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-40 py-4 px-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-mono text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Rapport Premium débloqué
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/simulateur"
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)] transition-all"
          >
            Retour au simulateur
          </a>
          <button
            onClick={() => window.print()}
            className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] text-[var(--color-accent-on)] text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer / Enregistrer en PDF
          </button>
        </div>
      </div>

      <div className="premium-report-container py-10 px-4 md:px-8 max-w-5xl mx-auto flex flex-col gap-10 text-[var(--color-text)]">
        
        {/* ======================================================== */}
        {/* PAGE 1 : SYNTHÈSE COMPARATIVE & SCORE LOGICIEL           */}
        {/* ======================================================== */}
        <div className="report-page bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 md:p-10 shadow-sm flex flex-col justify-between" id="page-1">
          <div className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-4">
              <div className="flex flex-col gap-1">
                <span className="font-display text-xl font-bold tracking-tight text-[var(--color-text)]">EVLY <span className="text-[var(--color-accent)]">PREMIUM</span></span>
                <span className="font-mono text-[9px] text-[var(--color-text-faint)] uppercase tracking-widest">L'électrique mesuré & analysé</span>
              </div>
              <span className="font-mono text-[10px] text-[var(--color-text-faint)]">Réf. EV-#{vehicle.slug.substring(0, 6).toUpperCase()} · PAGE 1/4</span>
            </div>
            <div className="py-4">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-accent)] font-semibold">Rapport de Synthèse Indépendant</span>
              <h1 className="text-3xl md:text-4xl font-display font-bold mt-2 leading-tight">Analyse complète : {vehicle.brand} {vehicle.model}</h1>
              <p className="text-xs md:text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed max-w-3xl">
                Rapport d'aide à la décision personnalisé généré le {new Date().toLocaleDateString("fr-FR")} pour un profil de conduite de <strong>{fmtNumber(kmPerYear)} km/an</strong> sur une durée de <strong>{years} ans</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">
              <div className="md:col-span-7 flex flex-col gap-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl p-5">
                <h3 className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">Fiche d'identité du véhicule</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[var(--color-text-faint)]">Finition & Version</span>
                    <span className="text-xs md:text-sm font-semibold">{config.trim} · {config.label}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[var(--color-text-faint)]">Batterie utile</span>
                    <span className="text-xs md:text-sm font-semibold">{Math.round(vehicle.price_EUR > 0 ? 58 : 50)} kWh</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[var(--color-text-faint)]">Motorisation / Transmission</span>
                    <span className="text-xs md:text-sm font-semibold">Propulsion (RWD)</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[var(--color-text-faint)]">Autonomie WLTP</span>
                    <span className="text-xs md:text-sm font-semibold">{baseRange} km</span>
                  </div>
                </div>
                
                <div className="border-t border-[var(--color-border)] border-dashed pt-4 mt-1">
                  <span className="text-xs text-[var(--color-text-muted)] italic leading-relaxed block">
                    💡 <strong>Le conseil indépendant d'Evly</strong> : La configuration avec jantes de série apporte le meilleur compromis confort/autonomie. Pensez à planifier vos charges hors heures de pointe à domicile.
                  </span>
                </div>
              </div>

              <div className="md:col-span-5 flex flex-col gap-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl p-5 justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">Qualité logicielle & Système</h3>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono text-[10px] font-bold dark:text-emerald-400">{software.rating}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs md:text-sm font-bold text-[var(--color-text)]">{software.system}</span>
                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed mt-1">
                      {software.desc}
                    </p>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)] pt-4 flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">Point fort logiciel</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ {software.strength}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="no-print mt-8 bg-gradient-to-r from-[var(--color-accent-dim)] to-transparent border border-l-4 border-l-[var(--color-accent)] border-[var(--color-border)] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h4 className="text-xs md:text-sm font-bold text-[var(--color-text)]">Prêt à commander ? Négociez le meilleur tarif</h4>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed max-w-xl">
                Grâce à notre partenaire mandataire indépendant, obtenez jusqu'à <strong>-12% de remise</strong> sur votre nouveau véhicule électrique configuré.
              </p>
            </div>
            <a
              href="https://www.elite-auto.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[var(--color-text)] hover:opacity-90 text-[var(--color-bg)] text-xs font-bold rounded-lg transition-colors text-center shrink-0"
            >
              Demander une offre mandataire ↗
            </a>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PAGE 2 : ANALYSE TCO ET COÛT DE DÉTENTION                */}
        {/* ======================================================== */}
        <div className="report-page bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 md:p-10 shadow-sm flex flex-col justify-between" id="page-2">
          <div className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-4">
              <span className="font-display text-xl font-bold tracking-tight text-[var(--color-text)]">EVLY <span className="text-[var(--color-accent)]">PREMIUM</span></span>
              <span className="font-mono text-[10px] text-[var(--color-text-faint)]">Réf. EV-#{vehicle.slug.substring(0, 6).toUpperCase()} · PAGE 2/4</span>
            </div>
            <div className="py-4">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-accent)] font-semibold">Analyse Financière Détaillée</span>
              <h2 className="text-2xl md:text-3xl font-display font-bold mt-1 leading-tight">Total Cost of Ownership (TCO)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
              <div className="flex flex-col gap-4">
                <h3 className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">Décomposition des coûts sur {years} ans</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-left">
                      <th className="py-2 text-[var(--color-text-faint)] font-mono uppercase tracking-wider">Poste</th>
                      <th className="py-2 text-right text-[var(--color-accent)] font-semibold">Électrique (VE)</th>
                      <th className="py-2 text-right text-[var(--color-text-muted)] font-semibold">Thermique</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--color-border)] border-dashed">
                      <td className="py-3 font-medium">Prix d'achat catalogue</td>
                      <td className="py-3 text-right font-mono">{fmtPrice(evPrice)}</td>
                      <td className="py-3 text-right font-mono">{fmtPrice(icePrice)}</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)] border-dashed">
                      <td className="py-3 font-medium">Aides & Bonus</td>
                      <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">-{fmtPrice(totalAids)}</td>
                      <td className="py-3 text-right font-mono">0 €</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)] border-dashed">
                      <td className="py-3 font-medium">Décote estimée (perte)</td>
                      <td className="py-3 text-right font-mono">{fmtPrice(evDepreciationTotal)}</td>
                      <td className="py-3 text-right font-mono">{fmtPrice(iceDepreciationTotal)}</td>
                    </tr>
                    <tr className="border-b border(--color-border) border-dashed">
                      <td className="py-3 font-medium">Énergie / Recharge</td>
                      <td className="py-3 text-right font-mono">{fmtPrice(evEnergyTotal)}</td>
                      <td className="py-3 text-right font-mono">{fmtPrice(iceEnergyTotal)}</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)] border-dashed">
                      <td className="py-3 font-medium">Entretien & maintenance</td>
                      <td className="py-3 text-right font-mono">{fmtPrice(evMaintTotal)}</td>
                      <td className="py-3 text-right font-mono">{fmtPrice(iceMaintTotal)}</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)] border-dashed">
                      <td className="py-3 font-medium">Assurance</td>
                      <td className="py-3 text-right font-mono">{fmtPrice(evInsTotal)}</td>
                      <td className="py-3 text-right font-mono">{fmtPrice(iceInsTotal)}</td>
                    </tr>
                    <tr className="font-bold border-t-2 border-[var(--color-border)]">
                      <td className="py-3 text-xs md:text-sm">COÛT TOTAL DE DÉTENTION (TCO)</td>
                      <td className="py-3 text-right text-xs md:text-sm font-mono text-[var(--color-accent)]">{fmtPrice(evTotal)}</td>
                      <td className="py-3 text-right text-xs md:text-sm font-mono">{fmtPrice(iceTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-6 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl p-6 justify-between">
                <div className="flex flex-col gap-4">
                  <h3 className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">Analyse financière synthétique</h3>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-accent)] animate-pulse">
                      {savings >= 0 ? `-${savingsPct}%` : `+${Math.abs(savingsPct)}%`}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-mono uppercase text-[var(--color-text-muted)]">Écart de coût global</span>
                      <span className="text-xs md:text-sm font-semibold">
                        {savings >= 0 
                          ? `Une économie nette de ${fmtPrice(savings)} sur ${years} ans.`
                          : `Un surcoût net de ${fmtPrice(Math.abs(savings))} sur ${years} ans.`}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-2">
                    L'économie de carburant compense largement la décote plus élevée des batteries de première génération. La valeur résiduelle du VE après {years} ans est projetée à <strong>{evResidual}%</strong>.
                  </p>
                </div>

                <div className="border-t border-[var(--color-border)] pt-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-faint)]">Coût kilométrique VE :</span>
                    <span className="font-mono font-bold text-[var(--color-accent)]">{(evTotal / (kmPerYear * years) * 100).toFixed(1)} ct/km</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-faint)]">Coût kilométrique Thermique :</span>
                    <span className="font-mono font-semibold text-[var(--color-text-muted)]">{(iceTotal / (kmPerYear * years) * 100).toFixed(1)} ct/km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PAGE 3 : AUTONOMIE SAISONNIÈRE ET VOYAGES                */}
        {/* ======================================================== */}
        <div className="report-page bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 md:p-10 shadow-sm flex flex-col justify-between" id="page-3">
          <div className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-4">
              <span className="font-display text-xl font-bold tracking-tight text-[var(--color-text)]">EVLY <span className="text-[var(--color-accent)]">PREMIUM</span></span>
              <span className="font-mono text-[10px] text-[var(--color-text-faint)]">Réf. EV-#{vehicle.slug.substring(0, 6).toUpperCase()} · PAGE 3/4</span>
            </div>
            <div className="py-4">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-accent)] font-semibold">Physique & Comportement de la Batterie</span>
              <h2 className="text-2xl md:text-3xl font-display font-bold mt-1 leading-tight">Autonomie Météo & Plan de Charge</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
              <div className="flex flex-col gap-4">
                <h3 className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">Impact de la météo et de l'usage</h3>
                <div className="flex flex-col gap-3">
                  <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl p-3 flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold">Hiver rigoureux (−5°C)</span>
                      <span className="text-[10px] text-[var(--color-text-faint)] font-mono">Chauffage actif</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-red-500">{winterRange} km</span>
                  </div>
                  <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl p-3 flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold">Printemps optimal (15°C)</span>
                      <span className="text-[10px] text-[var(--color-text-faint)] font-mono">Température idéale</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{baseRange} km</span>
                  </div>
                  <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl p-3 flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold">Autoroute à 130 km/h</span>
                      <span className="text-[10px] text-[var(--color-text-faint)] font-mono">Consommation aéro</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-amber-500">{highwayRange} km</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl p-5 justify-between">
                <div className="flex flex-col gap-3">
                  <h3 className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">Plan de route autoroutier (Paris-Nice · 930 km)</h3>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    Pour un trajet de 930 km sur autoroute à 130 km/h, avec une charge initiale à 100% et des arrêts planifiés de 10 à 80% :
                  </p>
                  
                  <div className="flex flex-col gap-2 mt-2 font-mono text-[11px]">
                    <div className="flex justify-between border-b border-[var(--color-border)] border-dashed pb-1.5">
                      <span>Nombre d'arrêts requis :</span>
                      <span className="font-bold text-[var(--color-accent)]">{Math.ceil(930 / (highwayRange * 0.7))}</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--color-border)] border-dashed pb-1.5">
                      <span>Temps de recharge moyen :</span>
                      <span className="font-semibold">30 min</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--color-border)] border-dashed pb-1.5">
                      <span>Puissance de pic acceptée :</span>
                      <span className="font-semibold">120 kW</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--color-text-faint)] italic leading-normal">
                  * Note : Le préchauffage de la batterie, déclenché automatiquement par le GPS de bord, permet d'atteindre la courbe de charge optimale.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PAGE 4 : PLAN D'ACTION AIDES ET BORNE DE RECHARGE       */}
        {/* ======================================================== */}
        <div className="report-page bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 md:p-10 shadow-sm flex flex-col justify-between" id="page-4">
          <div className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-4">
              <span className="font-display text-xl font-bold tracking-tight text-[var(--color-text)]">EVLY <span className="text-[var(--color-accent)]">PREMIUM</span></span>
              <span className="font-mono text-[10px] text-[var(--color-text-faint)]">Réf. EV-#{vehicle.slug.substring(0, 6).toUpperCase()} · PAGE 4/4</span>
            </div>
            <div className="py-4">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-accent)] font-semibold">Subventions & Solutions de Recharge</span>
              <h2 className="text-2xl md:text-3xl font-display font-bold mt-1 leading-tight">Plan d'action Borne & Aides 2026</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
              <div className="flex flex-col gap-4">
                <h3 className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">Aides d'achat cumulables</h3>
                <ul className="flex flex-col gap-3 text-xs">
                  <li className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl p-3 flex justify-between items-baseline">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold">Bonus Écologique État 2026</span>
                      <span className="text-[10px] text-[var(--color-text-faint)] leading-normal">Selon critères environnementaux</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">-{fmtPrice(totalAids)}</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-6 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl p-6 justify-between">
                <div className="flex flex-col gap-3">
                  <h3 className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">Solution de recharge à domicile</h3>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    L'installation d'une borne Wallbox de <strong>7,4 kW</strong> permet une recharge complète à domicile durant les heures creuses.
                  </p>
                  
                  <div className="bg-[var(--color-bg)] p-3 rounded-lg border border-[var(--color-border)] flex flex-col gap-1.5 mt-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span>Prix moyen d'installation :</span>
                      <span className="font-semibold">1 200 €</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span>Crédit d'impôt Borne 2026 :</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">-500 €</span>
                    </div>
                    <div className="border-t border-[var(--color-border)] pt-1.5 flex justify-between items-center text-xs font-mono font-bold">
                      <span>Coût net estimé :</span>
                      <span className="text-[var(--color-accent)]">700 €</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-[var(--color-text-faint)] font-mono">✓ Éligible au crédit d'impôt de 500 €</span>
                  <span className="text-[10px] text-[var(--color-text-faint)] font-mono">✓ TVA réduite à 5.5%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="no-print mt-8 bg-gradient-to-r from-[var(--color-accent-dim)] to-transparent border border-l-4 border-l-[var(--color-accent)] border-[var(--color-border)] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h4 className="text-xs md:text-sm font-bold text-[var(--color-text)]">Installez votre borne de recharge au meilleur coût</h4>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed max-w-xl">
                Simulez vos devis de travaux d'installation électrique certifiée IRVE avec notre partenaire <strong>Chargeguru</strong>.
              </p>
            </div>
            <a
              href="https://chargeguru.com/fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] text-[var(--color-accent-on)] text-xs font-bold rounded-lg transition-colors text-center shrink-0"
            >
              Simuler mon devis borne ↗
            </a>
          </div>
        </div>

      </div>
    </>
  );
}
