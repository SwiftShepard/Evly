import type { Dispatch, SetStateAction } from "react";
import { RotateCcw, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { calculateCeeAid } from "@/lib/cee";
import { getLocalVehicleImageUrl } from "@/lib/vehicleImages";
import type { MatcherAnswers, MatchResult } from "./scoring";

function VehicleFallbackSvg({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} opacity-50`}
      viewBox="0 0 290 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cable */}
      <path
        d="M24 34 C30 78 50 82 68 82"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Plug body */}
      <rect x="8" y="22" width="16" height="24" rx="3" fill="currentColor" />
      {/* Lightning bolt */}
      <path d="M21 23 L17 32 H21 L12 45 L16 36 H12 Z" fill="white" stroke="none" />

      {/* Car body */}
      <path
        d="
          M 68 82
          L 68 55
          C 72 26 90 8 112 4
          L 190 4
          C 214 4 236 22 248 44
          L 258 44
          C 264 44 268 54 268 64
          L 268 82
          C 254 82 240 66 214 66
          C 188 66 174 82 160 82
          L 144 82
          C 130 82 116 66 94 66
          C 72 66 68 82 68 82
          Z
        "
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Rear wheel */}
      <circle cx="94"  cy="97" r="17" stroke="currentColor" strokeWidth="6" />
      {/* Front wheel */}
      <circle cx="214" cy="97" r="17" stroke="currentColor" strokeWidth="6" />
    </svg>
  );
}

interface Props {
  vehicleCount: number;
  top3: MatchResult[];
  others: MatchResult[];
  isPaid: boolean;
  answers: MatcherAnswers;
  showAllResults: boolean;
  setShowAllResults: Dispatch<SetStateAction<boolean>>;
  expandedOtherSlug: string | null;
  setExpandedOtherSlug: Dispatch<SetStateAction<string | null>>;
  restart: () => void;
  compareUrl: string;
  setShowPaymentModal: Dispatch<SetStateAction<boolean>>;
}

export default function MatcherResults({
  vehicleCount,
  top3,
  others,
  isPaid,
  answers,
  showAllResults,
  setShowAllResults,
  expandedOtherSlug,
  setExpandedOtherSlug,
  restart,
  compareUrl,
  setShowPaymentModal,
}: Props) {
  return (
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
            Nous avons scanné {vehicleCount} véhicules électriques et configuré la variante idéale par rapport à votre profil.
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
            const isBlurred = index > 0 && !isPaid;
            const isLS = answers.leasingSocialRfr && answers.leasingSocialUsage && res.vehicle.leasingSocialEligible;
            const monthlyPrice = isLS
              ? (res.vehicle.leasingSocial_EUR_per_month ?? 100)
              : (res.bestConfig.monthlyLease_EUR ?? Math.round((res.bestConfig.price_EUR ?? 0) * 0.009));
            return (
              <div
                key={res.vehicle.slug}
                className="rounded-2xl p-6 border relative overflow-hidden transition-all duration-300 shadow-md hover:shadow-xl bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
              >
                {/* Badge Podiums */}
                <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold bg-[var(--color-bg-subtle)] border border-[var(--color-border-strong)] text-[var(--color-text)]">
                    #{index + 1}
                  </span>
                  {isLS && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono border border-[var(--color-accent-dim)] text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] font-semibold uppercase animate-pulse">
                      Leasing Social
                    </span>
                  )}
                </div>

                <div className={`flex flex-col md:flex-row gap-6 w-full h-full ${isBlurred ? "filter blur-md select-none pointer-events-none transition-all" : ""}`}>
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
                      {(() => {
                        const imgUrl = getLocalVehicleImageUrl(res.vehicle.slug) || res.vehicle.imageUrl;
                        return imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={`${res.vehicle.brand} ${res.vehicle.model}`}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <VehicleFallbackSvg className="max-w-full max-h-full text-[var(--color-text-faint)]" />
                        );
                      })()}
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
                        Variante conseillée : <strong className="text-[var(--color-text)]">{res.bestConfig.label}</strong> ({res.vehicle.chemistry} · {res.bestConfig.usableCapacity_kWh ?? res.vehicle.usableCapacity_kWh} kWh)
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
                          const rawPrice = res.bestConfig.price_EUR ?? 0;
                          const householdSize = answers.household === "large_family" ? 5 : answers.household === "family" ? 3 : 1;
                          const taxIncome = answers.leasingSocialRfr ? 12000 : 80000;
                          const { amount: totalCeeAid, isEligible: isEligibleCEE } = calculateCeeAid({
                            vehicle: res.vehicle,
                            price: rawPrice,
                            profileType: "particular",
                            householdSize,
                            taxIncome,
                          });
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
                                    {(() => {
                                      const ceeAid = res.vehicle.availableAids?.find((aid) => aid.label === "Prime CEE");
                                      const batteryAid = res.vehicle.availableAids?.find((aid) => /batterie/i.test(aid.label) || /majoration/i.test(aid.label));
                                      const baseVal = ceeAid ? ceeAid.amount_EUR : 6500;
                                      const battVal = batteryAid ? batteryAid.amount_EUR : 2000;
                                      const capVal = Math.min(8100, baseVal + battVal);
                                      return `Inclut la Prime CEE de ${totalCeeAid.toLocaleString()} € (socle de ${baseVal.toLocaleString()} € + ${battVal.toLocaleString()} € de majoration batterie européenne, plafonné à ${capVal.toLocaleString()} €).`;
                                    })()}
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
                      {isPaid && (
                        <a
                          href={`/simulateur/rapport-premium/?v=${res.vehicle.slug}&config=${res.bestConfig.id}&paid=true&km=${answers.mileage}`}
                          className="btn-interactive inline-flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          Rapport TCO Premium (Inclus) ↗
                          <ChevronRight size={13} strokeWidth={2.5} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {isBlurred && (
                  <div className="absolute inset-0 bg-black/10 backdrop-blur-[6px] z-10 flex flex-col items-center justify-center p-4 text-center">
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-xl max-w-xs flex flex-col gap-3 animate-fade-in">
                      <h4 className="text-sm font-bold tracking-tight">Podium Bloqué</h4>
                      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                        Découvrez les modèles #2 et #3 de votre diagnostic et obtenez leur rapport TCO Premium complet.
                      </p>
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="px-4 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] text-[var(--color-accent-on)] text-xs font-bold rounded-lg cursor-pointer shadow-md transition-colors"
                      >
                        Débloquer pour 9,90 €
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────── AUTRES CHOIX COMPATIBLES (ACCORDION) ────────────────── */}
      {others.length > 0 && (
        <div className="mt-6 border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <button
            onClick={() => {
              if (!isPaid) {
                setShowPaymentModal(true);
              } else {
                setShowAllResults(!showAllResults);
              }
            }}
            className="w-full cursor-pointer p-4 flex items-center justify-between text-xs font-mono uppercase tracking-[0.1em] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all"
          >
            <span>Autres alternatives compatibles ({others.length}) {!isPaid && "🔒"}</span>
            <span className="text-[var(--color-text-faint)] transition-transform duration-300" style={{ transform: showAllResults && isPaid ? "rotate(180deg)" : "rotate(0deg)" }}>
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

                const rawPrice = res.bestConfig.price_EUR ?? 0;
                const householdSize = answers.household === "large_family" ? 5 : answers.household === "family" ? 3 : 1;
                const taxIncome = answers.leasingSocialRfr ? 12000 : 80000;
                const { amount: totalCeeAid, isEligible: isEligibleCEE } = calculateCeeAid({
                  vehicle: res.vehicle,
                  price: rawPrice,
                  profileType: "particular",
                  householdSize,
                  taxIncome,
                });
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
                        <div className="flex flex-col md:flex-row gap-4 items-stretch">
                          {/* Photo / Silhouette */}
                          <div className="w-full md:w-32 h-24 md:h-auto flex-shrink-0 flex items-center justify-center border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] p-2">
                            {(() => {
                              const imgUrl = getLocalVehicleImageUrl(res.vehicle.slug) || res.vehicle.imageUrl;
                              return imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={`${res.vehicle.brand} ${res.vehicle.model}`}
                                  className="max-w-full max-h-full object-contain"
                                />
                              ) : (
                                <VehicleFallbackSvg className="max-w-full max-h-full text-[var(--color-text-faint)]" />
                              );
                            })()}
                          </div>

                          {/* Détail financier / Aide d'État */}
                          <div className="flex-1 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex flex-col gap-1.5 shadow-sm">
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
                                      Aide CEE de {totalCeeAid.toLocaleString()} € déduite (plafonné)
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
                                  ? (() => {
                                      const ceeAid = res.vehicle.availableAids?.find((aid) => aid.label === "Prime CEE");
                                      const batteryAid = res.vehicle.availableAids?.find((aid) => /batterie/i.test(aid.label) || /majoration/i.test(aid.label));
                                      const baseVal = ceeAid ? ceeAid.amount_EUR : 6500;
                                      const battVal = batteryAid ? batteryAid.amount_EUR : 2000;
                                      const capVal = Math.min(8100, baseVal + battVal);
                                      return `*Montant indicatif d'aide CEE de ${totalCeeAid.toLocaleString()} € (socle de ${baseVal.toLocaleString()} € + ${battVal.toLocaleString()} € de majoration batterie européenne, plafonné à ${capVal.toLocaleString()} €) applicable selon l'origine de fabrication du véhicule (produit en ${res.vehicle.productionCountry}).`;
                                    })()
                                  : `*Non éligible à la Prime CEE car le véhicule est assemblé hors d'Europe (${res.vehicle.productionCountry}) ou dépasse le plafond de 47 000 €.`
                                }
                              </p>
                            )}
                          </div>
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
                            {res.vehicle.chemistry} · {res.bestConfig.usableCapacity_kWh ?? res.vehicle.usableCapacity_kWh} kWh · {res.bestConfig.realRange?.mixed_km ?? res.vehicle.realRange.mixed_km} km réels
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
  );
}
