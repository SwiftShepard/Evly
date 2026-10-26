import type { APIRoute } from "astro";
import { BRAND_MIN_MODELS, DATA_LICENSE, getBrandGaps, getObservatoryFacts } from "@/lib/observatory";

/**
 * Graphique de l'observatoire prêt à reprendre (articles, forums) : écart médian entre l'annonce
 * WLTP et l'autonomie mesurée, par marque. SVG autonome (polices système), source et licence
 * écrites dans l'image pour qu'elles la suivent partout.
 */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (x: number) => String(Math.round(x));

export const GET: APIRoute = () => {
  const brands = getBrandGaps();
  const { medianGapPct, measuredModels } = getObservatoryFacts();
  const W = 960;
  const PAD = 40;
  const LABEL = 170;
  const VALUE = 180;
  const ROW = 30;
  const TOP = 128;
  const barW = W - PAD * 2 - LABEL - VALUE;
  const scale = Math.ceil(Math.max(...brands.map((b) => b.medianPct), 1) / 10) * 10;
  const H = TOP + brands.length * ROW + 86;
  const x = (pct: number) => PAD + LABEL + (Math.max(0, pct) / scale) * barW;
  const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  const rows = brands
    .map((b, i) => {
      const y = TOP + i * ROW;
      return `<text x="${PAD}" y="${y + 15}" class="b">${esc(b.brand)}</text>
  <rect x="${PAD + LABEL}" y="${y + 5}" width="${barW}" height="12" rx="6" fill="#e4e9d8"/>
  <rect x="${PAD + LABEL}" y="${y + 5}" width="${Math.max(12, x(b.medianPct) - PAD - LABEL)}" height="12" rx="6" fill="#3a5c12"/>
  <text x="${W - PAD - VALUE + 14}" y="${y + 15}" class="v">-${n(b.medianPct)} %</text>
  <text x="${W - PAD}" y="${y + 15}" class="m" text-anchor="end">${b.models.length} modèles</text>`;
    })
    .join("\n  ");

  const mx = x(medianGapPct);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
  <title id="t">Écart entre l'autonomie annoncée (WLTP) et l'autonomie mesurée, par marque</title>
  <desc id="d">Écart médian par marque sur les modèles essayés sur route (au moins ${BRAND_MIN_MODELS} par marque). Source : Evly, ev-ly.com/observatoire/, licence ${DATA_LICENSE.name}.</desc>
  <style>
    text { font-family: "Geist", "Inter", "Helvetica Neue", Arial, sans-serif; fill: #17200f; }
    .h { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .s { font-size: 15px; fill: #4a5442; }
    .b { font-size: 15px; font-weight: 600; }
    .v { font-size: 15px; font-weight: 700; }
    .m, .f { font-size: 12.5px; fill: #5d6754; }
  </style>
  <rect width="${W}" height="${H}" fill="#fafbf6"/>
  <text x="${PAD}" y="56" class="h">Qui annonce le plus large ?</text>
  <text x="${PAD}" y="84" class="s">Écart médian entre l'autonomie WLTP et l'autonomie mesurée sur route, par marque (${measuredModels} modèles essayés)</text>
  <line x1="${mx}" y1="${TOP - 10}" x2="${mx}" y2="${TOP + brands.length * ROW}" stroke="#17200f" stroke-width="1.5" stroke-dasharray="3 4" opacity="0.6"/>
  <text x="${mx}" y="${TOP - 16}" class="m" text-anchor="middle">médiane -${n(medianGapPct)} %</text>
  ${rows}
  <text x="${PAD}" y="${H - 34}" class="f">Mixte = moyenne des essais à 90 et 120 km/h (Bjørn Nyland, presse). Marques d'au moins ${BRAND_MIN_MODELS} modèles mesurés, au ${esc(date)}.</text>
  <text x="${PAD}" y="${H - 14}" class="f">Source : Evly, observatoire de l'autonomie réelle (ev-ly.com/observatoire/) · licence ${DATA_LICENSE.name}</text>
</svg>
`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
};
