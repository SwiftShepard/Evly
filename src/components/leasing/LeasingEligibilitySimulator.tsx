import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, Coins, MapPin, User, Briefcase, HelpCircle } from "lucide-react";

export default function LeasingEligibilitySimulator() {
  // Base details
  const [rfrTotal, setRfrTotal] = useState<number>(25000);
  const [parts, setParts] = useState<number>(1.5);
  
  // Custom inputs or overrides
  const [isAdultAndResident, setIsAdultAndResident] = useState<boolean>(true);
  const [hasBenefitedBefore, setHasBenefitedBefore] = useState<boolean>(false);
  
  // Professional / Geographic details
  const [commuteDistance, setCommuteDistance] = useState<number>(18);
  const [proMileage, setProMileage] = useState<number>(5000);
  const [isDependentProfession, setIsDependentProfession] = useState<boolean>(false);

  // Dynamic calculations
  const rfrPerPart = useMemo(() => {
    if (!parts || parts <= 0) return 0;
    return Math.round(rfrTotal / parts);
  }, [rfrTotal, parts]);

  // Eligibility conditions checks
  const isFiscallyEligible = rfrPerPart <= 16300;
  
  const isGeographicallyEligible = commuteDistance >= 15 || proMileage >= 8000 || isDependentProfession;
  
  const isEligibleBasic = isAdultAndResident && !hasBenefitedBefore;

  const isFullyEligible = isFiscallyEligible && isGeographicallyEligible && isEligibleBasic;

  // Help tooltip states
  const [showRfrHelp, setShowRfrHelp] = useState<boolean>(false);

  return (
    <div className="w-full rounded-3xl p-6 md:p-8 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl transition-all duration-300">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-faint)]">Outil de simulation</span>
        <span className="h-px flex-1 bg-[var(--color-border)]"></span>
        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono border border-[var(--color-accent-dim)] text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)] uppercase">Session 2026</span>
      </div>

      <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-text)] mb-2">
        Suis-je éligible au Leasing Social ?
      </h2>
      <p className="text-xs text-[var(--color-text-muted)] mb-8 leading-relaxed">
        Simulez votre éligibilité en temps réel selon les barèmes officiels 2026.
      </p>

      {/* DYNAMIC STATUS BANNER */}
      <div className={`mb-8 p-6 rounded-2xl border transition-all duration-500 flex items-start gap-4 ${
        isFullyEligible 
          ? "border-[var(--color-accent-dim)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] text-[var(--color-text)]" 
          : "border-[var(--color-warning-dim)] bg-[color-mix(in_srgb,var(--color-warning)_4%,transparent)] text-[var(--color-text)]"
      }`}>
        <div className="mt-0.5">
          {isFullyEligible ? (
            <CheckCircle2 className="w-6 h-6 text-[var(--color-accent)] animate-pulse" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-[var(--color-warning)]" />
          )}
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight">
            {isFullyEligible ? "Vous semblez éligible !" : "Vous n'êtes pas éligible pour le moment"}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
            {isFullyEligible 
              ? "Votre profil respecte les critères fiscaux (RFR de " + rfrPerPart.toLocaleString() + " €/part ≤ 16 300 €) et de trajet. Vous pouvez prétendre à une offre à partir de 95 €/mois."
              : "Vous devez remplir toutes les conditions fiscales et de trajet. Ajustez les curseurs ci-dessous pour vérifier votre situation."
            }
          </p>
        </div>
      </div>

      {/* FORM SECTIONS */}
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: FISCAL DETAILS */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
            <Coins className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-[var(--color-text)]">
              1. Situation Fiscale (Revenus)
            </h3>
          </div>

          {/* RFR total */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1.5">
                Revenu Fiscal de Référence (RFR) total
                <button 
                  type="button" 
                  onClick={() => setShowRfrHelp(!showRfrHelp)}
                  className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </label>
              <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">
                {rfrTotal.toLocaleString()} €
              </span>
            </div>

            {showRfrHelp && (
              <div className="mb-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[11px] text-[var(--color-text-muted)] leading-relaxed flex gap-2">
                <Info className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                <span>
                  Le RFR figure sur la première page de votre dernier avis d'imposition (revenus de l'année 2024 déclarés en 2025). Il s'agit du montant total avant division par les parts.
                </span>
              </div>
            )}

            <input
              type="range"
              min="5000"
              max="90000"
              step="1000"
              value={rfrTotal}
              onChange={(e) => setRfrTotal(Number(e.target.value))}
              className="w-full h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
            />
            <div className="flex justify-between font-mono text-[9px] text-[var(--color-text-faint)] mt-2">
              <span>5 000 €</span>
              <span>45 000 €</span>
              <span>90 000 €</span>
            </div>
          </div>

          {/* Parts fiscales */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text)] mb-2">
              Nombre de parts fiscales du foyer
            </label>
            <select
              value={parts}
              onChange={(e) => setParts(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
            >
              <option value={1}>1 part (Célibataire)</option>
              <option value={1.5}>1.5 part (Parent isolé, 1 enfant)</option>
              <option value={2}>2 parts (Couple marié/Pacsé)</option>
              <option value={2.5}>2.5 parts (Couple + 1 enfant)</option>
              <option value={3}>3 parts (Couple + 2 enfants)</option>
              <option value={3.5}>3.5 parts (Couple + 3 enfants)</option>
              <option value={4}>4 parts (Couple + 4 enfants)</option>
              <option value={4.5}>4.5 parts (Couple + 5 enfants)</option>
              <option value={5}>5 parts</option>
            </select>
          </div>

          {/* Computed RFR per part status */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
            isFiscallyEligible 
              ? "border-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_3%,transparent)]" 
              : "border-[color-mix(in_srgb,var(--color-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_3%,transparent)]"
          }`}>
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-faint)]">Revenu par part calculé</span>
              <span data-numeric className="font-display text-lg font-semibold text-[var(--color-text)]">
                {rfrPerPart.toLocaleString()} € / part
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isFiscallyEligible ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="text-[11px] font-mono font-semibold text-[var(--color-accent)]">Éligible (≤ 16 300 €)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-[var(--color-warning)]" />
                  <span className="text-[11px] font-mono font-semibold text-[var(--color-warning)]">Seuil dépassé</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MOBILITY & USAGE */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
            <MapPin className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-[var(--color-text)]">
              2. Mobilité & Trajets (Gros rouleur)
            </h3>
          </div>

          {/* Commute distance slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--color-text)]">
                Distance domicile-travail (aller simple)
              </label>
              <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">
                {commuteDistance} km
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={commuteDistance}
              onChange={(e) => setCommuteDistance(Number(e.target.value))}
              disabled={isDependentProfession}
              className="w-full h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)] disabled:opacity-30"
            />
            <div className="flex justify-between font-mono text-[9px] text-[var(--color-text-faint)] mt-2">
              <span>0 km</span>
              <span className={commuteDistance >= 15 ? "text-[var(--color-accent)] font-semibold" : ""}>Seuil 15 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Pro mileage slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--color-text)]">
                Kilométrage professionnel annuel (perso)
              </label>
              <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">
                {proMileage.toLocaleString()} km
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20000"
              step="500"
              value={proMileage}
              onChange={(e) => setProMileage(Number(e.target.value))}
              disabled={isDependentProfession}
              className="w-full h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)] disabled:opacity-30"
            />
            <div className="flex justify-between font-mono text-[9px] text-[var(--color-text-faint)] mt-2">
              <span>0 km</span>
              <span className={proMileage >= 8000 ? "text-[var(--color-accent)] font-semibold" : ""}>Seuil 8 000 km</span>
              <span>20 000 km</span>
            </div>
          </div>

          {/* Nouveauté 2026 : Dependent profession checkbox */}
          <button
            type="button"
            onClick={() => setIsDependentProfession(!isDependentProfession)}
            className={`flex items-start text-left p-3.5 rounded-xl border transition-all ${
              isDependentProfession 
                ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]" 
                : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
            }`}
          >
            <div className="flex items-center justify-center w-5 h-5 rounded border border-[var(--color-border-strong)] mr-3 mt-0.5 bg-[var(--color-bg)]">
              {isDependentProfession && <div className="w-2.5 h-2.5 bg-[var(--color-accent)] rounded-sm" />}
            </div>
            <div className="flex-1">
              <span className="block font-medium text-xs text-[var(--color-text)]">
                Volet professionnel 2026 (métiers mobiles)
              </span>
              <span className="block text-[10px] text-[var(--color-text-muted)] mt-1 leading-normal">
                Aide à domicile, santé, artisan, livreur ou commercial utilisant son véhicule au quotidien. (Dispense du critère de distance domicile-travail).
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* SECTION 3: OTHER CHECKS */}
      <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2 pb-4">
          <User className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-[var(--color-text)]">
            3. Autres Conditions obligatoires
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Adult and resident */}
          <button
            type="button"
            onClick={() => setIsAdultAndResident(!isAdultAndResident)}
            className={`flex items-center text-left p-3 rounded-xl border transition-all ${
              isAdultAndResident 
                ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_3%,transparent)]" 
                : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
            }`}
          >
            <div className="flex items-center justify-center w-4 h-4 rounded border border-[var(--color-border-strong)] mr-3 bg-[var(--color-bg)]">
              {isAdultAndResident && <div className="w-2 h-2 bg-[var(--color-accent)] rounded-sm" />}
            </div>
            <span className="text-xs text-[var(--color-text)]">
              Je suis majeur et je réside en France.
            </span>
          </button>

          {/* Has benefited in 2024 */}
          <button
            type="button"
            onClick={() => setHasBenefitedBefore(!hasBenefitedBefore)}
            className={`flex items-center text-left p-3 rounded-xl border transition-all ${
              hasBenefitedBefore 
                ? "border-[var(--color-warning)] bg-[color-mix(in_srgb,var(--color-warning)_3%,transparent)]" 
                : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]"
            }`}
          >
            <div className="flex items-center justify-center w-4 h-4 rounded border border-[var(--color-border-strong)] mr-3 bg-[var(--color-bg)]">
              {hasBenefitedBefore && <div className="w-2 h-2 bg-[var(--color-warning)] rounded-sm" />}
            </div>
            <span className="text-xs text-[var(--color-text)]">
              J'ai déjà bénéficié du Leasing Social lors de la session 2024.
            </span>
          </button>
        </div>
      </div>

      {/* SUMMARY CHECKLIST */}
      <div className="mt-8 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)] block mb-3">Récapitulatif des critères d'éligibilité :</span>
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            {isFiscallyEligible ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
            )}
            <span className={isFiscallyEligible ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>
              Revenu fiscal par part ≤ 16 300 € ({rfrPerPart.toLocaleString()} €)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isGeographicallyEligible ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
            )}
            <span className={isGeographicallyEligible ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>
              {isDependentProfession 
                ? "Profession dépendante déclarée (Éligible)" 
                : `Usage gros rouleur : ${commuteDistance} km (seuil 15) ou ${proMileage.toLocaleString()} km (seuil 8k)`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdultAndResident ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
            )}
            <span className={isAdultAndResident ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>
              Majeur et résidant fiscal en France
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!hasBenefitedBefore ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
            )}
            <span className={!hasBenefitedBefore ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>
              Aucun dossier de leasing social précédent (2024)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
