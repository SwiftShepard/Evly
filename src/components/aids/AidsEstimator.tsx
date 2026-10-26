import { useEffect, useState } from "react";
import {
  GROS_ROULEUR_KM,
  HOUSEHOLD_LABELS,
  MORAL_PERSON_PRIME_EUR,
  PRIME_GRID,
  RFR_PART_CEILINGS,
  getHouseholdCategory,
  grosRouleurOpen,
} from "@/lib/cee";
import { useUserProfile } from "@/lib/userProfile";
import { formatPrice } from "@/lib/format";
import { url } from "@/lib/url";

/**
 * Estimateur des aides de la page /aides/ : catégorie CEE d'après le revenu fiscal par part,
 * prime de la grille de référence (standard et production européenne), et seuil de revenu du
 * leasing social. Le profil se retient pour tout le site (fiches, catalogue, comparateur), comme
 * le réglage de la fenêtre de profil : même stockage (evly-user-profile).
 */
export default function AidsEstimator() {
  const { profile, updateProfile } = useUserProfile();
  const [company, setCompany] = useState(false);
  const [income, setIncome] = useState(24000);
  const [parts, setParts] = useState(1);
  const [commuter, setCommuter] = useState(false);
  const [saved, setSaved] = useState(false);

  // Repart du profil déjà enregistré sur l'appareil
  useEffect(() => {
    if (!profile.hasConfigured) return;
    setCompany(profile.profileType !== "particular");
    setIncome(profile.taxIncome);
    setParts(profile.taxParts);
    setCommuter(profile.bigCommuter);
  }, [profile.hasConfigured, profile.profileType, profile.taxIncome, profile.taxParts, profile.bigCommuter]);

  const commuterOpen = grosRouleurOpen();
  const perPart = income / Math.max(1, parts);
  const category = getHouseholdCategory(income, parts, commuter && commuterOpen);
  const leasingIncome = perPart <= RFR_PART_CEILINGS.modeste;
  const touch = () => setSaved(false);

  return (
    <div className="aids-est">
      <div className="aids-est-form">
        <div className="aids-seg" role="radiogroup" aria-label="Vous achetez">
          <button type="button" role="radio" aria-checked={!company} onClick={() => { setCompany(false); touch(); }}>
            En particulier
          </button>
          <button type="button" role="radio" aria-checked={company} onClick={() => { setCompany(true); touch(); }}>
            Pour une société
          </button>
        </div>

        {!company && (
          <>
            <label className="aids-field">
              <span>Revenu fiscal de référence du foyer</span>
              <span className="aids-input">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={500}
                  value={income}
                  onChange={(e) => { setIncome(Math.max(0, Number(e.target.value) || 0)); touch(); }}
                />
                <b>€</b>
              </span>
              <small>Sur votre dernier avis d'imposition.</small>
            </label>
            <div className="aids-field">
              <span id="aids-parts">Nombre de parts</span>
              <span className="aids-stepper" role="group" aria-labelledby="aids-parts">
                <button type="button" onClick={() => { setParts((p) => Math.max(1, p - 0.5)); touch(); }} disabled={parts <= 1} aria-label="Une demi-part de moins">
                  −
                </button>
                <b className="tabular">{String(parts).replace(".", ",")}</b>
                <button type="button" onClick={() => { setParts((p) => Math.min(8, p + 0.5)); touch(); }} aria-label="Une demi-part de plus">
                  +
                </button>
              </span>
            </div>
            {commuterOpen && (
              <label className="aids-check">
                <input type="checkbox" checked={commuter} onChange={(e) => { setCommuter(e.target.checked); touch(); }} />
                <span>Je roule plus de {GROS_ROULEUR_KM.toLocaleString("fr-FR")} km par an pour le travail avec ma voiture</span>
              </label>
            )}
          </>
        )}
      </div>

      <div className="aids-est-result" aria-live="polite">
        {company ? (
          <>
            <p className="aids-est-label">Prime CEE d'une société</p>
            <p className="aids-est-amount">{formatPrice(MORAL_PERSON_PRIME_EUR)}</p>
            <p className="aids-est-note">
              Personnes morales (sociétés, collectivités, loueurs, associations). Un entrepreneur individuel achète en personne
              physique : c'est la prime des ménages qui s'applique.
            </p>
          </>
        ) : (
          <>
            <p className="aids-est-label">
              {HOUSEHOLD_LABELS[category]} · {formatPrice(Math.round(perPart))} par part
            </p>
            <p className="aids-est-amount">{formatPrice(PRIME_GRID.standard[category])}</p>
            <p className="aids-est-note">
              de prime CEE, ou {formatPrice(PRIME_GRID.europe[category])} si la voiture et sa batterie sont produites en Europe.
            </p>
            <p className={`aids-est-leasing ${leasingIncome ? "is-ok" : ""}`}>
              {leasingIncome
                ? "Vos revenus ouvrent aussi le leasing social, sous condition de trajet."
                : `Leasing social : réservé aux revenus jusqu'à ${formatPrice(RFR_PART_CEILINGS.modeste)} par part.`}
            </p>
          </>
        )}
        <div className="aids-est-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              updateProfile({ profileType: company ? "company_small" : "particular", taxIncome: income, taxParts: parts, bigCommuter: commuter });
              setSaved(true);
            }}
          >
            {saved ? "Retenu sur tout le site" : "Appliquer à tous les prix du site"}
          </button>
          <a className="btn btn-secondary btn-sm" href={url("/vehicules/") + "?options=cee&tri=price-asc"}>
            Voir les modèles éligibles
          </a>
        </div>
        <p className="aids-est-foot">Enregistré sur cet appareil uniquement : rien n'est envoyé.</p>
      </div>
    </div>
  );
}
