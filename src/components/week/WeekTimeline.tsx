/**
 * Frise de la semaine : une jauge de batterie par jour (niveau du matin en
 * fantôme, niveau du soir plein), les recharges, et la lecture animée.
 */
import { Pause, Play, PlugZap } from "lucide-react";
import { DAYS, DAYS_SHORT, type DayResult } from "@/lib/map/week";
import { RESERVE } from "@/lib/map/energy";

interface Props {
  days: DayResult[];
  active: number | null;
  /** Niveau affiché pendant la lecture pour le jour en cours */
  live: number | null;
  playing: boolean;
  onSelect: (day: number | null) => void;
  onPlay: () => void;
  onStop: () => void;
}

const pct = (v: number) => `${Math.round(Math.max(0, v) * 100)} %`;

export default function WeekTimeline({ days, active, live, playing, onSelect, onPlay, onStop }: Props) {
  return (
    <div className="week-timeline" role="group" aria-label="Batterie jour par jour">
      <button
        type="button"
        className="week-play"
        onClick={playing ? onStop : onPlay}
        aria-label={playing ? "Arrêter la semaine" : "Lancer la semaine"}
      >
        {playing ? <Pause size={18} strokeWidth={2.4} /> : <Play size={18} strokeWidth={2.4} />}
      </button>
      <ol className="week-days">
        {days.map((d, i) => {
          const level = playing && active === i && live !== null ? live : d.end;
          const low = d.low < RESERVE;
          // Une voiture à sec ne reçoit jamais plus qu'une batterie pleine en une journée
          const added = Math.min(1, d.charges.reduce((sum, c) => sum + c.added, 0));
          return (
            <li key={i}>
              <button
                type="button"
                className="week-day"
                aria-pressed={active === i}
                data-low={low ? "1" : undefined}
                onClick={() => onSelect(active === i ? null : i)}
                aria-label={`${DAYS[i]} : ${pct(d.start)} le matin, ${pct(d.end)} le soir${added > 0.005 ? `, recharge de ${pct(added)}` : ""}`}
              >
                <span className="week-day-name" aria-hidden="true">
                  <span className="md:hidden">{DAYS_SHORT[i]}</span>
                  <span className="hidden md:inline">{DAYS[i]!.slice(0, 3)}</span>
                </span>
                <span className="week-gauge" aria-hidden="true" style={{ "--start": d.start, "--level": Math.max(0, level) } as React.CSSProperties}>
                  <span className="week-gauge-start" />
                  <span className="week-gauge-level" />
                </span>
                <span className="week-day-pct tabular" aria-hidden="true">{pct(level)}</span>
                {added > 0.005 && (
                  <span className="week-day-charge" aria-hidden="true">
                    <PlugZap size={11} strokeWidth={2.4} />+{Math.round(added * 100)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
