/**
 * Veille des aides. Chaque lundi, l'Action « Veille des aides » (.github/workflows/aids-watch.yml)
 * compare les fiches officielles de Service-Public à leur état relu (scripts/aids-watch.json) et
 * vérifie l'âge du barème codé dans src/lib/cee.ts. Elle n'écrit rien dans le dépôt : s'il y a
 * quelque chose à relire, elle ouvre une issue (ou la complète si le constat a changé).
 *
 * Ce qui est comparé sur chaque fiche : la mention « Vérifié le … » et l'ensemble des montants en
 * euros et des dates du texte. Un plafond de revenu, un montant ou une date limite qui bouge se
 * voit ; une reformulation sans chiffre ne déclenche rien.
 *
 *   node scripts/aids-watch.mjs                  compte rendu dans le terminal
 *   node scripts/aids-watch.mjs --out report.md  écrit le compte rendu seulement s'il y a à relire
 *   node scripts/aids-watch.mjs --update         après relecture (et mise à jour de cee.ts),
 *                                                enregistre l'état actuel des fiches
 */
import fs from "node:fs";

const STATE = "scripts/aids-watch.json";
const CEE = "src/lib/cee.ts";
/** Âge au-delà duquel les montants du barème sont à relever de nouveau (3 mois) */
const MAX_AGE_DAYS = 92;
/** Préavis avant la fin d'une catégorie datée (gros rouleur) */
const NOTICE_DAYS = 45;

const SOURCES = [
  { id: "cee", label: "Prime coup de pouce (Service-Public)", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F39188" },
  { id: "leasing", label: "Leasing social (Service-Public)", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F39280" },
];

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const out = outIdx >= 0 ? args[outIdx + 1] : null;
const update = args.includes("--update");

const MONTHS = "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre";
const frDateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const frDate = { format: (d) => frDateFmt.format(d).replace(/^1 /, "1er ") };
const today = new Date();
const daysBetween = (a, b) => Math.floor((b - a) / 86_400_000);

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/&euro;/g, "€")
    .replace(/&rsquo;/g, "’")
    .replace(/&amp;/g, "&");
}

/** Texte de la fiche : « Vérifié le … » et montants et dates, triés, sans doublon */
async function readSource(src) {
  const res = await fetch(src.url, { headers: { "user-agent": "EvlyAidsWatch/1.0 (+https://ev-ly.com)", "accept-language": "fr-FR" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0];
  if (!main) throw new Error("page sans contenu principal (<main>)");
  let text = decode(main.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<sup>\s*(er|re)\s*<\/sup>/gi, "$1").replace(/<[^>]+>/g, " ")).replace(/[\s  ]+/g, " ");
  const verified = text.match(new RegExp(`Vérifié le (\\d{1,2}(?:er)? (?:${MONTHS}) \\d{4})`))?.[1] ?? null;
  if (verified) text = text.replace(`Vérifié le ${verified}`, " ");
  const facts = text.match(new RegExp(`\\d{1,3}(?: \\d{3})*(?:,\\d+)? ?€|\\d{1,2}(?:er)? (?:${MONTHS}) \\d{4}`, "g")) ?? [];
  return { verified, facts: [...new Set(facts)].sort((a, b) => a.localeCompare(b, "fr")) };
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch {
    return { reviewed: null, sources: {} };
  }
}

const state = readState();
const lines = [];
const current = {};

for (const src of SOURCES) {
  let now;
  try {
    now = await readSource(src);
  } catch (e) {
    lines.push(`- **${src.label}** : fiche injoignable (${e.message}). La relire à la main : ${src.url}`);
    continue;
  }
  current[src.id] = now;
  const seen = state.sources?.[src.id];
  if (!seen) {
    lines.push(`- **${src.label}** : jamais relue. ${src.url}`);
    continue;
  }
  const added = now.facts.filter((f) => !seen.facts.includes(f));
  const removed = seen.facts.filter((f) => !now.facts.includes(f));
  if (added.length || removed.length) {
    const parts = [];
    if (added.length) parts.push(`nouveaux chiffres ou dates : ${added.join(", ")}`);
    if (removed.length) parts.push(`disparus : ${removed.join(", ")}`);
    lines.push(`- **${src.label}** : le texte a changé (${parts.join(" ; ")}). Fiche vérifiée le ${now.verified ?? "?"}. ${src.url}`);
  } else if (now.verified !== seen.verified) {
    lines.push(`- **${src.label}** : revérifiée le ${now.verified ?? "?"} (relue au ${seen.verified ?? "?"}), sans chiffre ni date changés. ${src.url}`);
  }
}

// Âge du barème et catégories datées, lus dans src/lib/cee.ts
const cee = fs.readFileSync(CEE, "utf8");
const checked = cee.match(/CEE_GRID_CHECKED = "(\d{4}-\d{2}-\d{2})"/)?.[1];
if (!checked) {
  lines.push("- **Barème CEE** : `CEE_GRID_CHECKED` introuvable dans src/lib/cee.ts.");
} else if (daysBetween(new Date(`${checked}T12:00:00+01:00`), today) > MAX_AGE_DAYS) {
  lines.push(`- **Barème CEE** : montants relevés le ${frDate.format(new Date(`${checked}T12:00:00+01:00`))}, il y a plus de 3 mois. Relever l'offre de référence, mettre à jour \`PRIME_GRID\`, \`CEE_GRID_LABEL\` et \`CEE_GRID_CHECKED\` (compétence evly-donnees-datees).`);
}
const until = cee.match(/GROS_ROULEUR_UNTIL = new Date\("([^"]+)"\)/)?.[1];
if (until) {
  const end = new Date(until);
  const left = daysBetween(today, end);
  if (left < 0) lines.push(`- **Gros rouleur** : la catégorie devait s'arrêter le ${frDate.format(end)}. Vérifier une prolongation, sinon la retirer des parcours (src/lib/cee.ts).`);
  else if (left <= NOTICE_DAYS) lines.push(`- **Gros rouleur** : la catégorie s'arrête le ${frDate.format(end)}. Vérifier une prolongation avant cette date (\`GROS_ROULEUR_UNTIL\`, src/lib/cee.ts).`);
}

if (update) {
  const next = { reviewed: today.toISOString().slice(0, 10), sources: { ...state.sources, ...current } };
  fs.writeFileSync(STATE, JSON.stringify(next, null, 2) + "\n");
  console.log(`État des fiches enregistré dans ${STATE} (${Object.keys(current).length} fiches).`);
  process.exit(0);
}

if (!lines.length) {
  console.log("Veille des aides : rien à relire.");
  process.exit(0);
}

const report = [
  "La veille hebdomadaire a trouvé de quoi relire les aides affichées sur Evly :",
  "",
  ...lines,
  "",
  "Après relecture : corriger `src/lib/cee.ts` si besoin, puis `node scripts/aids-watch.mjs --update` et committer `scripts/aids-watch.json`.",
].join("\n");
console.log(report);
if (out) fs.writeFileSync(out, report + "\n");
