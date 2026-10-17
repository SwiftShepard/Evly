import React, { useState, useEffect } from "react";
import type { Vehicle } from "@/data/schemas";
import { useUserProfile } from "@/lib/userProfile";
import { calculateCeeAid, isVehicleEligibleCEE, HOUSEHOLD_LABELS, PRIME_GRID } from "@/lib/cee";
import { formatPrice } from "@/lib/format";
import ProfileOnboardingModal from "@/components/profile/ProfileOnboardingModal";

interface Props {
  vehicle: Vehicle;
}

export default function CeeSimulator({ vehicle }: Props) {
  const { profile } = useUserProfile();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Active configuration price
  const [activeConfigPrice, setActiveConfigPrice] = useState<number | null>(
    vehicle.configurations[0]?.price_EUR ?? vehicle.trims[0]?.price_EUR ?? null
  );
  const [activeConfigLabel, setActiveConfigLabel] = useState<string>(
    vehicle.configurations[0]?.label ?? vehicle.trims[0]?.name ?? ""
  );

  // Écouter les changements de configuration
  useEffect(() => {
    const handleConfigChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const configId = customEvent.detail.configId;
      const config = vehicle.configurations.find((c) => c.id === configId);
      if (config) {
        setActiveConfigPrice(config.price_EUR);
        setActiveConfigLabel(config.label);
      }
    };
    window.addEventListener("config-changed", handleConfigChange);
    return () => window.removeEventListener("config-changed", handleConfigChange);
  }, [vehicle]);

  const isEligible = isVehicleEligibleCEE(vehicle, activeConfigPrice);

  // Calculer l'aide dynamique basée sur le profil utilisateur local
  const { amount: ceeAmount, category, label: ceeLabel, europe } = calculateCeeAid({
    vehicle,
    price: activeConfigPrice,
    profileType: profile.profileType,
    taxParts: profile.taxParts,
    taxIncome: profile.taxIncome,
    bigCommuter: profile.bigCommuter,
  });

  const finalNetPrice = activeConfigPrice !== null ? Math.max(0, activeConfigPrice - ceeAmount) : null;

  // Libellés pour l'interface
  const getCategoryLabel = () => {
    if (profile.profileType !== "particular") {
      switch (profile.profileType) {
        case "company_small":
        case "company_large":
          return "Profil Entreprise";
        case "local_authority":
          return "Collectivité locale";
        case "rental":
          return "Loueur";
        case "other_legal_entity":
          return "Personne morale";
        default:
          return "Professionnel";
      }
    }
    return category ? HOUSEHOLD_LABELS[category] : "Particulier";
  };

  return (
    <>
      <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 md:p-5 shadow-sm flex flex-col gap-4">
        {/* En-tête */}
        <div className="flex justify-between items-baseline">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-faint)]">
            Aides d'État CEE 2026
          </span>
          {profile.hasConfigured && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-accent)] font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              Profil appliqué
            </span>
          )}
        </div>

        {!profile.hasConfigured ? (
          /* État non configuré : Appel à l'action sobre et léger */
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-sm font-bold text-[var(--color-text)]">
                Calculez vos aides personnalisées
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-normal">
                Vos aides d'État varient selon vos revenus (RFR) et votre foyer.
              </p>
            </div>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setIsModalOpen(true)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-[var(--color-border-strong)] text-[var(--color-text)] bg-[var(--color-bg-subtle)] hover:bg-neutral-100 hover:border-neutral-400 transition-all cursor-pointer text-center"
            >
              Configurer mon profil fiscal
            </button>
          </div>
        ) : (
          /* État configuré : Affichage propre, condensé et élégant des résultats */
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
                  {ceeLabel}
                </span>
                <span className="font-display text-xl font-extrabold text-[var(--color-accent)] tabular">
                  {ceeAmount > 0 ? `-${formatPrice(ceeAmount)}` : "0 €"}
                </span>
              </div>

              <div className="flex flex-col gap-0.5 items-end text-right">
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
                  Votre Net ({activeConfigLabel})
                </span>
                {finalNetPrice !== null ? (
                  <span className="font-display text-xl font-extrabold text-[var(--color-text)] tabular">
                    {formatPrice(finalNetPrice)}
                  </span>
                ) : (
                  <span className="font-mono text-xs text-[var(--color-text-faint)]">Non communiqué</span>
                )}
              </div>
            </div>

            {/* Sub-meta row */}
            <div className="flex justify-between items-center text-[10px] text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border)]">
              <span>{getCategoryLabel()}</span>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setIsModalOpen(true)}
                className="text-[var(--color-accent)] font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                Modifier mon profil
              </button>
            </div>
          </div>
        )}

        {profile.hasConfigured && profile.profileType === "particular" && category && europe === "possible" && (
          <p className="text-[10px] text-[var(--color-text-muted)] leading-normal">
            Jusqu'à {formatPrice(PRIME_GRID.europe[category])} si la voiture et sa batterie de cette version sont produites
            en Europe : à confirmer avec le vendeur.
          </p>
        )}

        {!isEligible && (
          <div className="text-[10px] text-red-700 bg-red-50 border border-red-100 p-2 rounded-lg leading-normal">
            ⚠️ Cette version n'est pas éligible au coup de pouce CEE 2026 (prix &gt; 47 000 €, masse &ge; 2,4 t ou éco-score insuffisant).
          </div>
        )}
      </div>

      {/* Onboarding Modal */}
      <ProfileOnboardingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
