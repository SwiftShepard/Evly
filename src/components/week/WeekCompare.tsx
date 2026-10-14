/**
 * Plusieurs modèles, la même semaine : une ligne par modèle dans la barre du bas de la carte
 * (batterie jour par jour en mini-jauges, verdict, électricité et économie sur un an). Les jours
 * se choisissent pour tous à la fois ; la lecture anime le premier modèle, celui de la carte.
 */
import { Pause, Play } from "lucide-react";
import { DAYS, DAYS_SHORT, type WeekResult } from "@/lib/map/week";
import { RESERVE } from "@/lib/map/energy";
import { formatNumber } from "@/lib/format";

export interface CompareRow {
  key: string;
  name: string;
  color: string;
  week: WeekResult | null;
  verdict: string;
  warn: boolean;
  /** Électricité et économie face à l'essence, sur un an (€) */
  elecYear: number | null;
  savedYear: number | null;
}

interface Props {
  rows: CompareRow[];
  active: number | null;
  /** Niveau du jour en cours pendant la lecture (premier modèle) */
  live: number | null;
  playing: boolean;
  onSelect: (day: number | null) => void;
  onPlay: () => void;
  onStop: () => void;
}

const eur = (n: number) => `${formatNumber(Math.round(n))} €`;
const pct = (v: number) => `${Math.round(Math.max(0, v) * 100)} %`;

export default function WeekCompare({ rows, active, live, playing, onSelect, onPlay, onStop }: Props) {
  return (
    <div className="week-cmp" role="table" aria-label="Les modèles comparés, même semaine">
      <div className="week-cmp-row week-cmp-head" role="row">
        <button type="button" className="week-play week-play-sm" onClick={playing ? onStop : onPlay} aria-label={playing ? "Arrêter la semaine" : "Lancer la semaine"}>
          {playing ? <Pause size={15} strokeWidth={2.4} /> : <Play size={15} strokeWidth={2.4} />}
        </button>
        <span className="week-cmp-days" role="columnheader">
          {DAYS_SHORT.map((d, i) => (
            <button key={i} type="button" aria-pressed={active === i} aria-label={DAYS[i]} onClick={() => onSelect(active === i ? null : i)}>
              {d}
            </button>
          ))}
        </span>
        <span role="columnheader">Recharges</span>
        <span role="columnheader" className="week-cmp-num">Électricité / an</span>
        <span role="columnheader" className="week-cmp-num">Économie / an</span>
      </div>
      {rows.map((r, k) => (
        <div key={r.key} className="week-cmp-row" role="row">
          <span className="week-cmp-name" role="rowheader">
            <i className="week-dot" style={{ background: r.color }} aria-hidden="true" />
            <span className="truncate">{r.name}</span>
          </span>
          <span className="week-cmp-days" role="cell" aria-label={r.week ? r.week.days.map((d, i) => `${DAYS[i]} ${pct(d.end)}`).join(", ") : "Calcul…"}>
            {r.week?.days.map((d, i) => {
              const level = playing && k === 0 && active === i && live !== null ? live : d.end;
              return (
                <span key={i} className="week-gauge week-gauge-sm" data-active={active === i ? "1" : undefined} data-low={d.low < RESERVE ? "1" : undefined} style={{ "--start": d.start, "--level": Math.max(0, level) } as React.CSSProperties} aria-hidden="true">
                  <span className="week-gauge-start" />
                  <span className="week-gauge-level" />
                </span>
              );
            })}
          </span>
          <span role="cell" className="week-cmp-verdict" data-warn={r.warn ? "1" : undefined}>{r.week ? r.verdict : "…"}</span>
          <b role="cell" className="week-cmp-num tabular">{r.elecYear !== null ? eur(r.elecYear) : "…"}</b>
          <b role="cell" className="week-cmp-num tabular">{r.savedYear !== null && r.savedYear > 0 ? <span className="week-cost-saved">{eur(r.savedYear)}</span> : "…"}</b>
        </div>
      ))}
    </div>
  );
}
