import { useState, useEffect, useCallback, useMemo } from "react";
import type { Vehicle } from "@/data/schemas";
import { scoreVehicle, type MatcherAnswers, type MatchResult } from "./scoring";
import MatcherQuestions from "./MatcherQuestions";
import MatcherResults from "./MatcherResults";
import CardPaymentModal from "@/components/shared/CardPaymentModal";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

interface Props {
  vehicles: Vehicle[];
}

const PAYWALL_ENABLED = false; // Permet d'activer/désactiver le paywall facilement

export default function StrategicMatcher({ vehicles }: Props) {
  const [step, setStep] = useState<number>(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [showAllResults, setShowAllResults] = useState(false);
  const [expandedOtherSlug, setExpandedOtherSlug] = useState<string | null>(null);

  // Payment states
  const [isPaid, setIsPaid] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("paywall") === "true") {
        return searchParams.get("paid") === "true";
      }
    }
    return true; // paywall désactivé par défaut
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // Parse parameters on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const paywallParam = searchParams.get("paywall") === "true";
      setIsPaid(!paywallParam || searchParams.get("paid") === "true");

      const usage = searchParams.get("usage");
      if (usage) {
        setAnswers({
          usage: (searchParams.get("usage") as any) || "mixed",
          mileage: parseInt(searchParams.get("mileage") || "15000", 10),
          charging: (searchParams.get("charging") as any) || "home",
          role: (searchParams.get("role") as any) || "primary",
          longTripDistance: parseInt(searchParams.get("longTripDistance") || "600", 10),
          household: (searchParams.get("household") as any) || "family",
          trunkNeed: (searchParams.get("trunkNeed") as any) || "any",
          trunkHatchbackMandatory: searchParams.get("trunkHatchbackMandatory") === "true",
          bodyType: (searchParams.get("bodyType") as any) || "any",
          chargingSpeed: (searchParams.get("chargingSpeed") as any) || "any",
          budgetType: (searchParams.get("budgetType") as any) || "buy",
          budgetMax: parseInt(searchParams.get("budgetMax") || "40000", 10),
          leasingSocialRfr: searchParams.get("leasingSocialRfr") === "true",
          leasingSocialUsage: searchParams.get("leasingSocialUsage") === "true",
          preferEurope: searchParams.get("preferEurope") === "true",
          softwareImportance: (searchParams.get("softwareImportance") as any) || "any",
        });
        setStep(13); // Go directly to results slide (shifted to 13)
      }
    }
  }, []);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);
    setTimeout(() => {
      setPaymentLoading(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        const queryParams: Record<string, string> = {
          usage: answers.usage,
          mileage: answers.mileage.toString(),
          charging: answers.charging,
          role: answers.role,
          longTripDistance: answers.longTripDistance.toString(),
          household: answers.household,
          trunkNeed: answers.trunkNeed,
          trunkHatchbackMandatory: answers.trunkHatchbackMandatory ? "true" : "false",
          bodyType: answers.bodyType,
          chargingSpeed: answers.chargingSpeed,
          budgetType: answers.budgetType,
          budgetMax: answers.budgetMax.toString(),
          leasingSocialRfr: answers.leasingSocialRfr ? "true" : "false",
          leasingSocialUsage: answers.leasingSocialUsage ? "true" : "false",
          preferEurope: answers.preferEurope ? "true" : "false",
          softwareImportance: answers.softwareImportance,
          paid: "true"
        };
        if (typeof window !== "undefined") {
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.get("paywall") === "true") {
            queryParams.paywall = "true";
          }
        }
        const query = new URLSearchParams(queryParams).toString();
        window.location.href = `/recommandation/?${query}`;
      }, 1500);
    }, 2000);
  };

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
    longTripDistance: 600,
    household: "family",
    trunkNeed: "any",
    trunkHatchbackMandatory: false,
    bodyType: "any",
    chargingSpeed: "any",
    budgetType: "buy",
    budgetMax: 40000,
    leasingSocialRfr: false,
    leasingSocialUsage: false,
    preferEurope: true,
    softwareImportance: "any",
  });


  // Résultats calculés (maintenant à l'étape 13)
  const results = useMemo<MatchResult[]>(() => {
    if (step < 13) return [];
    return vehicles
      .map((v) => scoreVehicle(v, answers))
      .filter((r): r is MatchResult => r !== null)
      .sort((a, b) => b.score - a.score)
      .map((r) => ({
        ...r,
        score: Math.min(100, r.score),
      }));
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

      if (step > 0 && step <= 12) {
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
          if (e.key === "1") setAnswers((prev) => ({ ...prev, role: "primary", longTripDistance: 600 }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, role: "secondary", longTripDistance: 150 }));
        } else if (step === 6) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, household: "single_couple" }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, household: "family" }));
          if (e.key === "3") setAnswers((prev) => ({ ...prev, household: "large_family" }));
        } else if (step === 7) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, trunkNeed: "any" }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, trunkNeed: "medium" }));
          if (e.key === "3") setAnswers((prev) => ({ ...prev, trunkNeed: "large" }));
          if (e.key === "h" || e.key === "H") {
            setAnswers((prev) => ({ ...prev, trunkHatchbackMandatory: !prev.trunkHatchbackMandatory }));
          }
        } else if (step === 8) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, bodyType: "any" }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, bodyType: "hatchback_city" }));
          if (e.key === "3") setAnswers((prev) => ({ ...prev, bodyType: "sedan_break" }));
          if (e.key === "4") setAnswers((prev) => ({ ...prev, bodyType: "suv_crossover" }));
          if (e.key === "5") setAnswers((prev) => ({ ...prev, bodyType: "van_monospace" }));
        } else if (step === 9) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, softwareImportance: "any" }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, softwareImportance: "good_software" }));
        } else if (step === 11) {
          if (e.key === "1") setAnswers((prev) => ({ ...prev, leasingSocialRfr: !prev.leasingSocialRfr }));
          if (e.key === "2") setAnswers((prev) => ({ ...prev, leasingSocialUsage: !prev.leasingSocialUsage }));
        } else if (step === 12) {
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
      longTripDistance: 600,
      household: "family",
      trunkNeed: "any",
      trunkHatchbackMandatory: false,
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
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const paywallParam = searchParams.get("paywall") === "true";
      setIsPaid(!paywallParam);
      window.history.replaceState({}, document.title, window.location.pathname + (paywallParam ? "?paywall=true" : ""));
    } else {
      setIsPaid(true);
    }
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

      {/* ────────────────── QUESTIONNAIRE (ÉTAPES 1 à 12) ────────────────── */}
      {step > 0 && step <= 12 && (
        <div className="rounded-3xl p-6 md:p-8 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl relative min-h-[460px] flex flex-col justify-between transition-all duration-300">

          {/* Top Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-faint)]">Question {step} sur 12</span>
              <span className="font-mono text-xs font-semibold text-[var(--color-accent)]">{Math.round((step / 12) * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] transition-all duration-300"
                style={{ width: `${(step / 12) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* QUESTION SLIDE CONTAINER */}
          <div key={step} className={`my-8 flex-1 flex flex-col justify-center ${direction === "next" ? "animate-slide-right" : "animate-slide-left"}`}>
            <MatcherQuestions step={step} answers={answers} setAnswers={setAnswers} />
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
              {step === 12 ? "Découvrir mes résultats" : "Suivant"}
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ────────────────── ÉTAPE 13 : RÉSULTATS ────────────────── */}
      {step === 13 && (
        <MatcherResults
          vehicleCount={vehicles.length}
          top3={top3}
          others={others}
          isPaid={isPaid}
          answers={answers}
          showAllResults={showAllResults}
          setShowAllResults={setShowAllResults}
          expandedOtherSlug={expandedOtherSlug}
          setExpandedOtherSlug={setExpandedOtherSlug}
          restart={restart}
          compareUrl={compareUrl}
          setShowPaymentModal={setShowPaymentModal}
        />
      )}

      <CardPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        loading={paymentLoading}
        success={paymentSuccess}
        email={paymentEmail}
        onEmailChange={setPaymentEmail}
        cardNumber={cardNumber}
        onCardNumberChange={setCardNumber}
        cardExpiry={cardExpiry}
        onCardExpiryChange={setCardExpiry}
        cardCvc={cardCvc}
        onCardCvcChange={setCardCvc}
        onSubmit={handlePaymentSubmit}
        title="Débloquez votre diagnostic Premium"
        description="Découvrez les modèles #2 et #3 du podium, l'accès complet aux fiches comparatives et les 3 rapports TCO Premium inclus."
        successMessage="Votre transaction de 9,90 € a été traitée avec succès. Déblocage du podium en cours..."
      />
    </div>
  );
}
