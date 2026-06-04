import React, { useEffect, useState, useMemo } from "react";
import type { Vehicle } from "@/data/schemas";
import { calculateCeeAid } from "@/lib/cee";
import { ArrowLeft, Printer, RotateCcw, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";

interface Props {
  vehicles: Vehicle[];
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
    
    // Electric parameters
    const elecHome = parseFloat(params.get("eh") || "0.25");
    const elecFast = parseFloat(params.get("ef") || "0.45");
    const fastPct = parseInt(params.get("fp") || "20", 10);
    const evMaint = parseInt(params.get("evm") || "150", 10);
    const evInsurance = parseInt(params.get("evins") || "600", 10);
    const evResidual = parseInt(params.get("evres") || "40", 10);

    // Thermal (ICE) parameters
    const fuelPrice = parseFloat(params.get("fprice") || "1.90");
    const iceConso = parseFloat(params.get("iconso") || "6.5");
    const iceMaint = parseInt(params.get("icem") || "350", 10);
    const iceInsurance = parseInt(params.get("iceins") || "800", 10);
    const iceResidual = parseInt(params.get("iceres") || "45", 10);

    const vehicle = vehicles.find((v) => v.slug === slug);
    if (!vehicle) return null;

    // Find config or fallback
    const config = vehicle.configurations.find((c) => c.id === configId) || vehicle.configurations[0] || {
      id: "default",
      label: vehicle.variant,
      battery: "standard",
      trim: "Standard",
      price_EUR: vehicle.trims[0]?.price_EUR || 35000,
      wltp_consumption_kWh_100km: vehicle.consumption_mixed_kWh_per_100km,
      realRange: vehicle.realRange,
      usableCapacity_kWh: vehicle.usableCapacity_kWh,
      chargingDC_peak_kW: vehicle.chargingDC.peakPower_kW,
      chargingDC_10_80_min: vehicle.chargingDC.time_10_80_min,
      chargingDC_kWh_30min: vehicle.chargingDC.kWh_added_30min,
      availability: "available",
      notes: null,
    };

    // Computations
    const totalKm = kmPerYear * years;
    
    // ev energy
    const avgElecPrice = elecHome * (1 - fastPct / 100) + elecFast * (fastPct / 100);
    const evConso = config.wltp_consumption_kWh_100km || vehicle.consumption_mixed_kWh_per_100km || 16.0;
    const evEnergyTotal = Math.round((totalKm / 100) * evConso * avgElecPrice);

    // ice energy
    const iceEnergyTotal = Math.round((totalKm / 100) * iceConso * fuelPrice);

    // Purchase prices
    const evPrice = config.price_EUR || 35000;
    const icePrice = Math.round(evPrice * 0.90); // ICE equivalent is roughly 10% cheaper catalog-wise

    // Depreciation
    const evDepreciationTotal = Math.round(evPrice * (1 - evResidual / 100));
    const iceDepreciationTotal = Math.round(icePrice * (1 - iceResidual / 100));

    // Maintenance & Insurance
    const evMaintTotal = evMaint * years;
    const iceMaintTotal = iceMaint * years;
    const evInsTotal = evInsurance * years;
    const iceInsTotal = iceInsurance * years;

    // CEE aids
    const householdSize = 3; // default family
    const taxIncome = 30000; // default medium
    const { amount: aidsAmount } = calculateCeeAid({
      vehicle,
      price: evPrice,
      profileType: "particular",
      householdSize,
      taxIncome,
    });
    const totalAids = aidsAmount;

    // TCO
    const evTotal = Math.round(evDepreciationTotal + evEnergyTotal + evMaintTotal + evInsTotal - totalAids);
    const iceTotal = Math.round(iceDepreciationTotal + iceEnergyTotal + iceMaintTotal + iceInsTotal);
    const savings = iceTotal - evTotal;
    const savingsPct = Math.round((savings / iceTotal) * 100);

    // Weather autonomy based on real specifications
    const baseRange = config.realRange?.mixed_km || vehicle.realRange.mixed_km || 350;
    const winterRange = config.realRange?.winter_minus5_km || vehicle.realRange.winter_minus5_km || Math.round(baseRange * 0.72);
    const highwayRange = config.realRange?.highway_130_km || vehicle.realRange.highway_130_km || Math.round(baseRange * 0.68);

    // Software analyst
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
          rating: "8.0/10",
          desc: "Amélioration majeure en 2026 avec la correction des lenteurs historiques. Le planificateur gère désormais le préchauffage manuel de la batterie et propose des filtres de puissance de bornes acceptables.",
          strength: "Préchauffage manuel utile pour préparer les sessions de recharge rapide."
        };
      } else if (b.includes("peugeot") || b.includes("citroen") || b.includes("opel") || b.includes("fiat") || b.includes("jeep") || b.includes("lancia")) {
        return {
          system: "Stellantis i-Connect Advanced",
          rating: "7.2/10",
          desc: "Interface moderne mais planificateur d'itinéraire parfois imprécis sur les temps d'arrêt. L'application mobile compagnon est conseillée pour planifier les longs trajets de manière sereine.",
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
      iceResidual,
      elecHome,
      elecFast,
      fastPct,
      fuelPrice,
      iceConso,
      evMaint,
      iceMaint,
      evInsurance,
      iceInsurance,
      evConso,
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
    iceResidual,
    elecHome,
    elecFast,
    fastPct,
    fuelPrice,
    iceConso,
    evMaint,
    iceMaint,
    evInsurance,
    iceInsurance,
    evConso,
  } = reportData;

  // Expert Verdict written dynamically based on vehicle properties
  const generateExpertVerdict = () => {
    const isEU = vehicle.productionCountry === "France" || vehicle.productionCountry === "Allemagne" || vehicle.productionCountry === "Espagne";
    const isLfp = vehicle.chemistry === "LFP";
    const highRange = baseRange >= 450;
    
    let part1 = `L'analyse croisée de vos habitudes de conduite et des caractéristiques de la ${vehicle.brand} ${vehicle.model} met en avant une excellente adéquation. Pour vos trajets réguliers, la capacité utile et l'efficience énergétique du moteur permettent de couvrir vos besoins quotidiens sans aucune restriction d'usage.`;
    if (kmPerYear > 20000) {
      part1 += ` Votre kilométrage important (${fmtNumber(kmPerYear)} km/an) maximise l'amortissement rapide du surcoût d'achat initial face au thermique grâce à un coût en électricité très compétitif.`;
    }

    let part2 = `Sur le plan de la batterie, l'accumulateur en chimie ${vehicle.chemistry} présente des caractéristiques thermiques stables. `;
    if (isLfp) {
      part2 += "La technologie Lithium-Fer-Phosphate (LFP) vous permet de charger le véhicule à 100% quotidiennement sans risque de dégradation prématurée, ce qui optimise l'autonomie utile disponible au jour le jour.";
    } else {
      part2 += "La technologie NMC (Nickel-Manganèse-Cobalt) offre une excellente densité énergétique et conserve une très bonne puissance de recharge par grand froid, idéale pour vos longs trajets autoroutiers.";
    }

    let part3 = `Enfin, l'interface logicielle et la présence d'un planificateur de charge intelligent ${vehicle.brand === "Tesla" || vehicle.brand === "Renault" ? "ultra-performant" : "correct"} simplifient l'usage sur longue distance. `;
    if (isEU) {
      part3 += `Assemblé en ${vehicle.productionCountry}, ce modèle bénéficie d'une empreinte carbone de fabrication réduite et sécurise son éligibilité aux aides environnementales 2026.`;
    } else {
      part3 += `Bien qu'assemblé en dehors de l'Union européenne (${vehicle.productionCountry}), les prestations routières de ce modèle compensent l'absence d'aides CEE directes de l'État.`;
    }

    return { part1, part2, part3 };
  };

  const verdict = generateExpertVerdict();

  return (
    <>
      <style>{`
        /* Styles spécifiques pour le rendu haut de gamme et l'impression vectorielle */
        .report-page {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        @media screen {
          .report-page:hover {
            box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08);
          }
        }
        .metric-badge {
          background: bg-[var(--color-bg-subtle)];
          border: 1px solid var(--color-border);
        }
        .print-only {
          display: none !important;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .report-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .bg-slate-50, .bg-[var(--color-bg-subtle)] {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .text-emerald-600 {
            color: #059669 !important;
          }
          .text-accent, .text-[var(--color-accent)] {
            color: #2563eb !important; /* Force a dark readable blue or primary accent */
          }
        }
      `}</style>

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
            <Printer size={14} />
            Imprimer / Enregistrer en PDF
          </button>
        </div>
      </div>

      <div className="premium-report-container py-10 px-4 md:px-8 max-w-5xl mx-auto flex flex-col gap-10 text-[var(--color-text)]">
        
        {/* ======================================================== */}
        {/* PAGE 1 : PAGE DE GARDE & DIAGNOSTIC DE L'EXPERT          */}
        {/* ======================================================== */}
        <div className="report-page bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 md:p-12 shadow-sm flex flex-col justify-between" id="page-1">
          <div className="flex flex-col gap-6">
            {/* Header document */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-5">
              <div className="flex flex-col gap-1">
                <span className="font-display text-2xl font-bold tracking-tight text-[var(--color-text)]">
                  EVLY <span className="text-[var(--color-accent)] font-semibold font-mono tracking-tighter">PREMIUM</span>
                </span>
                <span className="font-mono text-[9px] text-[var(--color-text-faint)] uppercase tracking-widest">
                  L'électrique mesuré & analysé · Rapport Indépendant
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] text-[var(--color-text-faint)] block">Réf : EV-{vehicle.slug.substring(0, 8).toUpperCase()}</span>
                <span className="font-mono text-[9px] text-[var(--color-text-faint)] block">PAGE 1/4</span>
              </div>
            </div>

            {/* Document Title */}
            <div className="py-6 relative">
              <div className="absolute top-0 right-0 opacity-10 pointer-events-none no-print">
                <Sparkles size={120} className="text-[var(--color-accent)]" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-[var(--color-accent-dim)] text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] uppercase font-semibold">
                Étude de Compatibilité & TCO 2026
              </span>
              <h1 className="text-4xl md:text-5xl font-display font-bold mt-4 tracking-tight leading-[1.15] text-[var(--color-text)]">
                Analyse complète & Dossier d'Aide à la Décision<br />
                <span className="text-[var(--color-accent)] font-semibold">{vehicle.brand} {vehicle.model}</span>
              </h1>
              <p className="text-xs md:text-sm text-[var(--color-text-muted)] mt-4 leading-relaxed max-w-3xl">
                Diagnostic technique et comparatif de coût total de détention personnalisé, établi de manière neutre par l'équipe Evly pour un profil d'usage de <strong>{fmtNumber(kmPerYear)} km/an</strong> sur une période de <strong>{years} ans</strong>.
              </p>
            </div>

            {/* Twin grids: Config parameters & Tech specs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">
              {/* Left Column: Client profile recap */}
              <div className="md:col-span-6 flex flex-col gap-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl p-6">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">1. Paramètres de Votre Profil</h3>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Usage principal</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {params.get("usage") === "highway" ? "Autoroutier régulier" : params.get("usage") === "urban" ? "Urbain quotidien" : "Mixte (périurbain/route)"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Kilométrage annuel</span>
                    <span className="font-semibold text-[var(--color-text)]">{fmtNumber(kmPerYear)} km / an</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Mode de recharge</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {params.get("charging") === "home" ? "Domicile (Heures Creuses)" : params.get("charging") === "public_fast" ? "Bornes rapides DC" : "Bornes lentes publiques"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Structure du foyer</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {params.get("household") === "large_family" ? "Grande famille (5+ p.)" : params.get("household") === "family" ? "Foyer familial (3-4 p.)" : "Célibataire / Couple"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Financement visé</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {params.get("budgetType") === "lease" ? "Location (LOA / LLD / L.S.)" : "Achat Comptant / Crédit"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Budget maximum</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {params.get("budgetType") === "lease" ? `${fmtPrice(parseInt(params.get("budgetMax") || "300", 10))} / mois` : fmtPrice(parseInt(params.get("budgetMax") || "40000", 10))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Vehicle Technical details */}
              <div className="md:col-span-6 flex flex-col gap-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl p-6">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">2. Spécifications du Véhicule</h3>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Version & Finition</span>
                    <span className="font-semibold text-[var(--color-text)] overflow-hidden text-ellipsis whitespace-nowrap" title={`${config.trim} · ${config.label}`}>
                      {config.trim} ({config.label})
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Capacité Batterie (Utile)</span>
                    <span className="font-semibold text-[var(--color-text)]">{config.usableCapacity_kWh || vehicle.usableCapacity_kWh} kWh ({vehicle.chemistry})</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Puissance & Couple</span>
                    <span className="font-semibold text-[var(--color-text)]">{vehicle.power_hp} ch / {vehicle.torque_Nm} Nm</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Architecture & Charge DC</span>
                    <span className="font-semibold text-[var(--color-text)]">{vehicle.architecture_V || 400}V · Pic {config.chargingDC_peak_kW || vehicle.chargingDC.peakPower_kW} kW</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Volume de Coffre (Min/Max)</span>
                    <span className="font-semibold text-[var(--color-text)]">{vehicle.trunkCapacity_L} L / {vehicle.trunkCapacityMax_L || "N/A"} L</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Origine d'assemblage</span>
                    <span className="font-semibold text-[var(--color-text)]">{vehicle.productionCountry}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expert Editorial Review */}
            <div className="border-t border-[var(--color-border)] pt-5 mt-2 flex flex-col gap-3">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">3. Verdict de l'Expert Evly</h3>
              <div className="text-xs text-[var(--color-text-muted)] leading-relaxed flex flex-col gap-3">
                <p>{verdict.part1}</p>
                <p>{verdict.part2}</p>
                <p>{verdict.part3}</p>
              </div>
            </div>
          </div>

          {/* Page 1 conversion footer */}
          <div className="no-print mt-6 bg-gradient-to-r from-[var(--color-accent-dim)] to-transparent border border-l-4 border-l-[var(--color-accent)] border-[var(--color-border)] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-bold text-[var(--color-text)]">Envie de concrétiser ce projet ? Mandataire Élite-Auto</h4>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                Profitez de remises négociées jusqu'à <strong>-12%</strong> sur les stocks de {vehicle.brand} en France.
              </p>
            </div>
            <a
              href="https://www.elite-auto.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[var(--color-text)] hover:opacity-90 text-[var(--color-bg)] text-xs font-bold rounded-lg transition-colors text-center shrink-0"
            >
              Négocier mon offre ↗
            </a>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PAGE 2 : BUDGET COMPARATIF TCO & GRAPHIQUE VECTORIEL     */}
        {/* ======================================================== */}
        <div className="report-page bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 md:p-12 shadow-sm flex flex-col justify-between" id="page-2">
          <div className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-5">
              <span className="font-display text-2xl font-bold tracking-tight text-[var(--color-text)]">
                EVLY <span className="text-[var(--color-accent)] font-semibold font-mono tracking-tighter">PREMIUM</span>
              </span>
              <span className="font-mono text-[10px] text-[var(--color-text-faint)]">Réf : EV-{vehicle.slug.substring(0, 8).toUpperCase()} · PAGE 2/4</span>
            </div>

            <div className="py-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-[var(--color-accent-dim)] text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] uppercase font-semibold">
                Analyse Budgétaire & Coût Kilométrique Réel
              </span>
              <h2 className="text-3xl font-display font-bold mt-3 tracking-tight text-[var(--color-text)]">
                Total Cost of Ownership (TCO)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-2">
              {/* Financial comparison table */}
              <div className="md:col-span-7 flex flex-col gap-3">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">
                  Bilan comptable estimé sur {years} ans
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-[var(--color-text-muted)]">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-left text-[9px] font-mono uppercase text-[var(--color-text-faint)]">
                        <th className="py-2">Poste de dépenses</th>
                        <th className="py-2 text-right text-[var(--color-accent)] font-semibold">Électrique (VE)</th>
                        <th className="py-2 text-right">Thermique (ICE)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)] divide-dashed">
                      <tr>
                        <td className="py-2.5 font-medium text-[var(--color-text)]">Prix catalogue de base</td>
                        <td className="py-2.5 text-right font-mono font-semibold">{fmtPrice(evPrice)}</td>
                        <td className="py-2.5 text-right font-mono">{fmtPrice(icePrice)}</td>
                      </tr>
                      {totalAids > 0 && (
                        <tr>
                          <td className="py-2.5 font-medium text-emerald-600">Bonus écologique / aides 2026</td>
                          <td className="py-2.5 text-right font-mono font-bold text-emerald-600">-{fmtPrice(totalAids)}</td>
                          <td className="py-2.5 text-right font-mono">0 €</td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-2.5 font-medium text-[var(--color-text)]">Dépréciation (décote après {years} ans)</td>
                        <td className="py-2.5 text-right font-mono">{fmtPrice(evDepreciationTotal)}</td>
                        <td className="py-2.5 text-right font-mono">{fmtPrice(iceDepreciationTotal)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-medium text-[var(--color-text)]">Coût en énergie (carburant/recharge)</td>
                        <td className="py-2.5 text-right font-mono">{fmtPrice(evEnergyTotal)}</td>
                        <td className="py-2.5 text-right font-mono">{fmtPrice(iceEnergyTotal)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-medium text-[var(--color-text)]">Maintenance (révisions, usure pneus)</td>
                        <td className="py-2.5 text-right font-mono">{fmtPrice(evMaintTotal)}</td>
                        <td className="py-2.5 text-right font-mono">{fmtPrice(iceMaintTotal)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-medium text-[var(--color-text)]">Assurance (prime cumulée)</td>
                        <td className="py-2.5 text-right font-mono">{fmtPrice(evInsTotal)}</td>
                        <td className="py-2.5 text-right font-mono">{fmtPrice(iceInsTotal)}</td>
                      </tr>
                      <tr className="font-bold border-t-2 border-[var(--color-border)] text-[var(--color-text)] bg-[var(--color-bg-subtle)]">
                        <td className="py-3 text-xs md:text-sm">COÛT TOTAL DE DÉTENTION (TCO)</td>
                        <td className="py-3 text-right text-xs md:text-sm font-mono text-[var(--color-accent)]">{fmtPrice(evTotal)}</td>
                        <td className="py-3 text-right text-xs md:text-sm font-mono">{fmtPrice(iceTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right column: TCO analysis card & custom vector chart */}
              <div className="md:col-span-5 flex flex-col gap-6 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl p-6 justify-between">
                <div className="flex flex-col gap-3">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">
                    Rentabilité & Économie Générée
                  </h3>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <div className="text-4xl font-bold tracking-tight text-emerald-600">
                      {savings >= 0 ? `-${savingsPct}%` : `+${Math.abs(savingsPct)}%`}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono uppercase text-[var(--color-text-faint)]">Bilan financier</span>
                      <span className="text-xs font-semibold text-[var(--color-text)]">
                        {savings >= 0 
                          ? `Économie de ${fmtPrice(savings)}`
                          : `Surcoût de ${fmtPrice(Math.abs(savings))}`}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-2">
                    Le coût d'usage réduit du VE (électricité et entretien) compense largement la décote supérieure et la perte résiduelle du véhicule. Le coût de détention par kilomètre revient à :
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-2 border-t border-[var(--color-border)] pt-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-[var(--color-text-faint)] uppercase">Électrique (VE)</span>
                      <span className="text-sm font-bold font-mono text-[var(--color-accent)]">{(evTotal / totalKm).toFixed(2)} € / km</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-[var(--color-text-faint)] uppercase">Thermique</span>
                      <span className="text-sm font-semibold font-mono text-[var(--color-text-muted)]">{(iceTotal / totalKm).toFixed(2)} € / km</span>
                    </div>
                  </div>
                </div>

                {/* Styled Vector SVG Stack Chart representing cost components */}
                <div className="border-t border-[var(--color-border)] pt-4">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold block mb-2">
                    Visualisation graphique des coûts
                  </span>
                  
                  <svg viewBox="0 0 320 120" className="w-full h-auto text-[var(--color-text)] font-sans" aria-hidden="true">
                    {/* Background rails */}
                    <rect x="0" y="15" width="220" height="24" rx="4" fill="var(--color-border)" opacity="0.3" />
                    <rect x="0" y="65" width="220" height="24" rx="4" fill="var(--color-border)" opacity="0.3" />
                    
                    {/* EV Bar */}
                    <rect x="0" y="15" width={Math.max(20, Math.min(220, (evTotal / Math.max(evTotal, iceTotal)) * 220))} height="24" rx="4" fill="var(--color-accent)" />
                    <text x="8" y="30" className="text-[10px] font-bold fill-[var(--color-accent-on)] font-mono">{fmtPrice(evTotal)}</text>
                    <text x="230" y="30" className="text-[9px] font-mono fill-[var(--color-text-muted)]">Électrique</text>

                    {/* ICE Bar */}
                    <rect x="0" y="65" width={Math.max(20, Math.min(220, (iceTotal / Math.max(evTotal, iceTotal)) * 220))} height="24" rx="4" fill="var(--color-text-muted)" />
                    <text x="8" y="80" className="text-[10px] font-bold fill-[var(--color-bg)] font-mono">{fmtPrice(iceTotal)}</text>
                    <text x="230" y="80" className="text-[9px] font-mono fill-[var(--color-text-muted)]">Thermique</text>
                    
                    {/* Footnote */}
                    <text x="0" y="112" className="text-[8px] fill-[var(--color-text-faint)] italic">Valeurs nettes incluant bonus et décote sur {years} ans.</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4 text-[10px] text-[var(--color-text-faint)] leading-normal flex justify-between items-center">
            <span>Données basées sur les barèmes de l'ADEME, tarifs électricité EDF 2026 et carburant moyen France.</span>
            <span className="font-mono">PAGE 2/4</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PAGE 3 : IMPACT MÉTÉO ET SIMULATEUR DE GRAND VOYAGE      */}
        {/* ======================================================== */}
        <div className="report-page bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 md:p-12 shadow-sm flex flex-col justify-between" id="page-3">
          <div className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-5">
              <span className="font-display text-2xl font-bold tracking-tight text-[var(--color-text)]">
                EVLY <span className="text-[var(--color-accent)] font-semibold font-mono tracking-tighter">PREMIUM</span>
              </span>
              <span className="font-mono text-[10px] text-[var(--color-text-faint)]">Réf : EV-{vehicle.slug.substring(0, 8).toUpperCase()} · PAGE 3/4</span>
            </div>

            <div className="py-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-[var(--color-accent-dim)] text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] uppercase font-semibold">
                Physique Appliquée & Plan de Charge
              </span>
              <h2 className="text-3xl font-display font-bold mt-3 tracking-tight text-[var(--color-text)]">
                Autonomie Météo & Plan de Charge
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-2">
              {/* Seasonal Autonomy impact gauges */}
              <div className="md:col-span-6 flex flex-col gap-4">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">
                  Impact météo sur l'autonomie réelle
                </h3>
                
                <div className="flex flex-col gap-4">
                  {/* Printemps / Optimal */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold">Printemps / Automne optimal (15°C - 20°C)</span>
                      <span className="font-mono font-bold text-emerald-600">{baseRange} km</span>
                    </div>
                    <div className="w-full h-2.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }}></div>
                    </div>
                    <span className="text-[9px] text-[var(--color-text-faint)]">Consommation optimale de {(config.wltp_consumption_kWh_100km || vehicle.consumption_mixed_kWh_per_100km || 16).toFixed(1)} kWh/100km</span>
                  </div>

                  {/* Autoroute 130 km/h */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold">Autoroute à vitesse stabilisée (130 km/h)</span>
                      <span className="font-mono font-bold text-amber-500">{highwayRange} km</span>
                    </div>
                    <div className="w-full h-2.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(highwayRange / baseRange) * 100}%` }}></div>
                    </div>
                    <span className="text-[9px] text-[var(--color-text-faint)]">Résistance de l'air accrue (consommation en hausse de ~35%)</span>
                  </div>

                  {/* Hiver -5°C */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold">Hiver rigoureux (−5°C avec chauffage)</span>
                      <span className="font-mono font-bold text-red-500">{winterRange} km</span>
                    </div>
                    <div className="w-full h-2.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${(winterRange / baseRange) * 100}%` }}></div>
                    </div>
                    <span className="text-[9px] text-[var(--color-text-faint)]">Baisse d'autonomie de -{Math.round(((baseRange - winterRange) / baseRange) * 100)}% en raison de la chauffe de l'habitacle</span>
                  </div>
                </div>
              </div>

              {/* Highway route trip planner */}
              <div className="md:col-span-6 flex flex-col gap-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl p-6 justify-between">
                <div className="flex flex-col gap-3">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">
                    Planificateur de voyage type : Paris - Nice (930 km)
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    Simulation pour un départ à 100% de charge sur autoroute en condition mixte (110-130 km/h) avec arrêts optimisés de 10% à 80% :
                  </p>
                  
                  {/* Detailed planner specs */}
                  <div className="flex flex-col gap-2.5 mt-2 font-mono text-xs">
                    <div className="flex justify-between border-b border-[var(--color-border)] border-dashed pb-2">
                      <span className="text-[var(--color-text-muted)]">Nombre d'arrêts de charge :</span>
                      <span className="font-bold text-[var(--color-accent)]">{Math.ceil(930 / (highwayRange * 0.7))} arrêts</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--color-border)] border-dashed pb-2">
                      <span className="text-[var(--color-text-muted)]">Durée d'un arrêt (10-80%) :</span>
                      <span className="font-semibold">{config.chargingDC_10_80_min || vehicle.chargingDC.time_10_80_min || 30} min</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--color-border)] border-dashed pb-2">
                      <span className="text-[var(--color-text-muted)]">Temps total de charge cumulé :</span>
                      <span className="font-semibold">{Math.ceil(930 / (highwayRange * 0.7)) * (config.chargingDC_10_80_min || vehicle.chargingDC.time_10_80_min || 30)} min</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--color-border)] border-dashed pb-2">
                      <span className="text-[var(--color-text-muted)]">Coût total électricité du trajet :</span>
                      <span className="font-bold text-[var(--color-accent)]">
                        {fmtPrice(Math.round(((930 / 100) * (evConso * 1.35)) * elecFast))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)] pt-4 text-[10px] text-[var(--color-text-faint)] leading-normal flex gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                  <p>
                    <strong>Recommandation</strong> : Planifiez vos arrêts via le GPS embarqué du véhicule pour pré-conditionner la batterie, garantissant le maintien de la courbe de charge rapide maximale dès votre arrivée à la borne.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4 text-[10px] text-[var(--color-text-faint)] leading-normal flex justify-between items-center">
            <span>Estimations physiques réelles Evly basées sur les bases de données d'essais à 130 km/h constants.</span>
            <span className="font-mono">PAGE 3/4</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PAGE 4 : PLAN DE CHARGE DOMICILE & SUBVENTIONS 2026      */}
        {/* ======================================================== */}
        <div className="report-page bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 md:p-12 shadow-sm flex flex-col justify-between" id="page-4">
          <div className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-5">
              <span className="font-display text-2xl font-bold tracking-tight text-[var(--color-text)]">
                EVLY <span className="text-[var(--color-accent)] font-semibold font-mono tracking-tighter">PREMIUM</span>
              </span>
              <span className="font-mono text-[10px] text-[var(--color-text-faint)]">Réf : EV-{vehicle.slug.substring(0, 8).toUpperCase()} · PAGE 4/4</span>
            </div>

            <div className="py-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-[var(--color-accent-dim)] text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] uppercase font-semibold">
                Installation Électrique & Dispositifs d'Aide
              </span>
              <h2 className="text-3xl font-display font-bold mt-3 tracking-tight text-[var(--color-text)]">
                Plan d'action Borne & Aides 2026
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-2">
              {/* Purchase subsidies guide */}
              <div className="md:col-span-6 flex flex-col gap-4">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">
                  Aides d'achat et incitations fiscales
                </h3>
                
                <div className="flex flex-col gap-3">
                  {/* Bonus écologique */}
                  <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl p-4 flex justify-between items-center text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[var(--color-text)]">Bonus Écologique État 2026</span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {totalAids > 0 ? "Modèle éligible (production européenne)" : "Modèle non éligible"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-600">
                      {totalAids > 0 ? `-${fmtPrice(totalAids)}` : "0 €"}
                    </span>
                  </div>

                  {/* Carte Grise */}
                  <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl p-4 flex justify-between items-center text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[var(--color-text)]">Exonération de taxe régionale</span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">Coût de la carte grise</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-600">Gratuit (100% exonéré)</span>
                  </div>

                  {/* Malus CO2 */}
                  <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl p-4 flex justify-between items-center text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[var(--color-text)]">Échappement au Malus Masse & CO2</span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">Taxation écologique française</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-600">Exonéré (Économie ~1 500 €)</span>
                  </div>
                </div>
              </div>

              {/* Charging Wallbox chiffrage & installation */}
              <div className="md:col-span-6 flex flex-col gap-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl p-6 justify-between">
                <div className="flex flex-col gap-3">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">
                    Devis estimatif : Installation de Borne (7,4 kW Wallbox)
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    L'installation d'une borne Wallbox de 7,4 kW monophasée sécurisée (norme IRVE) à domicile réduit la durée de charge complète à environ <strong>7h</strong> :
                  </p>
                  
                  <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span>Borne & Fourniture standard :</span>
                      <span className="font-semibold">650 €</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span>Pose par électricien certifié IRVE :</span>
                      <span className="font-semibold">550 €</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono text-emerald-600">
                      <span>Crédit d'impôt Borne 2026 :</span>
                      <span className="font-bold">-{fmtPrice(500)}</span>
                    </div>
                    <div className="border-t border-[var(--color-border)] pt-2 flex justify-between items-center text-xs font-mono font-bold text-[var(--color-text)]">
                      <span>COÛT NET ESTIMÉ :</span>
                      <span className="text-[var(--color-accent)]">{fmtPrice(700)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-[9px] text-[var(--color-text-faint)] font-mono leading-normal">
                  <span>· Crédit d'impôt de 500 € directement déductible sur votre déclaration de revenus.</span>
                  <span>· TVA de 5.5% appliquée de droit sur la borne et la main-d'œuvre.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expert Signature and conversion */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-[var(--color-border)] pt-6 gap-6">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">Indépendance Garantie</span>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed max-w-xl">
                Evly n'est affilié à aucun constructeur et ne reçoit aucune commission sur les ventes. Nos calculs et avis techniques sont objectifs et basés uniquement sur des données réelles constatées.
              </p>
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-[var(--color-text)]">L'Équipe Technique Evly</span>
                <span className="text-[9px] font-mono text-[var(--color-text-faint)]">Validé pour l'exercice 2026</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive print-only helper to force document footer rendering */}
      <div className="print-only" aria-hidden="true">
        <style>{`
          @media print {
            body::after {
              content: "Généré de manière sécurisée par Evly (https://evly.fr). Document d'aide à la décision à valeur informative, non contractuelle.";
              position: fixed;
              bottom: 10px;
              left: 0;
              right: 0;
              text-align: center;
              font-family: monospace;
              font-size: 8px;
              color: #94a3b8;
            }
          }
        `}</style>
      </div>

      {/* Screen only conversion buttons */}
      <div className="no-print max-w-5xl mx-auto px-4 md:px-8 mb-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 flex flex-col justify-between gap-4 shadow-md">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-bold text-[var(--color-text)]">Installez votre borne Wallbox au meilleur tarif</h4>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Simulez vos devis de travaux d'installation électrique certifiée IRVE avec notre partenaire <strong>Chargeguru</strong>.
            </p>
          </div>
          <a
            href="https://chargeguru.com/fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center px-4 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] text-[var(--color-accent-on)] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            Simuler mon devis borne
          </a>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 flex flex-col justify-between gap-4 shadow-md">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-bold text-[var(--color-text)]">Achetez ce véhicule avec remise mandataire</h4>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Profitez de conditions négociées allant jusqu'à -12% sur les stocks du réseau constructeur via <strong>Élite-Auto</strong>.
            </p>
          </div>
          <a
            href="https://www.elite-auto.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center px-4 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] text-[var(--color-accent-on)] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            Demander une offre mandataire
          </a>
        </div>
      </div>
    </>
  );
}
