import { useState, useEffect, useMemo, useRef } from "react";
import type { Vehicle } from "@/data/schemas";
import { readTrip, writeTrip } from "@/lib/trip";
import { DEFAULT_ANSWERS, paramsToAnswers, questionParams, rankVehicles, type MatcherAnswers } from "./scoring";
import MatcherQuestions, { STEPS } from "./MatcherQuestions";
import MatcherResults, { type VehicleImages } from "./MatcherResults";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./matcher.css";

interface Props {
  vehicles: Vehicle[];
  images: VehicleImages;
}

const RESULTS = STEPS.length;

/**
 * Matcher : six questions centrées sur le trajet, puis le classement.
 * Les réponses vivent dans l'URL une fois les résultats affichés (retour arrière depuis
 * une fiche, lien partageable) ; le trajet quotidien est partagé avec « Mon trajet ».
 */
export default function StrategicMatcher({ vehicles, images }: Props) {
  const [answers, setAnswers] = useState<MatcherAnswers>(DEFAULT_ANSWERS);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  /** Plus haute étape atteinte : les étapes déjà vues restent cliquables */
  const [reached, setReached] = useState(0);
  /** Question rouverte depuis les résultats : « Voir mes résultats » remplace « Suivant » */
  const [editing, setEditing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [restored, setRestored] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  /** Réponses d'un lien (question partagée) : tant qu'on n'y touche pas, « Mon trajet » reste le sien */
  const fromLink = useRef<string | null>(null);

  // Réponses de l'URL (retour arrière, lien partagé), sinon trajet de « Mon trajet »
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = paramsToAnswers(params);
    if (fromUrl) {
      fromLink.current = JSON.stringify(fromUrl);
      setAnswers(fromUrl);
      setShowAll(params.get("tous") === "1");
      setReached(RESULTS);
      setStep(RESULTS);
      setRestored(true);
      return;
    }
    const trip = readTrip();
    setAnswers((prev) => ({ ...prev, dailyKm: trip.dailyKm, homeCharging: trip.homeCharging }));
  }, []);

  const results = useMemo(() => rankVehicles(vehicles, answers), [vehicles, answers]);

  // Résultats affichés : URL à jour et trajet partagé avec le reste du site
  useEffect(() => {
    if (step !== RESULTS) return;
    const params = questionParams(answers);
    if (showAll) params.set("tous", "1");
    // On garde l'état d'historique du routeur (position de défilement des transitions de page)
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params}`);
  }, [step, answers, showAll]);

  useEffect(() => {
    if (step !== RESULTS || fromLink.current === JSON.stringify(answers)) return;
    const trip = readTrip();
    if (!trip.set || trip.dailyKm !== answers.dailyKm || trip.homeCharging !== answers.homeCharging) {
      writeTrip({ dailyKm: answers.dailyKm, homeCharging: answers.homeCharging });
    }
  }, [step, answers.dailyKm, answers.homeCharging]);

  // Retour arrière : les résultats n'existent qu'après hydratation, le routeur restaure donc
  // le défilement sur une page encore courte. On mémorise la position au départ vers une
  // autre page, puis on la rejoue une fois la liste rendue.
  useEffect(() => {
    if (step !== RESULTS) return;
    const remember = () => window.history.replaceState({ ...window.history.state, matcherY: window.scrollY }, "");
    document.addEventListener("astro:before-preparation", remember);
    return () => document.removeEventListener("astro:before-preparation", remember);
  }, [step]);

  useEffect(() => {
    if (!restored) return;
    const y = Number(window.history.state?.matcherY);
    if (y > 0) requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
  }, [restored]);

  const go = (target: number) => {
    setDirection(target >= step ? "next" : "prev");
    setStep(target);
    setReached((r) => Math.max(r, target));
    if (target === RESULTS) setEditing(false);
    // Garde le haut du questionnaire en vue (utile sur mobile)
    const top = topRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) topRef.current?.scrollIntoView({ block: "start" });
  };
  const next = () => go(editing ? RESULTS : step + 1);
  const edit = (target: number) => { setEditing(true); go(target); };
  const restart = () => {
    const trip = readTrip();
    setAnswers({ ...DEFAULT_ANSWERS, dailyKm: trip.dailyKm, homeCharging: trip.homeCharging });
    setShowAll(false);
    setEditing(false);
    setReached(0);
    window.history.replaceState(window.history.state, "", window.location.pathname);
    go(0);
  };

  // Entrée valide l'étape (hors boutons, qui gardent leur comportement)
  useEffect(() => {
    if (step === RESULTS) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.defaultPrevented) return;
      const el = document.activeElement;
      if (el && el !== document.body && !(el instanceof HTMLInputElement && el.type === "range")) return;
      e.preventDefault();
      next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (step === RESULTS) {
    return (
      <div ref={topRef} className="mq-root">
        <MatcherResults
          results={results}
          answers={answers}
          vehicleCount={vehicles.length}
          images={images}
          showAll={showAll}
          setShowAll={setShowAll}
          onEdit={edit}
          restart={restart}
          setAnswers={setAnswers}
        />
      </div>
    );
  }

  const last = step === RESULTS - 1;
  return (
    <div ref={topRef} className="mq-root">
      <div className="mq-shell">
        <nav className="mq-steps" aria-label="Étapes du questionnaire">
          <ol>
            {STEPS.map((label, i) => (
              <li key={label}>
                <button
                  type="button"
                  className="mq-step"
                  data-state={i === step ? "current" : i <= reached ? "done" : "todo"}
                  aria-current={i === step ? "step" : undefined}
                  disabled={i > reached}
                  onClick={() => go(i)}
                >
                  <span className="mq-step-num" aria-hidden="true">{i + 1}</span>
                  <span className="mq-step-label">{label}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="mq-step-mobile">Étape {step + 1} sur {STEPS.length} · {STEPS[step]}</p>
        </nav>

        <div key={step} className="mq-body" data-dir={direction}>
          <MatcherQuestions step={step} answers={answers} setAnswers={setAnswers} />
        </div>

        <div className="mq-foot">
          <button type="button" className="btn btn-secondary mq-back" onClick={() => go(step - 1)} disabled={step === 0}>
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden="true" />
            <span>Retour</span>
          </button>
          <p className="mq-count" aria-live="polite">
            <b>{results.length}</b> {results.length > 1 ? "modèles possibles" : "modèle possible"}
          </p>
          <button type="button" className="btn btn-primary" onClick={next}>
            {editing || last ? "Voir mes résultats" : "Suivant"}
            <ArrowRight size={17} strokeWidth={2.25} className="btn-arrow" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
