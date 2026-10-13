import { useState, type Dispatch, type SetStateAction } from "react";
import { AlertTriangle, ArrowRight, ArrowUpRight, Check, ChevronDown, Pencil, RotateCcw } from "lucide-react";
import Rail from "@/components/ui/Rail";
import { url } from "@/lib/url";
import { BUDGET_RANGE, type MatcherAnswers, type MatchResult } from "./scoring";
import { STEPS } from "./MatcherQuestions";

/** Photos optimisées au build : slug → src (240 px) et srcset */
export type VehicleImages = Record<string, { src: string; srcset: string }>;

interface Props {
  results: MatchResult[];
  answers: MatcherAnswers;
  vehicleCount: number;
  images: VehicleImages;
  showAll: boolean;
  setShowAll: Dispatch<SetStateAction<boolean>>;
  onEdit: (step: number) => void;
  restart: () => void;
  setAnswers: Dispatch<SetStateAction<MatcherAnswers>>;
}

const TOP = 3;
const PAGE = 12;
const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/ /g, " ");

/** Résumé de chaque étape, cliquable pour la modifier */
function summary(a: MatcherAnswers): string[] {
  const trips = { never: "Pas de longs trajets", few: `Voyages quelques fois par an, ${fmt(a.longTripKm)} km`, often: `Voyages fréquents, ${fmt(a.longTripKm)} km` }[a.longTrips];
  const household = { solo: "Seul ou à deux", family: "Famille", large: "Famille nombreuse" }[a.household];
  const body = { any: "Tous formats", city: "Citadine ou compacte", sedan: "Berline ou break", suv: "SUV ou crossover", van: "Monospace" }[a.body];
  const trunk = a.trunk === "medium" ? ", coffre 350 L+" : a.trunk === "large" ? ", coffre 450 L+" : "";
  const prio = [a.fastCharge && "recharge rapide", a.europe && "Europe", a.software && "écran fluide"].filter(Boolean).join(", ");
  return [
    `${a.dailyKm} km par jour${a.homeCharging ? ", recharge chez moi" : ", bornes publiques"}`,
    trips,
    `${household}, ${a.role === "primary" ? "voiture principale" : "seconde voiture"}`,
    `${body}${trunk}${a.hatch ? ", hayon" : ""}`,
    a.budgetType === "buy" ? `Jusqu'à ${fmt(a.budgetMax)} €` : `Jusqu'à ${fmt(a.budgetMax)} €/mois`,
    prio ? `Priorités : ${prio}` : "Aucune priorité en plus",
  ];
}

function Photo({ slug, alt, images, sizes }: { slug: string; alt: string; images: VehicleImages; sizes: string }) {
  const img = images[slug];
  if (!img) return <span className="mq-photo-empty" aria-hidden="true" />;
  return <img src={img.src} srcSet={img.srcset || undefined} sizes={sizes} alt={alt} loading="lazy" decoding="async" className="vehicle-photo" />;
}

/** Détail du score : chaque critère et sa note, déplié sur place */
function Breakdown({ result, open }: { result: MatchResult; open: boolean }) {
  return (
    <div className="mq-reveal" data-open={open || undefined}>
      <div>
        <ul className="mq-criteria">
          {result.criteria.map((c) => (
            <li key={c.label}>
              <span className="mq-crit-label">{c.label}{c.weight >= 3 ? <em> · compte triple</em> : c.weight >= 2 ? <em> · compte double</em> : null}</span>
              <span className="mq-crit-bar" style={{ "--fit": c.fit } as React.CSSProperties} aria-hidden="true" />
              <span className="mq-crit-value">{Math.round(c.fit * 100)} %</span>
            </li>
          ))}
        </ul>
        <p className="mq-crit-note">Score = moyenne de ces critères, pondérée par leur importance.</p>
      </div>
    </div>
  );
}

function Notes({ result }: { result: MatchResult }) {
  return (
    <ul className="mq-notes">
      {result.reasons.map((r) => (
        <li key={r}><Check size={15} strokeWidth={2.5} className="mq-ok" aria-hidden="true" />{r}</li>
      ))}
      {result.warnings.map((w) => (
        <li key={w} className="mq-warn"><AlertTriangle size={15} strokeWidth={2.25} aria-hidden="true" />{w}</li>
      ))}
    </ul>
  );
}

function Price({ result, a }: { result: MatchResult; a: MatcherAnswers }) {
  const { price } = result;
  if (a.budgetType === "lease") {
    const kind = { social: "Leasing social", official: "Loyer constructeur", estimate: "Estimation, environ 0,9 % du prix par mois" }[price.monthlyKind];
    return (
      <div className="mq-price">
        <span className="mq-price-label">Loyer</span>
        <b>{fmt(price.monthly)} €<small>/mois</small></b>
        <span className="mq-price-sub">{kind}</span>
      </div>
    );
  }
  return (
    <div className="mq-price">
      <span className="mq-price-label">{price.cee ? "Après prime CEE" : "Prix"}</span>
      <b>{fmt(price.net)} €</b>
      <span className="mq-price-sub">
        {price.cee ? <>Catalogue {fmt(price.catalog)} €, prime {fmt(price.cee)} €</> : "Pas de prime CEE pour ce modèle"}
      </span>
    </div>
  );
}

function Actions({ result, a, compact = false }: { result: MatchResult; a: MatcherAnswers; compact?: boolean }) {
  const { vehicle, config } = result;
  const yearlyKm = Math.round((a.dailyKm * 230 + (a.longTrips === "often" ? 6000 : a.longTrips === "few" ? 2500 : 500)) / 1000) * 1000;
  return (
    <div className="mq-actions" data-compact={compact || undefined}>
      <a href={url(`/vehicules/${vehicle.slug}/`)} className="btn btn-primary btn-sm">
        Voir la fiche <ArrowRight size={15} strokeWidth={2.25} className="btn-arrow" aria-hidden="true" />
      </a>
      <a href={url(`/comparer/?v=${vehicle.slug}:${config.id}:100`)} className="btn btn-secondary btn-sm">Comparer</a>
      {!compact && (
        <a href={url(`/simulateur/rapport-premium/?v=${vehicle.slug}&config=${config.id}&km=${yearlyKm}`)} className="mq-link">
          Coût complet sur 5 ans <ArrowUpRight size={14} strokeWidth={2.25} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function RangeLine({ result, a, scale }: { result: MatchResult; a: MatcherAnswers; scale: number }) {
  const { range } = result;
  const need = a.dailyKm * 5;
  return (
    <div className="mq-range">
      <Rail real={range.real} wltp={range.wltp} winter={range.winter} scale={scale} need={need} />
      <p>
        <b data-fit={range.winter >= need ? "1" : "0"}>{range.days} {range.days > 1 ? "jours" : "jour"}</b> de trajet en hiver · {fmt(range.real)} km réels · {fmt(range.wltp)} km annoncés
      </p>
    </div>
  );
}

function TopCard({ result, rank, a, images, scale }: { result: MatchResult; rank: number; a: MatcherAnswers; images: VehicleImages; scale: number }) {
  const [open, setOpen] = useState(false);
  const { vehicle, config } = result;
  const version = config.label.replace(vehicle.model, "").replace(/^[\s·]+/, "").trim() || config.label;
  return (
    <article className="mq-card" style={{ "--i": rank } as React.CSSProperties}>
      <div className="mq-card-photo stage">
        <span className="mq-rank" data-first={rank === 0 || undefined}>{rank + 1}</span>
        <Photo slug={vehicle.slug} alt={`${vehicle.brand} ${vehicle.model}`} images={images} sizes="(min-width: 1024px) 240px, 80vw" />
      </div>
      <div className="mq-card-body">
        <div className="mq-card-head">
          <div>
            <p className="mq-brand">{vehicle.brand}</p>
            <h3 className="mq-model">{vehicle.model}</h3>
            <p className="mq-version">{version}</p>
          </div>
          <button type="button" className="mq-score" aria-expanded={open} onClick={() => setOpen(!open)}>
            <b>{result.score} %</b> adapté
            <ChevronDown size={15} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
        <Breakdown result={result} open={open} />
        <RangeLine result={result} a={a} scale={scale} />
        <Notes result={result} />
      </div>
      <div className="mq-card-side">
        <Price result={result} a={a} />
        <Actions result={result} a={a} />
      </div>
    </article>
  );
}

function Row({ result, a, images, scale }: { result: MatchResult; a: MatcherAnswers; images: VehicleImages; scale: number }) {
  const [open, setOpen] = useState(false);
  const { vehicle, config, price } = result;
  const version = config.label.replace(vehicle.model, "").replace(/^[\s·]+/, "").trim() || config.label;
  return (
    <li className="mq-row" data-open={open || undefined}>
      <button type="button" className="mq-row-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="mq-row-photo"><Photo slug={vehicle.slug} alt="" images={images} sizes="96px" /></span>
        <span className="mq-row-name">
          <b>{vehicle.brand} {vehicle.model}</b>
          <span>{version}</span>
        </span>
        <span className="mq-row-score">{result.score} %</span>
        <span className="mq-row-price">{a.budgetType === "buy" ? `${fmt(price.net)} €` : `${fmt(price.monthly)} €/mois`}</span>
        <ChevronDown size={16} strokeWidth={2.25} className="mq-chevron" aria-hidden="true" />
      </button>
      <div className="mq-reveal" data-open={open || undefined}>
        <div>
          <div className="mq-row-detail">
            <RangeLine result={result} a={a} scale={scale} />
            <Notes result={result} />
            <Actions result={result} a={a} compact />
          </div>
        </div>
      </div>
    </li>
  );
}

export default function MatcherResults({ results, answers: a, vehicleCount, images, showAll, setShowAll, onEdit, restart, setAnswers }: Props) {
  const [limit, setLimit] = useState(PAGE);
  const top = results.slice(0, TOP);
  const others = results.slice(TOP);
  const shown = others.slice(0, limit);
  const scale = Math.ceil(Math.max(400, ...results.slice(0, TOP + limit).map((r) => r.range.wltp)) / 100) * 100;
  const compareUrl = url(`/comparer/?v=${top.map((r) => `${r.vehicle.slug}:${r.config.id}:100`).join(",")}`);

  const raiseBudget = () => {
    const range = BUDGET_RANGE[a.budgetType];
    setAnswers((prev) => ({ ...prev, budgetMax: Math.min(range.max, prev.budgetMax + range.step * 2) }));
  };

  return (
    <div className="mq-results">
      <header className="mq-results-head">
        <div>
          <h2 className="display-2">{top.length ? "Vos meilleurs choix" : "Aucun modèle ne colle"}</h2>
          <p className="mq-results-sub">
            {results.length
              ? <><b>{results.length}</b> {results.length > 1 ? "modèles conviennent" : "modèle convient"} à vos réponses, sur {vehicleCount} au catalogue.</>
              : "Aucun modèle du catalogue ne remplit à la fois votre budget et vos besoins."}
          </p>
        </div>
        <div className="mq-results-actions">
          {top.length >= 2 && <a href={compareUrl} className="btn btn-primary btn-sm">Comparer ces {top.length}</a>}
          <button type="button" className="btn btn-secondary btn-sm" onClick={restart}>
            <RotateCcw size={14} strokeWidth={2.25} aria-hidden="true" /> Recommencer
          </button>
        </div>
      </header>

      <ul className="mq-chips" aria-label="Vos réponses">
        {summary(a).map((text, i) => (
          <li key={STEPS[i]}>
            <button type="button" className="mq-chip" onClick={() => onEdit(i)} aria-label={`Modifier : ${text}`}>
              {text} <Pencil size={12} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {top.length === 0 ? (
        <div className="mq-empty">
          <p>Le plus souvent, c'est le budget qui bloque : les grands formats et les longues autonomies coûtent cher.</p>
          <div className="mq-results-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={raiseBudget}>
              {a.budgetType === "buy" ? "Ajouter 5 000 € au budget" : "Ajouter 50 € au loyer"}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(3)}>Changer de format</button>
          </div>
        </div>
      ) : (
        <div className="mq-top">
          {top.map((r, i) => <TopCard key={r.vehicle.slug} result={r} rank={i} a={a} images={images} scale={scale} />)}
        </div>
      )}

      {others.length > 0 && (
        <section className="mq-others">
          <button type="button" className="mq-others-toggle" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
            <span>Les {others.length} autres modèles qui conviennent</span>
            <ChevronDown size={18} strokeWidth={2.25} aria-hidden="true" />
          </button>
          <div className="mq-reveal" data-open={showAll || undefined}>
            <div>
              <ul className="mq-rows">
                {shown.map((r) => <Row key={r.vehicle.slug} result={r} a={a} images={images} scale={scale} />)}
              </ul>
              {others.length > limit && (
                <button type="button" className="btn btn-secondary btn-sm mq-more" onClick={() => setLimit(limit + PAGE)}>
                  Afficher {Math.min(PAGE, others.length - limit)} de plus
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <p className="mq-footnote">
        La règle montre l'autonomie en hiver (-5 °C), l'autonomie réelle et les kilomètres annoncés ; le trait marque votre semaine de trajet.
        Prix après prime CEE : montant minimal, sauf si vous avez indiqué un revenu de 16 300 € ou moins par part. Montants indicatifs.{" "}
        <a href={url("/methodologie/")}>Notre méthode</a>
      </p>
    </div>
  );
}
