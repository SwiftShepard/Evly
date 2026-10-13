import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Check } from "lucide-react";
import { BUDGET_RANGE, type MatcherAnswers } from "./scoring";

type SetAnswers = Dispatch<SetStateAction<MatcherAnswers>>;

/** Étapes du questionnaire : libellé court (barre d'étapes, résumé des réponses) */
export const STEPS = ["Trajet", "Voyages", "À bord", "Format", "Budget", "Priorités"] as const;

const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/ /g, " ");

/* ------------------------------------------------------------------ */
/* Briques                                                             */
/* ------------------------------------------------------------------ */

function Question({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="mq-question">
      <h2 className="mq-title">{title}</h2>
      {hint && <p className="mq-hint">{hint}</p>}
      <div className="mq-fields">{children}</div>
    </div>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
  desc?: string;
}

/** Cartes à choix unique */
function Tiles<T extends string>({ label, value, options, onChange, cols = 3 }: { label: string; value: T; options: Option<T>[]; onChange: (v: T) => void; cols?: 2 | 3 | 5 }) {
  return (
    <div role="radiogroup" aria-label={label} className="mq-tiles" data-cols={cols}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="mq-tile" onClick={() => onChange(o.value)}>
          <span className="mq-radio" aria-hidden="true" />
          <span className="mq-tile-label">{o.label}</span>
          {o.desc && <span className="mq-tile-desc">{o.desc}</span>}
        </button>
      ))}
    </div>
  );
}

/** Choix court en pastilles */
function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Option<T>[]; onChange: (v: T) => void }) {
  return (
    <div className="mq-seg-row">
      <span className="mq-seg-label">{label}</span>
      <div role="radiogroup" aria-label={label} className="mq-seg">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Case à cocher en carte */
function CheckCard({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} className="mq-tile mq-check" onClick={() => onChange(!checked)}>
      <span className="mq-box" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
      <span className="mq-tile-label">{label}</span>
      {desc && <span className="mq-tile-desc">{desc}</span>}
    </button>
  );
}

function Slider({ id, label, value, min, max, step, display, onChange, ticks }: { id: string; label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void; ticks: [string, string] }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="mq-slider">
      <label htmlFor={id} className="mq-slider-head">
        <span>{label}</span>
        <output htmlFor={id} className="mq-slider-value">{display}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="trip-range"
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
      />
      <div className="mq-ticks" aria-hidden="true"><span>{ticks[0]}</span><span>{ticks[1]}</span></div>
    </div>
  );
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="trip-toggle mq-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="trip-toggle-ui" aria-hidden="true"></span>
      <span>{children}</span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

export default function MatcherQuestions({ step, answers: a, setAnswers }: { step: number; answers: MatcherAnswers; setAnswers: SetAnswers }) {
  const set = <K extends keyof MatcherAnswers>(key: K) => (value: MatcherAnswers[K]) => setAnswers((prev) => ({ ...prev, [key]: value }));

  switch (step) {
    case 0:
      return (
        <Question
          title="Combien de kilomètres faites-vous par jour ?"
          hint="Aller et retour, un jour de semaine habituel. C'est la base de tout : une voiture qui tient votre semaine sans recharger, même en hiver, vous simplifie la vie."
        >
          <Slider id="mq-daily" label="Trajet quotidien" value={a.dailyKm} min={10} max={200} step={5} display={`${a.dailyKm} km`} onChange={set("dailyKm")} ticks={["10 km", "200 km"]} />
          <Toggle checked={a.homeCharging} onChange={set("homeCharging")}>Je peux recharger chez moi ou au travail</Toggle>
          <p className="mq-note">Repris de « Mon trajet » et mis à jour sur tout le site quand vous voyez vos résultats.</p>
        </Question>
      );

    case 1:
      return (
        <Question title="Partez-vous souvent loin ?" hint="Vacances, week-ends en famille, déplacements : c'est là que la recharge rapide et l'autonomie sur autoroute comptent.">
          <Tiles
            label="Fréquence des longs trajets"
            value={a.longTrips}
            onChange={set("longTrips")}
            options={[
              { value: "never", label: "Presque jamais", desc: "La voiture reste dans ma région." },
              { value: "few", label: "Quelques fois par an", desc: "Vacances, grands week-ends." },
              { value: "often", label: "Tous les mois ou plus", desc: "Je fais souvent de l'autoroute." },
            ]}
          />
          {a.longTrips !== "never" && (
            <Slider id="mq-long" label="Votre plus long trajet d'une traite" value={a.longTripKm} min={150} max={1000} step={50} display={`${fmt(a.longTripKm)} km`} onChange={set("longTripKm")} ticks={["150 km", "1 000 km"]} />
          )}
        </Question>
      );

    case 2:
      return (
        <Question title="Qui monte à bord ?" hint="Pour la place à l'arrière, le coffre et le gabarit qui vous convient.">
          <Tiles
            label="Foyer"
            value={a.household}
            onChange={set("household")}
            options={[
              { value: "solo", label: "Seul ou à deux", desc: "Peu de passagers à l'arrière." },
              { value: "family", label: "Famille, 1 ou 2 enfants", desc: "Sièges enfant, poussette, bagages." },
              { value: "large", label: "Famille nombreuse", desc: "Beaucoup de monde ou de matériel." },
            ]}
          />
          <Segmented
            label="Ce sera"
            value={a.role}
            onChange={set("role")}
            options={[
              { value: "primary", label: "La voiture principale" },
              { value: "secondary", label: "Une seconde voiture" },
            ]}
          />
        </Question>
      );

    case 3:
      return (
        <Question title="Quel format vous plaît ?" hint="Les modèles d'un autre format restent proposés, mais moins bien classés.">
          <Tiles
            label="Format"
            value={a.body}
            onChange={set("body")}
            cols={5}
            options={[
              { value: "any", label: "Peu importe" },
              { value: "city", label: "Citadine ou compacte" },
              { value: "sedan", label: "Berline ou break" },
              { value: "suv", label: "SUV ou crossover" },
              { value: "van", label: "Monospace ou ludospace" },
            ]}
          />
          <Segmented
            label="Coffre"
            value={a.trunk}
            onChange={set("trunk")}
            options={[
              { value: "any", label: "Selon mon foyer" },
              { value: "medium", label: "350 L et plus" },
              { value: "large", label: "450 L et plus" },
            ]}
          />
          <Toggle checked={a.hatch} onChange={set("hatch")}>Il me faut un hayon (pas de berline à malle)</Toggle>
        </Question>
      );

    case 4: {
      const range = BUDGET_RANGE[a.budgetType];
      const social = a.lowIncome && a.commuter;
      return (
        <Question title="Quel est votre budget ?" hint="La prime CEE est déduite des prix d'achat. Vos revenus ne sont ni envoyés ni enregistrés : tout est calculé dans votre navigateur.">
          <Segmented
            label="Je préfère"
            value={a.budgetType}
            onChange={(v) => setAnswers((prev) => ({ ...prev, budgetType: v, budgetMax: BUDGET_RANGE[v].initial }))}
            options={[
              { value: "buy", label: "Acheter" },
              { value: "lease", label: "Louer (LLD, LOA)" },
            ]}
          />
          <Slider
            id="mq-budget"
            label={a.budgetType === "buy" ? "Prix maximum, aides déduites" : "Loyer maximum"}
            value={a.budgetMax}
            min={range.min}
            max={range.max}
            step={range.step}
            display={a.budgetType === "buy" ? `${fmt(a.budgetMax)} €` : `${fmt(a.budgetMax)} €/mois`}
            onChange={set("budgetMax")}
            ticks={a.budgetType === "buy" ? ["15 000 €", "100 000 €"] : ["100 €/mois", "1 000 €/mois"]}
          />
          <div className="mq-group">
            <p className="mq-group-title">Aides sous conditions de revenus</p>
            <div className="mq-tiles" data-cols={2}>
              <CheckCard checked={a.lowIncome} onChange={set("lowIncome")} label="Mon revenu fiscal de référence par part est de 16 300 € ou moins" desc="Prime CEE plus élevée, et première condition du leasing social." />
              {a.budgetType === "lease" && (
                <CheckCard checked={a.commuter} onChange={set("commuter")} label="J'habite à plus de 10 km de mon travail" desc="Ou je roule plus de 8 000 km par an pour mon travail avec ma voiture." />
              )}
            </div>
            {a.budgetType === "lease" && (
              <p className="mq-note" aria-live="polite">
                {social ? "Vous remplissez les deux conditions du leasing social : les modèles concernés sont proposés à leur loyer social." : "Le leasing social demande les deux conditions."}
              </p>
            )}
          </div>
        </Question>
      );
    }

    default:
      return (
        <Question title="Qu'est-ce qui compte en plus pour vous ?" hint="Facultatif : cochez ce qui doit peser dans le classement.">
          <div className="mq-tiles" data-cols={3}>
            <CheckCard checked={a.fastCharge} onChange={set("fastCharge")} label="Recharger vite sur l'autoroute" desc="10 à 80 % en 30 minutes au plus sur borne rapide." />
            <CheckCard checked={a.europe} onChange={set("europe")} label="Une voiture fabriquée en Europe" desc="Selon le pays d'assemblage indiqué sur chaque fiche." />
            <CheckCard checked={a.software} onChange={set("software")} label="Un écran et un GPS fluides" desc="Selon l'avis de la rédaction sur chaque marque." />
          </div>
        </Question>
      );
  }
}
