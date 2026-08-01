import type { Dispatch, SetStateAction } from "react";
import type { MatcherAnswers } from "./scoring";

interface Props {
  step: number;
  answers: MatcherAnswers;
  setAnswers: Dispatch<SetStateAction<MatcherAnswers>>;
}

/**
 * Contenu des questions 1 a 12 du matcher strategique. Le conteneur
 * (progress bar, animation, navigation) reste dans StrategicMatcher.tsx ;
 * ce composant ne rend que le corps de la question active.
 */
export default function MatcherQuestions({ step, answers, setAnswers }: Props) {
  return (
    <>
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
                  onClick={() => setAnswers(prev => ({ ...prev, role: opt.key, longTripDistance: opt.key === "primary" ? 600 : 150 }))}
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

      {/* STEP 5 : GRAND TRAJET DE L'ANNÉE */}
      {step === 5 && (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
              5. Quelle est la distance de votre plus long trajet de l'année ?
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
              Cette distance sert à estimer le nombre d'arrêts de recharge et le temps perdu sur la route lors de vos longs déplacements.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                Distance du trajet aller simple
              </span>
              <span className="font-mono text-lg font-semibold text-[var(--color-accent)]">
                {answers.longTripDistance.toLocaleString()} km
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={answers.longTripDistance}
              onChange={(e) => setAnswers(prev => ({ ...prev, longTripDistance: Number(e.target.value) }))}
              className="w-full h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
            />
            <div className="flex justify-between font-mono text-[9px] text-[var(--color-text-faint)] mt-2">
              <span>100 km</span>
              <span>550 km</span>
              <span>1 000 km</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6 : FOYER & COFFRE */}
      {step === 6 && (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
              6. Quelle est la composition de votre foyer ?
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

      {/* STEP 7 : BESOIN EN COFFRE */}
      {step === 7 && (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
              7. De quel volume de coffre avez-vous besoin ?
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
              Le volume du coffre est mesuré avec les sièges en position normale (non rabattus).
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {(
              [
                { key: "any", label: "Peu importe", desc: "Usage principalement urbain, trajets quotidiens sans chargement volumineux." },
                { key: "medium", label: "Moyen (≥ 350 L)", desc: "Pour les courses hebdomadaires, bagages de week-end, poussette compacte." },
                { key: "large", label: "Grand (≥ 450 L)", desc: "Pour les départs en vacances en famille, matériel encombrant, poussette classique." },
              ] as const
            ).map((opt) => {
              const active = answers.trunkNeed === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setAnswers(prev => ({ ...prev, trunkNeed: opt.key }))}
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

          <div className="mt-2">
            <button
              onClick={() => setAnswers(prev => ({ ...prev, trunkHatchbackMandatory: !prev.trunkHatchbackMandatory }))}
              className={`flex items-start text-left p-4 rounded-xl border transition-all w-full ${
                answers.trunkHatchbackMandatory
                  ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
              }`}
            >
              <div className="flex items-center justify-center w-5 h-5 rounded border border-[var(--color-border-strong)] mr-4 mt-0.5 bg-[var(--color-bg)] flex-shrink-0">
                {answers.trunkHatchbackMandatory && <div className="w-2.5 h-2.5 bg-[var(--color-accent)] rounded-sm" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="block font-medium text-sm text-[var(--color-text)]">
                    Hayon arrière impératif (5 portes / Crossover / Break)
                  </span>
                  <span className="font-mono text-[9px] text-[var(--color-text-faint)] border border-[var(--color-border)] px-1.5 py-0.5 rounded">
                    Touche H
                  </span>
                </div>
                <span className="block text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                  Exclure les berlines classiques à 4 portes avec une malle (ex: Tesla Model 3, BYD Seal, Hyundai Ioniq 6) qui compliquent le chargement d'objets encombrants (poussettes, vélos) ou d'animaux de compagnie.
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* STEP 8 : SILHOUETTE / CARROSSERIE */}
      {step === 8 && (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
              8. Quelle silhouette (carrosserie) préférez-vous ?
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

      {/* STEP 9 : LOGICIEL / ERGONOMIE */}
      {step === 9 && (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
              9. Quelle importance accordez-vous au logiciel embarqué ?
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

      {/* STEP 10 : BUDGET */}
      {step === 10 && (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
              10. Quel est votre budget maximal ?
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

      {/* STEP 11 : LEASING SOCIAL PRE-QUAL */}
      {step === 11 && (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
              11. Éligibilité au Leasing Social
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
                  J'habite à <strong className="text-[var(--color-text)]">plus de 10 km de mon lieu de travail</strong> (trajet aller) OU je parcours plus de <strong className="text-[var(--color-text)]">8 000 km par an</strong> dans le cadre de mon activité pro avec ma voiture personnelle.
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

      {/* STEP 12 : PRÉFÉRENCES ORIGINE */}
      {step === 12 && (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-[var(--color-text)]">
              12. Sensibilité écologique & Origine
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
    </>
  );
}
