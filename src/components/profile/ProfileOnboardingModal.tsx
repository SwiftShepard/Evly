import React, { useState, useEffect } from "react";
import { useUserProfile } from "@/lib/userProfile";
import { getIncomeCeilings, type UserProfileType } from "@/lib/cee";
import { formatPrice } from "@/lib/format";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileOnboardingModal({ isOpen, onClose }: Props) {
  const { profile, updateProfile } = useUserProfile();

  const [profileType, setProfileType] = useState<UserProfileType>(profile.profileType);
  const [householdSize, setHouseholdSize] = useState<number>(profile.householdSize);
  const [taxIncome, setTaxIncome] = useState<number>(profile.taxIncome);

  // Sync state when profile loads or modal opens
  useEffect(() => {
    if (isOpen) {
      setProfileType(profile.profileType);
      setHouseholdSize(profile.householdSize);
      setTaxIncome(profile.taxIncome);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateProfile({
      profileType,
      householdSize,
      taxIncome,
    });
    onClose();
  };

  const ceilings = getIncomeCeilings(householdSize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white border border-[var(--color-border)] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 z-10">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)] font-semibold">
            Profil local & privé
          </span>
          <h3 className="font-display text-xl font-bold tracking-[-0.015em] text-[var(--color-text)]">
            Votre profil fiscal
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Configurez votre situation une seule fois pour estimer automatiquement et précisément vos aides d'État (CEE / Coup de Pouce 2026) sur tout le site.
          </p>
        </div>

        {/* Profil selector */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-faint)]">
            Votre profil
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
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
              className={`py-2 px-3 text-xs font-semibold rounded-lg border bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-pointer outline-none ${
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
            {/* Nombre de personnes */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-faint)]">
                  Composition du foyer
                </label>
                <span className="font-mono text-xs font-bold text-[var(--color-text)]">
                  {householdSize} {householdSize > 1 ? "personnes" : "personne"}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setHouseholdSize(num)}
                    className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded-md border transition-all cursor-pointer ${
                      householdSize === num
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                        : "border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    {num === 6 ? "6+" : num}
                  </button>
                ))}
              </div>
            </div>

            {/* RFR Input & Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-faint)]">
                  Revenu Fiscal de Référence (RFR)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={taxIncome}
                    min={0}
                    step={500}
                    onChange={(e) => setTaxIncome(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 text-right font-mono text-xs font-bold border-b border-[var(--color-border-strong)] focus:border-[var(--color-accent)] outline-none py-0.5"
                  />
                  <span className="font-mono text-xs text-[var(--color-text-faint)]">€</span>
                </div>
              </div>
              <input
                type="range"
                min={10000}
                max={100000}
                step={1000}
                value={taxIncome}
                onChange={(e) => setTaxIncome(parseInt(e.target.value))}
                className="w-full accent-[var(--color-accent)] h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-[var(--color-text-faint)] font-mono">
                <span>10 k€</span>
                <span>Modeste ≤ {formatPrice(ceilings.modeste)}</span>
                <span>100 k€</span>
              </div>
            </div>
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
            onClick={handleSave}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-dim)] transition-all cursor-pointer shadow-sm text-center"
          >
            Enregistrer les informations
          </button>
          <button
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
