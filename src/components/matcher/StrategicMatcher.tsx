import { useState, useEffect, useCallback, useMemo } from "react";
import type { Vehicle } from "@/data/schemas";
import { scoreVehicle, type MatcherAnswers, type MatchResult } from "./scoring";
import { ArrowLeft, ArrowRight, RotateCcw, CheckCircle2, AlertTriangle, Sparkles, ChevronRight, HelpCircle } from "lucide-react";

interface Props {
  vehicles: Vehicle[];
}

export default function StrategicMatcher({ vehicles }: Props) {
  const [step, setStep] = useState<number>(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [showAllResults, setShowAllResults] = useState(false);
  const [expandedOtherSlug, setExpandedOtherSlug] = useState<string | null>(null);

  const goToNext = useCallback(() => {
    setDirection("next");
    setStep((prev) => prev + 1);
  }, []);

  const goToPrev = useCallback(() => {
    setDirection("prev");
    setStep((prev) => prev - 1);
  }, []);

  // Réponses du questionnaire
  const [answers, setAnswers] = useState<MatcherAnswers>({
    usage: "mixed",
    mileage: 15000,
    charging: "home",
    role: "primary",
    household: "family",
    bodyType: "any",
    chargingSpeed: "any",
    budgetType: "buy",
    budgetMax: 40000,
    leasingSocialRfr: false,
    leasingSocialUsage: false,
    preferEurope: true,
    softwareImportance: "any",
  });

  // Ajustement du budget max selon le type choisi
  useEffect(() => {
    setAnswers((prev) => ({
      ...prev,
      budgetMax: prev.budgetType === "buy" ? 40000 : 300,
    }));
  }, [answers.budgetType]);

  // Résultats calculés (maintenant à l'étape 10)
  const results = useMemo<MatchResult[]>(() => {
    if (step < 11) return [];
    return vehicles
      .map((v) => scoreVehicle(v, answers))
      .filter((r): r is MatchResult => r !== null)
      .sort((a, b) => b.score - a.score);
  }, [step, answers, vehicles]);

  const top3 = useMemo(() => results.slice(0, 3), [results]);
  const others = useMemo(() => results.slice(3), [results]);

  // Url de comparaison des 3 premiers
  const compareUrl = useMemo(() => {
    if (top3.length === 0) return "/comparer";
    const vParam = top3
      .map((r) => `${r.vehicle.slug}:${r.bestConfig.id}:100`)
      .join(",");
    return `/comparer?v=${vParam}`;
  }, [top3]);

  // Raccourcis clavier (Accessibilité AAA - 9 étapes)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignorer si on est sur un champ de saisie actif (ex: input)
      if (document.activeElement?.tagName === "INPUT") return;

      if (step > 0 && step <= 10) {
        if (e.key === "Backspace" || e.key === "ArrowLeft") {
          // Retour
          goToPrev();
        } else if (e.key === "Enter" || e.key === "ArrowRight") {
          // Suivant
          goToNext();
        }

        // Touches numériques pour la sélection
        if (step === 1) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, usage: "urban" }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, usage: "mixed" }));
          if (e.key === "3") setAnswers((prev) => ({ ...prev, usage: "highway" }));
        } else if (step === 2) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, charging: "home" }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, charging: "public_slow" }));
          if (e.key === "3") setAnswers((prev) => ({ ...prev, charging: "public_fast" }));
        } else if (step === 3) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, chargingSpeed: "any" }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, chargingSpeed: "under_30" }));
        } else if (step === 4) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, role: "primary" }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, role: "secondary" }));
        } else if (step === 5) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, household: "single_couple" }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, household: "family" }));
          if (e.key === "3") setAnswers((prev) => ({ ...prev, household: "large_family" }));
        } else if (step === 6) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, bodyType: "any" }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, bodyType: "hatchback_city" }));
          if (e.key === "3") setAnswers((prev) => ({ ...prev, bodyType: "sedan_break" }));
          if (e.key === "4") setAnswers((prev) => ({ ...prev, bodyType: "suv_crossover" }));
          if (e.key === "5") setAnswers((prev) => ({ ...prev, bodyType: "van_monospace" }));
        } else if (step === 7) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, softwareImportance: "any" }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, softwareImportance: "good_software" }));
        } else if (step === 9) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, leasingSocialRfr: !prev.leasingSocialRfr }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, leasingSocialUsage: !prev.leasingSocialUsage }));
        } else if (step === 10) {
          if (e.key === "1" || e.key === " ") {
            setAnswers((prev) => ({ ...prev, preferEurope: !prev.preferEurope }));
          }
        }
      } else if (step === 0 && (e.key === "Enter" || e.key === " ")) {
        goToNext();
      }
    },
    [step, goToNext, goToPrev]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const restart = () => {
    setAnswers({
      usage: "mixed",
      mileage: 15000,
      charging: "home",
      role: "primary",
      household: "family",
      bodyType: "any",
      chargingSpeed: "any",
      budgetType: "buy",
      budgetMax: 40000,
      leasingSocialRfr: false,
      leasingSocialUsage: false,
      preferEurope: true,
      softwareImportance: "any",
    });
    setShowAllResults(false);
    setExpandedOtherSlug(null);
    setDirection("prev");
    setStep(0);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4">
      <style>{`
        @keyframes softFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
            filter: blur(1.5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        .animate-slide-right {
          animation: softFadeIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-slide-left {
          animation: softFadeIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
      {step === 0 && (
        <div
          className="rounded-3xl p-8 md:p-12 relative overflow-hidden transition-all duration-500 border border-[var(--color-border)] shadow-2xl"
          style={{
            background: "radial-gradient(circle at top right, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent), var(--color-surface)",
          }}
        >
          <div className="absolute top-4 right-4 animate-pulse">
            <Sparkles size={28} className="text-[var(--color-accent)] opacity-80" />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-faint)]">Diagnostic d'Achat</span>
            <span className="h-px flex-1 bg-[var(--color-border)]"></span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono border border-[var(--color-accent-dim)] text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)] uppercase">Neutre</span>
          </div>

          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-[var(--color-text)]">
            Dix questions,<br />
            <span className="text-[var(--color-text-muted)]">votre véhicule électrique idéal.</span>
          </h2>
          <p className="mt-6 text-sm md:text-base text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
            Rechercher un VE via ses fiches techniques est complexe et biaisé par le marketing des marques. Evly analyse vos trajets, vos capacités de recharge, le rôle du véhicule et votre situation financière pour calculer un score de compatibilité transparent, sans commission.
          </p>

          <div className="mt-8 grid md:grid-cols-3 gap-5">
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
              <span className="text-[var(--color-accent)] text-xs font-mono font-semibold">01 · TCO & Aides CEE</span>
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                Calcul précis des mensualités incluant la Prime CEE 2026, les aides régionales et le Leasing Social.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
              <span className="text-[var(--color-accent)] text-xs font-mono font-semibold">02 · Climat & Autonomie</span>
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                Modélisation de la baisse d'autonomie en hiver (-5°C) selon la chimie de batterie.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
              <span className="text-[var(--color-accent)] text-xs font-mono font-semibold">03 · Filtre Souverain</span>
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                Choix éthique et aides CEE maximales via la détection de la production géographique européenne.
              </p>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between flex-wrap gap-4 pt-6 border-t border-[var(--color-border)]">
            <span className="text-xs font-mono text-[var(--color-text-faint)]">
              Navigable au clavier (1, 2, 3 pour choisir, Entrée pour continuer)
            </span>
            <button
              onClick={goToNext}
              className="btn-interactive btn-glow inline-flex items-center gap-2 px-6 py-3.5 bg-[var(--color-accent)] text-[var(--color-accent-on)] text-sm font-semibold tracking-tight rounded-xl shadow-lg transition-all"
            >
              Lancer le matcher
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ────────────────── QUESTIONNAIRE (ÉTAPES 1 à 10) ────────────────── */}
      {step > 0 && step <= 10 && (
        <div className="rounded-3xl p-6 md:p-8 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl relative min-h-[460px] flex flex-col justify-between transition-all duration-300">
          
          {/* Top Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-faint)]">Question {step} sur 10</span>
              <span className="font-mono text-xs font-semibold text-[var(--color-accent)]">{Math.round((step / 10) * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--color-accent)] transition-all duration-300"
                style={{ width: `${(step / 10) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* QUESTION SLIDE CONTAINER */}
          <div key={step} className={`my-8 flex-1 flex flex-col justify-center ${direction === "next" ? "animate-slide-right" : "animate-slide-left"}`}>
            
            {/* STEP 1 : TRACÉ PRINCIPAL & KILOMÉTRAGE */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
                    1. Quel est votre profil de trajet principal ?
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    Cela détermine votre besoin d'autonomie mixte ou d'autoroute ainsi que les besoins de charge rapide.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  {(
                    [
                      { key: "urban", label: "Urbain uniquement", desc: "Petits trajets quotidiens, courses, ville." },
                      { key: "mixed", label: "Mixte & Périurbain", desc: "Trajet travail quotidien, sorties le weekend." },
                      { key: "highway", label: "Grand Voyageur", desc: "Autoroute régulière, longs trajets fréquents." },
                    ] as const
                  ).map((opt) => {
                    const active = answers.usage === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAnswers(prev => ({ ...prev, usage: opt.key }))}
                        className={`text-left p-4 rounded-xl border transition-all relative ${
                          active ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
                        }`}
                      >
                        <span className="block font-medium text-sm text-[var(--color-text)]">{opt.label}</span>
                        <span className="block text-xs text-[var(--color-text-muted)] mt-1">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-slider pour kilométrage */}
                <div className="mt-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Kilométrage annuel estimé</span>
                    <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">{answers.mileage.toLocaleString()} km / an</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="50000"
                    step="2500"
                    value={answers.mileage}
                    onChange={(e) => setAnswers(prev => ({ ...prev, mileage: Number(e.target.value) }))}
                    className="w-full h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-[var(--color-text-faint)] mt-2">
                    <span>5 000 km</span>
                    <span>25 000 km</span>
                    <span>50 000 km</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 : RECHARGE */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
                    2. Comment envisagez-vous la recharge au quotidien ?
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    Un accès à la recharge lente (économique) à domicile détend le besoin d'une grosse batterie, tandis que le tout-public exige des charges efficaces.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  {(
                    [
                      { key: "home", label: "À domicile / travail", desc: "Prise domestique ou borne murale (Wallbox). Le plus économique." },
                      { key: "public_slow", label: "Bornes publiques lentes", desc: "Voirie de quartier, parkings publics. Charge en quelques heures." },
                      { key: "public_fast", label: "Bornes publiques rapides", desc: "Zones commerciales (type Allego, Atlante, Lidl). Hors autoroute." },
                    ] as const
                  ).map((opt) => {
                    const active = answers.charging === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAnswers(prev => ({ ...prev, charging: opt.key }))}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          active ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
                        }`}
                      >
                        <span className="block font-medium text-sm text-[var(--color-text)]">{opt.label}</span>
                        <span className="block text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3 : VITESSE DE RECHARGE DC (CCS) */}
            {step === 3 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
                    3. Quelle importance accordez-vous à la vitesse de recharge rapide (CCS) ?
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    Cela concerne les recharges lors des longs trajets (autoroute). Un temps sous les 30 minutes (10-80%) permet des pauses plus courtes.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {(
                    [
                      { key: "any", label: "Indifférent / Plus de 30 minutes accepté", desc: "Adapté si vous faites peu de longs trajets, ou si faire des pauses de 35 à 45 minutes ne vous dérange pas." },
                      { key: "under_30", label: "Recharge rapide indispensable (≤ 30 min)", desc: "Exclut ou pénalise les véhicules longs à charger sur autoroute pour maximiser le confort de voyage." },
                    ] as const
                  ).map((opt) => {
                    const active = answers.chargingSpeed === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAnswers(prev => ({ ...prev, chargingSpeed: opt.key }))}
                        className={`text-left p-5 rounded-xl border transition-all ${
                          active ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
                        }`}
                      >
                        <span className="block font-medium text-sm text-[var(--color-text)]">{opt.label}</span>
                        <span className="block text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4 : RÔLE DU VÉHICULE */}
            {step === 4 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
                    4. Quel sera le rôle principal de ce véhicule ?
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    Un véhicule principal nécessite du gabarit et du coffre pour les départs en vacances, tandis qu'un second véhicule favorise la compacité et l'agilité.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {(
                    [
                      { key: "primary", label: "Véhicule principal du foyer", desc: "Voyages, weekends, longs trajets et grand coffre requis. Exclut les petites citadines trop limitées pour partir chargé." },
                      { key: "secondary", label: "Véhicule secondaire / d'appoint", desc: "Trajets du quotidien, travail local, école, courses. La compacité et l'économie priment, pas besoin d'un coffre géant." },
                    ] as const
                  ).map((opt) => {
                    const active = answers.role === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAnswers(prev => ({ ...prev, role: opt.key }))}
                        className={`text-left p-5 rounded-xl border transition-all ${
                          active ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
                        }`}
                      >
                        <span className="block font-medium text-sm text-[var(--color-text)]">{opt.label}</span>
                        <span className="block text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 5 : FOYER & COFFRE */}
            {step === 5 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
                    5. Quelle est la composition de votre foyer ?
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    Le volume de coffre requis en dépend pour garantir le confort de tous les passagers.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  {(
                    [
                      { key: "single_couple", label: "Célibataire / Couple", desc: "Priorité à la compacité et à l'agilité, coffre secondaire." },
                      { key: "family", label: "Famille (1-2 enfants)", desc: "Besoin de place à l'arrière et de coffre (bagages, poussette, courses)." },
                      { key: "large_family", label: "Famille nombreuse / Loisirs", desc: "Gros volumes, modularité importante, coffre > 500 Litres." },
                    ] as const
                  ).map((opt) => {
                    const active = answers.household === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAnswers(prev => ({ ...prev, household: opt.key }))}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          active ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
                        }`}
                      >
                        <span className="block font-medium text-sm text-[var(--color-text)]">{opt.label}</span>
                        <span className="block text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 6 : SILHOUETTE / CARROSSERIE */}
            {step === 6 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
                    6. Quelle silhouette (carrosserie) préférez-vous ?
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    Sélectionnez votre format idéal. Les modèles ne correspondant pas seront pénalisés mais restent visibles s'ils conviennent à votre budget.
                  </p>
                </div>

                <div className="grid md:grid-cols-5 gap-2">
                  {(
                    [
                      { key: "any", label: "Indifférent", desc: "Tous formats" },
                      { key: "hatchback_city", label: "Citadine / Compacte", desc: "Petite et agile" },
                      { key: "sedan_break", label: "Berline / Break", desc: "Profil bas et routier" },
                      { key: "suv_crossover", label: "SUV / Crossover", desc: "Hauteur et espace" },
                      { key: "van_monospace", label: "Van / Monospace", desc: "Volume maximal" },
                    ] as const
                  ).map((opt) => {
                    const active = answers.bodyType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAnswers(prev => ({ ...prev, bodyType: opt.key }))}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between min-h-[100px] ${
                          active ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
                        }`}
                      >
                        <span className="block font-medium text-xs text-[var(--color-text)]">{opt.label}</span>
                        <span className="block text-[10px] text-[var(--color-text-muted)] mt-1 leading-normal">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 7 : LOGICIEL / ERGONOMIE */}
            {step === 7 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
                    7. Quelle importance accordez-vous au logiciel embarqué ?
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    Cela concerne la fluidité de l'écran central, la réactivité du système, l'ergonomie des menus et la fiabilité du planificateur d'itinéraire.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {(
                    [
                      { key: "any", label: "Indifférent / Système basique accepté", desc: "Vous utilisez principalement CarPlay ou Android Auto, ou l'ergonomie logicielle du constructeur n'est pas un critère déterminant pour vous." },
                      { key: "good_software", label: "Logiciel fluide, réactif et moderne exigé", desc: "Vous recherchez un système intuitif avec un excellent planificateur d'itinéraire. Exclut ou pénalise fortement les systèmes lents ou instables." },
                    ] as const
                  ).map((opt) => {
                    const active = answers.softwareImportance === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAnswers(prev => ({ ...prev, softwareImportance: opt.key }))}
                        className={`text-left p-5 rounded-xl border transition-all ${
                          active ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
                        }`}
                      >
                        <span className="block font-medium text-sm text-[var(--color-text)]">{opt.label}</span>
                        <span className="block text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 8 : BUDGET */}
            {step === 8 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
                    8. Quel est votre budget maximal ?
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    Les aides de l'État et remises seront déduites des résultats pour évaluer le coût réel d'accès.
                  </p>
                </div>

                {/* Switch Achat / LLD */}
                <div className="flex justify-center">
                  <div className="inline-flex p-0.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
                    <button
                      onClick={() => setAnswers(prev => ({ ...prev, budgetType: "buy" }))}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                        answers.budgetType === "buy" ? "bg-[var(--color-surface-elevated)] text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-muted)]"
                      }`}
                    >
                      Achat direct (Prix net)
                    </button>
                    <button
                      onClick={() => setAnswers(prev => ({ ...prev, budgetType: "lease" }))}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                        answers.budgetType === "lease" ? "bg-[var(--color-surface-elevated)] text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-muted)]"
                      }`}
                    >
                      Mensualité LLD / LOA
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                      {answers.budgetType === "buy" ? "Budget d'achat maximal" : "Loyer mensuel maximal"}
                    </span>
                    <span className="font-mono text-lg font-semibold text-[var(--color-accent)]">
                      {answers.budgetMax.toLocaleString()} {answers.budgetType === "buy" ? "€" : "€ / mois"}
                    </span>
                  </div>

                  {answers.budgetType === "buy" ? (
                    <input
                      type="range"
                      min="15000"
                      max="100000"
                      step="2500"
                      value={answers.budgetMax}
                      onChange={(e) => setAnswers(prev => ({ ...prev, budgetMax: Number(e.target.value) }))}
                      className="w-full h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
                    />
                  ) : (
                    <input
                      type="range"
                      min="100"
                      max="1000"
                      step="25"
                      value={answers.budgetMax}
                      onChange={(e) => setAnswers(prev => ({ ...prev, budgetMax: Number(e.target.value) }))}
                      className="w-full h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
                    />
                  )}

                  <div className="flex justify-between font-mono text-[9px] text-[var(--color-text-faint)] mt-2">
                    <span>{answers.budgetType === "buy" ? "15 000 €" : "100 €/m"}</span>
                    <span>{answers.budgetType === "buy" ? "57 500 €" : "550 €/m"}</span>
                    <span>{answers.budgetType === "buy" ? "100 000 €+" : "1 000 €/m+"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 9 : LEASING SOCIAL PRE-QUAL */}
            {step === 9 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
                    9. Éligibilité au Leasing Social
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    Le Leasing Social (mensualité <strong className="text-[var(--color-text)]">à partir de 95 € / mois</strong> sans apport) est soumis à deux conditions cumulatives d'éligibilité. Cochez si vous remplissez ces critères :
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setAnswers(prev => ({ ...prev, leasingSocialRfr: !prev.leasingSocialRfr }))}
                    className={`flex items-start text-left p-4 rounded-xl border transition-all ${
                      answers.leasingSocialRfr ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
                    }`}
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded border border-[var(--color-border-strong)] mr-4 mt-0.5 bg-[var(--color-bg)]">
                      {answers.leasingSocialRfr && <div className="w-2.5 h-2.5 bg-[var(--color-accent)] rounded-sm" />}
                    </div>
                    <div className="flex-1">
                      <span className="block font-medium text-sm text-[var(--color-text)]">
                        Condition de revenu (RFR)
                      </span>
                      <span className="block text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                        Mon revenu fiscal de référence (RFR) par part fiscale est <strong className="text-[var(--color-text)]">inférieur ou égal à 16 300 €</strong>.
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => setAnswers(prev => ({ ...prev, leasingSocialUsage: !prev.leasingSocialUsage }))}
                    className={`flex items-start text-left p-4 rounded-xl border transition-all ${
                      answers.leasingSocialUsage ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
                    }`}
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded border border-[var(--color-border-strong)] mr-4 mt-0.5 bg-[var(--color-bg)]">
                      {answers.leasingSocialUsage && <div className="w-2.5 h-2.5 bg-[var(--color-accent)] rounded-sm" />}
                    </div>
                    <div className="flex-1">
                      <span className="block font-medium text-sm text-[var(--color-text)]">
                        Condition de distance de trajet ou d'usage pro
                      </span>
                      <span className="block text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                        J'habite à <strong className="text-[var(--color-text)]">plus de 15 km de mon lieu de travail</strong> (trajet aller) OU je parcours plus de <strong className="text-[var(--color-text)]">8 000 km par an</strong> dans le cadre de mon activité pro avec ma voiture personnelle.
                      </span>
                    </div>
                  </button>
                </div>

                {answers.leasingSocialRfr && answers.leasingSocialUsage ? (
                  <div className="p-3 text-xs font-mono rounded-lg border border-[var(--color-accent-dim)] bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)] text-[var(--color-accent)] text-center animate-pulse">
                    ✓ Profil qualifié pour le Leasing Social à ~100 €/mois. Des aides CEE d'affichage seront attribuées aux modèles éligibles.
                  </div>
                ) : (
                  <div className="p-3 text-xs font-mono rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-faint)] text-center">
                    Cochez les deux cases pour activer la détection du Leasing Social.
                  </div>
                )}
              </div>
            )}

            {/* STEP 10 : PRÉFÉRENCES ORIGINE */}
            {step === 10 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
                    10. Sensibilité écologique & Origine
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    Le nouveau dispositif français exclut de la Prime CEE les véhicules produits dans des pays à mix énergétique carboné (ex: Chine, Japon).
                  </p>
                </div>

                <button
                  onClick={() => setAnswers(prev => ({ ...prev, preferEurope: !prev.preferEurope }))}
                  className={`flex items-start text-left p-6 rounded-2xl border transition-all ${
                    answers.preferEurope ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
                  }`}
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border border-[var(--color-border-strong)] mr-5 mt-0.5 bg-[var(--color-bg)]">
                    {answers.preferEurope && <div className="w-3 h-3 bg-[var(--color-accent)] rounded-full animate-scale" />}
                  </div>
                  <div className="flex-1">
                    <span className="block font-medium text-base text-[var(--color-text)]">
                      Favoriser l'assemblage et la fabrication européenne
                    </span>
                    <span className="block text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">
                      Cocher cette option accordera une importance dans le score aux véhicules produits en Europe (France, Allemagne, Espagne, etc.). Cela permet de s'assurer d'obtenir un véhicule éligible à la Prime CEE et ayant une empreinte carbone de fabrication réduite.
                    </span>
                  </div>
                </button>
              </div>
            )}

          </div>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-[var(--color-border)] mt-auto">
            <button
              onClick={goToPrev}
              className="flex items-center gap-1.5 px-4 py-2 border border-[var(--color-border-strong)] rounded-lg text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <ArrowLeft size={13} />
              Retour
            </button>

            <button
              onClick={goToNext}
              className="btn-interactive inline-flex items-center gap-1.5 px-5 py-2.5 bg-[var(--color-accent)] text-[var(--color-accent-on)] text-xs font-semibold rounded-lg shadow transition-colors"
            >
              {step === 10 ? "Découvrir mes résultats" : "Suivant"}
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ────────────────── ÉTAPE 11 : RÉSULTATS ────────────────── */}
      {step === 11 && (
        <div className="flex flex-col gap-8 animate-fade-in">
          
          {/* Header & Meta */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-[var(--color-accent-dim)] text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)] uppercase">Diagnostic Terminé</span>
                <span className="text-[10px] font-mono text-[var(--color-text-faint)]">Calculé en local · Sans tracking</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-[var(--color-text)]">
                Votre sélection sur-mesure.
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Nous avons scanné {vehicles.length} véhicules électriques et configuré la variante idéale par rapport à votre profil.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={restart}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border)] rounded-lg text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all"
              >
                <RotateCcw size={13} />
                Recommencer
              </button>

              {top3.length >= 2 && (
                <a
                  href={compareUrl}
                  className="btn-glow inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-accent-on)] text-xs font-semibold rounded-lg shadow-md hover:bg-[var(--color-accent-dim)] transition-colors"
                >
                  Comparer ce Top {top3.length} en split-screen →
                </a>
              )}
            </div>
          </div>

          {/* Cas spécial : aucun véhicule ne correspond */}
          {top3.length === 0 ? (
            <div className="rounded-2xl p-8 border border-[var(--color-warning)] bg-[color-mix(in_srgb,var(--color-warning)_4%,transparent)] text-center flex flex-col items-center gap-3">
              <AlertTriangle size={36} className="text-[var(--color-warning)]" />
              <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">Aucun véhicule ne correspond à vos critères et à votre budget.</h3>
              <p className="text-xs text-[var(--color-text-muted)] max-w-md">
                Vos critères de budget sont peut-être trop stricts face aux prix du marché, ou le gabarit recherché est incompatible avec le rôle demandé (par exemple, un rôle de véhicule principal pour une famille exclut les citadines et les quadricycles).
              </p>
              <button
                onClick={restart}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-text)] text-[var(--color-bg)] text-xs font-semibold rounded-lg transition-all"
              >
                Ajuster mes réponses
              </button>
            </div>
          ) : (
            
            // GRID DU TOP 3
            <div className="grid gap-6">
              {top3.map((res, index) => {
                const isLS = answers.leasingSocialRfr && answers.leasingSocialUsage && res.vehicle.leasingSocialEligible;
                const monthlyPrice = isLS 
                  ? (res.vehicle.leasingSocial_EUR_per_month ?? 100) 
                  : (res.bestConfig.monthlyLease_EUR ?? Math.round((res.bestConfig.price_EUR ?? 0) * 0.009));

                return (
                  <div
                    key={res.vehicle.slug}
                    className="rounded-2xl p-6 border relative overflow-hidden transition-all duration-300 flex flex-col md:flex-row gap-6 shadow-md hover:shadow-xl bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                  >
                    {/* Badge Podiums */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold bg-[var(--color-bg-subtle)] border border-[var(--color-border-strong)] text-[var(--color-text)]">
                        #{index + 1}
                      </span>
                      {isLS && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono border border-[var(--color-accent-dim)] text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] font-semibold uppercase animate-pulse">
                          Leasing Social
                        </span>
                      )}
                    </div>

                    {/* Gauche : Image et Score */}
                    <div className="flex flex-col items-center justify-center md:w-1/4 pt-6 md:pt-0">
                      {/* Radial score ring */}
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-[var(--color-border)]"
                            strokeWidth="2.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-[var(--color-accent)]"
                            strokeDasharray={`${res.score}, 100`}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="font-mono text-base font-bold leading-none text-[var(--color-text)]">{res.score}%</span>
                          <span className="text-[8px] font-mono uppercase tracking-wider text-[var(--color-text-faint)]">Match</span>
                        </div>
                      </div>

                      {/* Photo / Silhouette */}
                      <div className="w-32 h-16 flex items-center justify-center mt-3">
                        {res.vehicle.imageUrl ? (
                          <img
                            src={res.vehicle.imageUrl}
                            alt={`${res.vehicle.brand} ${res.vehicle.model}`}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-mono text-[var(--color-text-faint)]">Visual absent</span>
                        )}
                      </div>
                    </div>

                    {/* Milieu : Infos et Raisons */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-[var(--color-text-faint)] uppercase tracking-wide">
                          {res.vehicle.brand}
                        </span>
                        <h3 className="font-display text-2xl font-bold leading-tight text-[var(--color-text)]">
                          {res.vehicle.model}
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-medium mt-0.5">
                          Variante conseillée : <strong className="text-[var(--color-text)]">{res.bestConfig.label}</strong> ({res.vehicle.chemistry} · {res.vehicle.usableCapacity_kWh} kWh)
                        </p>
                      </div>

                      {/* Bullet points d'adéquation */}
                      <div className="mt-4 flex flex-col gap-2">
                        {res.reasons.map((r, i) => (
                          <div key={i} className="flex gap-2 items-start text-xs leading-relaxed text-[var(--color-text-muted)]">
                            <CheckCircle2 size={14} className="text-[var(--color-accent)] mt-0.5 flex-shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))}
                        {res.warnings.map((w, i) => (
                          <div key={i} className="flex gap-2 items-start text-xs leading-relaxed text-[var(--color-warning)]">
                            <AlertTriangle size={14} className="text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Droite : Prix et Action */}
                    <div className="md:w-1/4 border-t md:border-t-0 md:border-l border-[var(--color-border)] pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                      <div className="flex flex-col gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                          {answers.budgetType === "buy" ? "Tarif conseillé" : "Mensualité conseillée"}
                        </span>
                        {answers.budgetType === "buy" ? (
                          (() => {
                            const isEU = ["France", "Allemagne", "Espagne", "Italie", "Suède", "Royaume-Uni", "Portugal", "Pologne", "Tchéquie", "Rép. Tchèque", "Slovaquie", "Hongrie", "Belgique", "Autriche", "Roumanie"].includes(res.vehicle.productionCountry);
                            const rawPrice = res.bestConfig.price_EUR ?? 0;
                            const isEligibleCEE = isEU && rawPrice <= 47000;
                            const totalCeeAid = isEligibleCEE ? (res.vehicle.availableAids || []).reduce((sum, a) => sum + a.amount_EUR, 0) : 0;
                            const netPrice = rawPrice - totalCeeAid;
                            return (
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-display text-2xl font-bold text-[var(--color-text)]">
                                    {netPrice.toLocaleString()} €
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${isEligibleCEE ? "bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-[var(--color-accent)] border border-[color-mix(in_srgb,var(--color-accent)_20%,transparent)]" : "bg-[var(--color-bg-subtle)] text-[var(--color-text-faint)] border border-[var(--color-border)]"}`}>
                                    {isEligibleCEE ? "Aide CEE incluse" : "Hors aides"}
                                  </span>
                                </div>
                                {isEligibleCEE ? (
                                  <div className="text-[10px] text-[var(--color-text-muted)] leading-tight">
                                    Prix catalogue : <span className="line-through">{rawPrice.toLocaleString()} €</span>
                                    <span className="block text-[9px] text-[var(--color-accent)] font-medium mt-1 leading-normal">
                                      Inclut la Prime CEE de {totalCeeAid.toLocaleString()} € (socle de 6 500 € + 2 000 € de majoration batterie européenne).
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-[var(--color-text-muted)] leading-tight">
                                    Prix catalogue : <span>{rawPrice.toLocaleString()} €</span>
                                    <span className="block text-[9px] text-[var(--color-warning)] font-medium mt-1 leading-normal">
                                      Non éligible à la Prime CEE (produit en {res.vehicle.productionCountry}).
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-baseline gap-1">
                              <span className="font-display text-2xl font-bold text-[var(--color-text)]">
                                {monthlyPrice} €
                              </span>
                              <span className="text-xs font-mono text-[var(--color-text-faint)]">/ mois</span>
                            </div>
                            {isLS ? (
                              <span className="block text-[9px] text-[var(--color-accent)] font-semibold leading-normal">
                                (Tarif exceptionnel Leasing Social appliqué)
                              </span>
                            ) : res.vehicle.leasingSocialEligible ? (
                              <span className="block text-[9px] text-[var(--color-text-muted)] leading-normal">
                                Éligible au Leasing Social à {res.vehicle.leasingSocial_EUR_per_month} €/mois pour les profils qualifiés.
                              </span>
                            ) : (
                              <span className="block text-[9px] text-[var(--color-text-faint)] leading-normal">
                                LLD classique (Non éligible au Leasing Social)
                              </span>
                            )}
                          </div>
                        )}
                        <span className="text-[9px] font-mono text-[var(--color-text-faint)] leading-normal mt-1 border-t border-[var(--color-border)] pt-1">
                          *Montants indicatifs susceptibles d'évoluer selon les revenus du foyer, les signataires CEE et l'éligibilité réelle du véhicule.
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        <a
                          href={`/vehicules/${res.vehicle.slug}`}
                          className="btn-interactive inline-flex items-center justify-between px-3 py-2 border border-[var(--color-border-strong)] rounded-lg text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                        >
                          Fiche technique
                          <ChevronRight size={13} />
                        </a>
                        <a
                          href={`/comparer?v=${res.vehicle.slug}:${res.bestConfig.id}:100`}
                          className="btn-interactive inline-flex items-center justify-between px-3 py-2 border border-[var(--color-accent-dim)] rounded-lg text-xs font-semibold text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] transition-colors"
                        >
                          Ajouter au comparateur
                          <ChevronRight size={13} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ────────────────── AUTRES CHOIX COMPATIBLES (ACCORDION) ────────────────── */}
          {others.length > 0 && (
            <div className="mt-6 border border-[var(--color-border)] rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowAllResults(!showAllResults)}
                className="w-full cursor-pointer p-4 flex items-center justify-between text-xs font-mono uppercase tracking-[0.1em] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all"
              >
                <span>Autres alternatives compatibles ({others.length})</span>
                <span className="text-[var(--color-text-faint)] transition-transform duration-300" style={{ transform: showAllResults ? "rotate(180deg)" : "rotate(0deg)" }}>
                  ↓
                </span>
              </button>
              
              {showAllResults && (
                <div className="divide-y divide-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                  {others.map((res) => {
                    const isExpanded = expandedOtherSlug === res.vehicle.slug;
                    const isLS = answers.leasingSocialRfr && answers.leasingSocialUsage && res.vehicle.leasingSocialEligible;
                    const monthlyPrice = isLS 
                      ? (res.vehicle.leasingSocial_EUR_per_month ?? 100) 
                      : (res.bestConfig.monthlyLease_EUR ?? Math.round((res.bestConfig.price_EUR ?? 0) * 0.009));

                    const isEU = ["France", "Allemagne", "Espagne", "Italie", "Suède", "Royaume-Uni", "Portugal", "Pologne", "Tchéquie", "Rép. Tchèque", "Slovaquie", "Hongrie", "Belgique", "Autriche", "Roumanie"].includes(res.vehicle.productionCountry);
                    const rawPrice = res.bestConfig.price_EUR ?? 0;
                    const isEligibleCEE = isEU && rawPrice <= 47000;
                    const totalCeeAid = isEligibleCEE ? (res.vehicle.availableAids || []).reduce((sum, a) => sum + a.amount_EUR, 0) : 0;
                    const netPrice = rawPrice - totalCeeAid;

                    return (
                      <div key={res.vehicle.slug} className="flex flex-col">
                        <button
                          onClick={() => setExpandedOtherSlug(isExpanded ? null : res.vehicle.slug)}
                          className="w-full text-left p-4 flex items-center justify-between text-xs gap-3 hover:bg-[var(--color-surface)] cursor-pointer transition-all focus:outline-none"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[var(--color-text)]">
                              {res.vehicle.brand} {res.vehicle.model}
                            </span>
                            <span className="text-[var(--color-text-faint)] text-[10px]">
                              ({res.bestConfig.label})
                            </span>
                            {isLS && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono border border-[var(--color-accent-dim)] text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)] font-semibold uppercase">
                                LS
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="font-mono text-[var(--color-text-muted)] text-[11px]">
                              {res.score}% match
                            </span>
                            <span className="font-mono font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                              {answers.budgetType === "buy" ? (
                                <>
                                  <span>{netPrice.toLocaleString()} €</span>
                                  {isEligibleCEE && (
                                    <span className="px-1 py-0.2 rounded text-[8px] font-semibold bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] text-[var(--color-accent)] border border-[color-mix(in_srgb,var(--color-accent)_15%,transparent)]">
                                      Aide CEE
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span>{monthlyPrice} €/m</span>
                                  {isLS && (
                                    <span className="px-1 py-0.2 rounded text-[8px] font-semibold bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] text-[var(--color-accent)] border border-[color-mix(in_srgb,var(--color-accent)_15%,transparent)]">
                                      Leasing Social
                                    </span>
                                  )}
                                </>
                              )}
                            </span>
                            <span 
                              className="text-[var(--color-text-faint)] transition-transform duration-300 font-mono text-base"
                              style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                            >
                              ↓
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-5 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)] animate-fade-in flex flex-col gap-4">
                            {/* Détail financier / Aide d'État */}
                            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex flex-col gap-1.5 shadow-sm">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] font-bold">
                                Détail du tarif conseillé
                              </span>
                              {answers.budgetType === "buy" ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[var(--color-text)] font-medium">
                                      Prix Net Evly : <strong className="text-[var(--color-text)] text-sm">{netPrice.toLocaleString()} €</strong>
                                    </span>
                                    {isEligibleCEE ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] text-[var(--color-accent)] border border-[color-mix(in_srgb,var(--color-accent)_15%,transparent)]">
                                        Aide CEE de {totalCeeAid.toLocaleString()} € déduite
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--color-border)] text-[var(--color-text-muted)]">
                                        Non éligible à la Prime CEE
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[var(--color-text-muted)] font-mono text-[11px]">
                                    Prix catalogue constructeur : {isEligibleCEE ? <span className="line-through">{rawPrice.toLocaleString()} €</span> : <span>{rawPrice.toLocaleString()} €</span>}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[var(--color-text)] font-medium">
                                      Mensualité estimée : <strong className="text-[var(--color-text)] text-sm">{monthlyPrice} € / mois</strong>
                                    </span>
                                    {isLS ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] text-[var(--color-accent)] border border-[color-mix(in_srgb,var(--color-accent)_15%,transparent)]">
                                        Leasing Social appliqué
                                      </span>
                                    ) : res.vehicle.leasingSocialEligible ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--color-border)] text-[var(--color-text-muted)]">
                                        Éligible Leasing Social (profils RFR qualifiés)
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--color-border)] text-[var(--color-text-faint)]">
                                        LLD standard
                                      </span>
                                    )}
                                  </div>
                                  {res.vehicle.leasingSocialEligible && (
                                    <span className="text-[var(--color-text-muted)] font-mono text-[11px]">
                                      LLD standard : ~{Math.round((res.bestConfig.price_EUR ?? 0) * 0.009)} €/mois
                                    </span>
                                  )}
                                </div>
                              )}
                              {answers.budgetType === "buy" && (
                                <p className="text-[9px] text-[var(--color-text-faint)] leading-normal mt-1 border-t border-[var(--color-border)] pt-1.5">
                                  {isEligibleCEE 
                                    ? `*Montant indicatif d'aide CEE de ${totalCeeAid.toLocaleString()} € (socle de 6 500 € + 2 000 € de majoration batterie européenne) applicable selon l'origine de fabrication du véhicule (produit en ${res.vehicle.productionCountry}).`
                                    : `*Non éligible à la Prime CEE car le véhicule est assemblé hors d'Europe (${res.vehicle.productionCountry}) ou dépasse le plafond de 47 000 €.`
                                  }
                                </p>
                              )}
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                              {/* Colonne 1 : Adéquation Matcher */}
                              <div className="flex flex-col gap-3">
                                <h4 className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-faint)]">
                                  Adéquation Profil
                                </h4>
                                <div className="flex flex-col gap-2">
                                  {res.reasons.map((r, i) => (
                                    <div key={i} className="flex gap-2 items-start text-xs leading-relaxed text-[var(--color-text-muted)]">
                                      <CheckCircle2 size={13} className="text-[var(--color-accent)] mt-0.5 flex-shrink-0" />
                                      <span>{r}</span>
                                    </div>
                                  ))}
                                  {res.warnings.map((w, i) => (
                                    <div key={i} className="flex gap-2 items-start text-xs leading-relaxed text-[var(--color-warning)]">
                                      <AlertTriangle size={13} className="text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
                                      <span>{w}</span>
                                    </div>
                                  ))}
                                  {res.reasons.length === 0 && res.warnings.length === 0 && (
                                    <span className="text-xs text-[var(--color-text-faint)] italic">
                                      Aucune remarque spécifique.
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Colonne 2 : Verdict Evly (Les plus / Les moins) */}
                              <div className="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-[var(--color-border)] pt-4 md:pt-0 md:pl-6">
                                <h4 className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-faint)]">
                                  Verdict de la Rédaction
                                </h4>
                                <div className="flex flex-col gap-3">
                                  {/* Les plus */}
                                  {res.vehicle.verdict?.strengths && res.vehicle.verdict.strengths.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-[10px] font-semibold text-[var(--color-accent)] uppercase">Les points forts :</span>
                                      {res.vehicle.verdict.strengths.map((str, idx) => (
                                        <div key={idx} className="flex gap-2 items-start text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                                          <span className="text-[var(--color-accent)] font-bold flex-shrink-0">+</span>
                                          <span>{str}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Les moins */}
                                  {res.vehicle.verdict?.weaknesses && res.vehicle.verdict.weaknesses.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-[10px] font-semibold text-[var(--color-warning)] uppercase">Les points faibles :</span>
                                      {res.vehicle.verdict.weaknesses.map((weak, idx) => (
                                        <div key={idx} className="flex gap-2 items-start text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                                          <span className="text-[var(--color-warning)] font-bold flex-shrink-0">-</span>
                                          <span>{weak}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {(!res.vehicle.verdict?.strengths || res.vehicle.verdict.strengths.length === 0) &&
                                   (!res.vehicle.verdict?.weaknesses || res.vehicle.verdict.weaknesses.length === 0) && (
                                    <span className="text-xs text-[var(--color-text-faint)] italic">
                                      Aucun point fort/faible répertorié.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Barre de détails technique et Actions */}
                            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4 flex-wrap gap-3">
                              <span className="text-[10px] font-mono text-[var(--color-text-faint)]">
                                {res.vehicle.chemistry} · {res.vehicle.usableCapacity_kWh} kWh · {res.bestConfig.realRange?.mixed_km ?? res.vehicle.realRange.mixed_km} km réels
                              </span>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`/vehicules/${res.vehicle.slug}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-[var(--color-border-strong)] rounded text-[10px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                                >
                                  Fiche technique
                                </a>
                                <a
                                  href={`/comparer?v=${res.vehicle.slug}:${res.bestConfig.id}:100`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-[var(--color-accent-dim)] rounded text-[10px] font-semibold text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] transition-colors"
                                >
                                  Ajouter au comparateur
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
