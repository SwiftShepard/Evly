import React, { useState, useEffect, useId, useRef } from "react";
import { url } from "@/lib/url";
import { useUserProfile } from "@/lib/userProfile";
import { getHouseholdCategory, grosRouleurOpen, HOUSEHOLD_LABELS, GROS_ROULEUR_KM, RFR_PART_CEILINGS, type UserProfileType } from "@/lib/cee";
import { formatPrice } from "@/lib/format";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileOnboardingModal({ isOpen, onClose }: Props) {
  const { profile, updateProfile } = useUserProfile();

  const [profileType, setProfileType] = useState<UserProfileType>(profile.profileType);
  const [taxParts, setTaxParts] = useState<number>(profile.taxParts);
  const [taxIncome, setTaxIncome] = useState<number>(profile.taxIncome);
  const [bigCommuter, setBigCommuter] = useState<boolean>(profile.bigCommuter);

  const titleId = useId();
  const profileLabelId = useId();
  const partsLabelId = useId();
  const incomeLabelId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Dialogue modal : focus à l'ouverture, Échap pour fermer, focus rendu à la fermeture
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), select, input, a[href]"
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [isOpen, onClose]);

  // Sync state when profile loads or modal opens
  useEffect(() => {
    if (isOpen) {
      setProfileType(profile.profileType);
      setTaxParts(profile.taxParts);
      setTaxIncome(profile.taxIncome);
      setBigCommuter(profile.bigCommuter);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateProfile({
      profileType,
      taxParts,
      taxIncome,
      bigCommuter,
    });
    onClose();
  };

  const perPart = Math.round(taxIncome / Math.max(1, taxParts));
  const category = getHouseholdCategory(taxIncome, taxParts, bigCommuter);
  const commuterOpen = grosRouleurOpen();
  const stepParts = (d: number) => setTaxParts((p) => Math.min(10, Math.max(1, p + d)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative bg-white border border-[var(--color-border)] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 z-10">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)] font-semibold">
            Profil local & privé
          </span>
          <h2 id={titleId} className="font-display text-xl font-bold tracking-[-0.015em] text-[var(--color-text)]">
            Votre profil fiscal
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Renseignez votre situation une fois pour estimer votre prime CEE (coup de pouce) sur tout le site. Montants indicatifs : la prime versée dépend de l'organisme qui la paie.
          </p>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Ces informations restent enregistrées dans votre navigateur : elles ne sont jamais envoyées à Evly ni à un tiers.{" "}
            <a href={url("/confidentialite/#stockage-local")} className="underline underline-offset-2 hover:text-[var(--color-text)]">
              En savoir plus
            </a>
          </p>
        </div>

        {/* Profil selector */}
        <div className="flex flex-col gap-2">
          <span id={profileLabelId} className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-faint)]">
            Votre profil
          </span>
          <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby={profileLabelId}>
            <button
              type="button"
              aria-pressed={profileType === "particular"}
              onClick={() => setProfileType("particular")}
              className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                profileType === "particular"
                  ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              Particulier
            </button>
            <select
              value={profileType === "particular" ? "" : profileType}
              onChange={(e) => setProfileType(e.target.value as UserProfileType)}
              aria-label="Profil professionnel"
              className={`py-2 px-3 text-xs font-semibold rounded-lg border bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-pointer ${
                profileType !== "particular"
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)]"
                  : "border-[var(--color-border)]"
              }`}
            >
              <option value="" disabled>Professionnels...</option>
              <option value="company_small">Entreprise</option>
              <option value="local_authority">Collectivité locale</option>
              <option value="rental">Loueur de véhicules</option>
              <option value="other_legal_entity">Autre personne morale</option>
            </select>
          </div>
        </div>

        {profileType === "particular" ? (
          <div className="flex flex-col gap-5 pt-1 border-t border-[var(--color-border)]">
            {/* Parts fiscales */}
            <div className="flex justify-between items-center gap-3">
              <span id={partsLabelId} className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-faint)]">
                Nombre de parts (avis d'imposition)
              </span>
              <div className="flex items-center gap-1" role="group" aria-labelledby={partsLabelId}>
                <button
                  type="button"
                  aria-label="Une demi-part de moins"
                  onClick={() => stepParts(-0.5)}
                  disabled={taxParts <= 1}
                  className="w-7 h-7 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-xs font-bold text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] disabled:opacity-40 cursor-pointer"
                >
                  −
                </button>
                <span className="w-10 text-center font-mono text-xs font-bold text-[var(--color-text)]" aria-live="polite">
                  {taxParts.toLocaleString("fr-FR")}
                </span>
                <button
                  type="button"
                  aria-label="Une demi-part de plus"
                  onClick={() => stepParts(0.5)}
                  disabled={taxParts >= 10}
                  className="w-7 h-7 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-xs font-bold text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] disabled:opacity-40 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* RFR Input & Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <label id={incomeLabelId} htmlFor={`${incomeLabelId}-input`} className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-faint)]">
                  Revenu fiscal de référence du foyer
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id={`${incomeLabelId}-input`}
                    type="number"
                    inputMode="numeric"
                    value={taxIncome}
                    min={0}
                    step={500}
                    onChange={(e) => setTaxIncome(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 text-right font-mono text-xs font-bold border-b border-[var(--color-text-faint)] focus:border-[var(--color-accent)] py-0.5"
                  />
                  <span className="font-mono text-xs text-[var(--color-text-faint)]">€</span>
                </div>
              </div>
              <input
                type="range"
                min={5000}
                max={100000}
                step={1000}
                value={taxIncome}
                onChange={(e) => setTaxIncome(parseInt(e.target.value))}
                aria-labelledby={incomeLabelId}
                aria-valuetext={formatPrice(taxIncome)}
                className="w-full accent-[var(--color-accent)] h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-[var(--color-text-muted)] leading-normal" aria-live="polite">
                {formatPrice(perPart)} par part : <span className="font-semibold text-[var(--color-text)]">{HOUSEHOLD_LABELS[category].toLowerCase()}</span>
                {" "}(précarité ≤ {formatPrice(RFR_PART_CEILINGS.precarite)}, modeste ≤ {formatPrice(RFR_PART_CEILINGS.modeste)} par part).
              </p>
            </div>

            {commuterOpen && (
              <label className="flex items-start gap-2 text-xs text-[var(--color-text-muted)] leading-normal cursor-pointer">
                <input
                  type="checkbox"
                  checked={bigCommuter}
                  onChange={(e) => setBigCommuter(e.target.checked)}
                  className="mt-0.5 accent-[var(--color-accent)]"
                />
                <span>
                  Je roule plus de {GROS_ROULEUR_KM.toLocaleString("fr-FR")} km par an pour mon travail avec ma voiture personnelle
                  (prime « gros rouleur » jusqu'à {formatPrice(RFR_PART_CEILINGS.gros_rouleur)} par part, achat avant 2027).
                </span>
              </label>
            )}
          </div>
        ) : (
          <div className="p-4 bg-[var(--color-bg-subtle)] rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] leading-relaxed">
            <p className="font-semibold text-[var(--color-text)] mb-1">Profil professionnel :</p>
            <p>Les barèmes fixes seront appliqués selon votre statut juridique lors des simulations sur le site.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-dim)] transition-all cursor-pointer shadow-sm text-center"
          >
            Enregistrer les informations
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl font-semibold text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all cursor-pointer text-center"
          >
            Passer pour le moment
          </button>
        </div>
      </div>
    </div>
  );
}
