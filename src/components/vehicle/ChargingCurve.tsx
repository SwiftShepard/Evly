import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { ChargingCurvePoint } from "@/data/schemas";
import { formatNumber } from "@/lib/format";

interface Props {
  curve: ChargingCurvePoint[];
  peakPower_kW: number;
  vehicleName: string;
  /** Temps 10 → 80 % de la version, écrit sous la plage correspondante de la règle */
  time_10_80_min?: number | null;
}

/**
 * Courbe de charge rapide dans le langage de la règle : la puissance au-dessus d'une règle
 * de niveau de batterie (0 → 100 %) dont la plage 10 → 80 % est teintée comme l'autonomie
 * réelle. Le relevé en tête suit le pointeur (ou les flèches du clavier) en place, sans bulle.
 * SVG sans dépendance : remplace Chart.js (roadmap L10).
 */

/** Pentes d'une interpolation cubique monotone (Fritsch-Carlson) : la courbe ne dépasse jamais les relevés */
function monotoneSlopes(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  const d = xs.slice(0, -1).map((x, i) => (ys[i + 1]! - ys[i]!) / (xs[i + 1]! - x));
  const m = xs.map((_, i) => (i === 0 ? d[0]! : i === n - 1 ? d[n - 2]! : d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / d[i]!;
    const b = m[i + 1]! / d[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i]!;
      m[i + 1] = t * b * d[i]!;
    }
  }
  return m;
}

function niceScale(top: number) {
  const step = [10, 20, 25, 50, 100].find((s) => top / s <= 4) ?? 100;
  const max = Math.ceil((top * 1.08) / step) * step;
  return { step, max };
}

export default function ChargingCurve({ curve, peakPower_kW, vehicleName, time_10_80_min }: Props) {
  // Relevés triés, un seul par niveau de batterie
  const points = useMemo(() => {
    const bySoc = new Map<number, number>();
    for (const p of curve) bySoc.set(p.soc, Math.max(p.power, bySoc.get(p.soc) ?? 0));
    return [...bySoc].sort((a, b) => a[0] - b[0]).map(([soc, power]) => ({ soc, power }));
  }, [curve]);

  const model = useMemo(() => {
    if (points.length < 2) return null;
    const xs = points.map((p) => p.soc);
    const ys = points.map((p) => p.power);
    const top = Math.max(peakPower_kW, ...ys);
    if (top <= 0) return null;
    const { step, max } = niceScale(top);
    const m = monotoneSlopes(xs, ys);
    const Y = (kw: number) => 100 - (kw / max) * 100;
    let line = `M${xs[0]},${Y(ys[0]!)}`;
    for (let i = 0; i < xs.length - 1; i++) {
      const h = xs[i + 1]! - xs[i]!;
      line += ` C${xs[i]! + h / 3},${Y(ys[i]! + (m[i]! * h) / 3)} ${xs[i + 1]! - h / 3},${Y(ys[i + 1]! - (m[i + 1]! * h) / 3)} ${xs[i + 1]},${Y(ys[i + 1]!)}`;
    }
    const area = `${line} L${xs.at(-1)},100 L${xs[0]},100 Z`;
    const powerAt = (soc: number) => {
      const x = Math.min(Math.max(soc, xs[0]!), xs.at(-1)!);
      let i = xs.findIndex((v, k) => k < xs.length - 1 && x <= xs[k + 1]!);
      if (i < 0) i = xs.length - 2;
      const h = xs[i + 1]! - xs[i]!;
      const t = (x - xs[i]!) / h;
      const t2 = t * t;
      const t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i]! + (t3 - 2 * t2 + t) * h * m[i]! + (-2 * t3 + 3 * t2) * ys[i + 1]! + (t3 - t2) * h * m[i + 1]!;
    };
    const peak = points.reduce((best, p) => (p.power > best.power ? p : best));
    const grid = Array.from({ length: Math.round(max / step) }, (_, k) => (k + 1) * step);
    return { line, area, powerAt, peak, grid, max, minSoc: xs[0]!, maxSoc: xs.at(-1)! };
  }, [points, peakPower_kW]);

  const [soc, setSoc] = useState<number | null>(null);

  if (!model) {
    return <p className="text-[var(--color-text-faint)] font-mono text-xs mt-2">Courbe de charge non mesurée.</p>;
  }

  const { peak, max, minSoc, maxSoc } = model;
  const active = soc !== null;
  const cursorSoc = soc ?? peak.soc;
  const cursorPower = active ? Math.round(model.powerAt(cursorSoc)) : peak.power;

  const socFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const v = Math.round(((e.clientX - r.left) / r.width) * 100);
    return Math.min(Math.max(v, minSoc), maxSoc);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = soc ?? peak.soc;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? from + 5 :
      e.key === "ArrowLeft" || e.key === "ArrowDown" ? from - 5 :
      e.key === "Home" ? minSoc :
      e.key === "End" ? maxSoc : null;
    if (next === null) return;
    e.preventDefault();
    setSoc(Math.min(Math.max(next, minSoc), maxSoc));
  };

  // Résumé lu par les lecteurs d'écran, tiré des relevés (pas d'allure supposée)
  const at80 = points.find((p) => p.soc >= 80);
  const summary =
    `Courbe de charge rapide du ${vehicleName} selon le niveau de batterie : pic à ${peak.power} kW vers ${peak.soc} %` +
    (at80 ? `, ${at80.power} kW à ${at80.soc} %.` : ".");

  const style = {
    "--x": cursorSoc,
    "--y": cursorPower / max,
    "--from": minSoc,
    "--to": maxSoc,
  } as React.CSSProperties;

  return (
    <figure className="curve" style={style}>
      <p className="sr-only">{summary}</p>
      <figcaption className="curve-readout" aria-hidden="true">
        <span className="curve-readout-value">
          <b data-numeric>{cursorPower}</b> kW
          <span>{active ? `à ${cursorSoc} %` : `au plus fort, vers ${peak.soc} %`}</span>
        </span>
        {time_10_80_min ? (
          <span className="curve-readout-span">
            10 → 80 % en <b data-numeric>{time_10_80_min}</b> min
          </span>
        ) : null}
      </figcaption>

      <div
        className="curve-plot"
        data-active={active || undefined}
        role="slider"
        tabIndex={0}
        aria-label="Puissance de charge selon le niveau de batterie"
        aria-valuemin={minSoc}
        aria-valuemax={maxSoc}
        aria-valuenow={cursorSoc}
        aria-valuetext={`${cursorSoc} % : ${cursorPower} kW`}
        onPointerMove={(e) => setSoc(socFromPointer(e))}
        onPointerDown={(e) => setSoc(socFromPointer(e))}
        onPointerLeave={(e) => e.pointerType === "mouse" && setSoc(null)}
        onBlur={() => setSoc(null)}
        onKeyDown={onKey}
      >
        <div className="curve-grid" aria-hidden="true">
          {model.grid.map((kw) => (
            <span key={kw} style={{ "--g": kw / max } as React.CSSProperties}>
              <b>{formatNumber(kw)} kW</b>
            </span>
          ))}
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="curve-area" d={model.area} />
          <path className="curve-line" d={model.line} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="curve-cursor" aria-hidden="true">
          <i />
        </span>
      </div>

      <div className="curve-rule" aria-hidden="true">
        <div className="curve-rule-bar">
          <span className="curve-rule-span" />
        </div>
        <div className="curve-rule-ticks">
          {[0, 20, 40, 60, 80, 100].map((t) => (
            <span key={t} style={{ "--t": t } as React.CSSProperties}>
              {t} %
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
