/**
 * Courbes de dépense cumulée des pages « Électrique ou essence » : l'achat (prime déduite), puis
 * chaque année l'énergie, l'entretien et l'assurance (lib/tco). La revente n'y est pas : elle arrive
 * à la fin et se lit dans le total. Géométrie SVG pure, partagée par le rendu au build et le
 * curseur des kilomètres dans le navigateur.
 */

export interface CurveInput {
  evNet: number;
  icePrice: number;
  /** Dépense de chaque année d'usage */
  evYear: number;
  iceYear: number;
}

export const CURVE = { w: 640, h: 250, l: 46, t: 16, b: 30, years: 10 };
/** Marge droite des étiquettes de fin, plus étroite sur téléphone */
const rightOf = (w: number) => (w < 480 ? 84 : 132);

const STEPS = [2_000, 5_000, 10_000, 20_000, 25_000, 50_000];

/** `w` : largeur réelle du tracé en pixels (une unité SVG = un pixel, le texte garde sa taille) */
export function costCurve(i: CurveInput, w: number = CURVE.w) {
  const { h, l, t, b, years } = CURVE;
  const r = rightOf(w);
  const at = (n: number) => ({ ev: i.evNet + n * i.evYear, ice: i.icePrice + n * i.iceYear });
  const end = at(years);
  const top = Math.max(end.ev, end.ice, i.evNet, i.icePrice);
  const step = STEPS.find((s) => top / s <= 5) ?? 100_000;
  const yMax = Math.ceil(top / step) * step;
  const x = (n: number) => l + (n / years) * (w - l - r);
  const y = (v: number) => t + (1 - v / yMax) * (h - t - b);
  const path = (k: "ev" | "ice") => `M${x(0).toFixed(1)} ${y(at(0)[k]).toFixed(1)}L${x(years).toFixed(1)} ${y(end[k]).toFixed(1)}`;
  // Croisement : l'année où l'écart d'achat est rattrapé à l'usage
  const gap = i.evNet - i.icePrice;
  const saving = i.iceYear - i.evYear;
  const crossYear = gap > 0 && saving > 0 && gap / saving <= years ? gap / saving : null;
  // Étiquettes de fin écartées d'au moins 30 px, reliées à leur ligne
  let evLabel = y(end.ev);
  let iceLabel = y(end.ice);
  const MIN = 30;
  if (Math.abs(evLabel - iceLabel) < MIN) {
    const mid = (evLabel + iceLabel) / 2;
    const up = evLabel <= iceLabel ? -1 : 1;
    evLabel = mid + (up * MIN) / 2;
    iceLabel = mid - (up * MIN) / 2;
  }
  return {
    w,
    r,
    yMax,
    yTicks: Array.from({ length: Math.round(yMax / step) + 1 }, (_, k) => ({ y: y(k * step), value: k * step })),
    // Sur téléphone, trois repères au lieu de six : les étiquettes ne se touchent pas
    xTicks: (w < 480 ? [0, 5, 10] : [0, 2, 4, 6, 8, 10]).map((n) => ({ x: x(n), n })),
    evPath: path("ev"),
    icePath: path("ice"),
    evEnd: { x: x(years), y: y(end.ev), label: evLabel, value: end.ev },
    iceEnd: { x: x(years), y: y(end.ice), label: iceLabel, value: end.ice },
    cross: crossYear !== null ? { x: x(crossYear), y: y(at(crossYear).ev), year: crossYear } : null,
    x,
    y,
    at,
  };
}

export type Curve = ReturnType<typeof costCurve>;

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
/** « 41 200 € » avec des espaces insécables visibles (l'espace fine de fr-FR ne l'est presque pas) */
export const curveEur = (v: number) => `${nf.format(Math.round(v)).replace(/ /g, " ")} €`;
const kEur = (v: number) => (v === 0 ? "0" : `${nf.format(v / 1000)} k€`);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const f = (n: number) => n.toFixed(1);

/**
 * Le tracé en SVG (même balisage au build et dans le navigateur) : grille, axes, les deux droites,
 * le point de croisement, les étiquettes de fin et le réticule du survol, masqué au départ.
 */
export function curveSvg(c: Curve, names: { ev: string; ice: string }): string {
  const { h, t, b, l } = CURVE;
  const right = c.w - c.r;
  const out: string[] = [];
  for (const tk of c.yTicks) out.push(`<line class="cc-grid" x1="${l}" x2="${f(right)}" y1="${f(tk.y)}" y2="${f(tk.y)}"/><text class="cc-ty" x="${l - 8}" y="${f(tk.y + 4)}" text-anchor="end">${kEur(tk.value)}</text>`);
  for (const tk of c.xTicks) out.push(`<text class="cc-tx" x="${f(tk.x)}" y="${h - 8}" text-anchor="middle">${tk.n === 0 ? "achat" : `${tk.n} ans`}</text>`);
  out.push(`<line class="cc-hair" x1="0" x2="0" y1="${t}" y2="${h - b}" visibility="hidden"/>`);
  out.push(`<path class="cc-ice" d="${c.icePath}"/><path class="cc-ev" d="${c.evPath}"/>`);
  if (c.cross) {
    const n = Math.ceil(c.cross.year);
    const tx = Math.min(Math.max(c.cross.x, l + 50), right - 50);
    out.push(`<circle class="cc-cross" cx="${f(c.cross.x)}" cy="${f(c.cross.y)}" r="5"/><text class="cc-cross-text" x="${f(tx)}" y="${f(c.cross.y - 14)}" text-anchor="middle">achat rattrapé en ${n} an${n > 1 ? "s" : ""}</text>`);
  }
  for (const [k, e, name] of [["ice", c.iceEnd, names.ice], ["ev", c.evEnd, names.ev]] as const) {
    const lx = e.x + 14;
    if (Math.abs(e.label - e.y) > 1) out.push(`<line class="cc-leader" x1="${f(e.x + 6)}" y1="${f(e.y)}" x2="${f(lx - 3)}" y2="${f(e.label)}"/>`);
    out.push(`<circle class="cc-dot cc-dot-${k}" cx="${f(e.x)}" cy="${f(e.y)}" r="4.5"/>`);
    out.push(`<text class="cc-end" x="${f(lx)}" y="${f(e.label - 3)}"><tspan class="cc-end-name">${esc(name)}</tspan><tspan class="cc-end-value" x="${f(lx)}" dy="15">${curveEur(e.value)}</tspan></text>`);
  }
  out.push(`<circle class="cc-hover cc-dot-ice" r="4.5" visibility="hidden"/><circle class="cc-hover cc-dot-ev" r="4.5" visibility="hidden"/>`);
  return `<svg viewBox="0 0 ${c.w} ${h}" width="${c.w}" height="${h}" aria-hidden="true" focusable="false">${out.join("")}</svg>`;
}

/** Année visée par le pointeur ou les flèches du clavier (0 à 10) */
export const yearAt = (c: Curve, px: number) => Math.max(0, Math.min(CURVE.years, Math.round(((px - CURVE.l) / (c.w - c.r - CURVE.l)) * CURVE.years)));
