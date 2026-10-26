/**
 * Veille Nyland : ce que la synchronisation hebdomadaire a changé dans les fiches, et les
 * voitures apparues dans les tableaux de Nyland depuis la dernière veille (à relier à la main
 * dans les tables MAPPING). Écrit le corps de la pull request en Markdown sur la sortie.
 *
 * Usage (après download-nyland et les synchronisations, cf. .github/workflows/nyland.yml) :
 *   node scripts/nyland-watch.mjs            # rapport seul
 *   node scripts/nyland-watch.mjs --update   # rapport, puis retient les voitures vues (scripts/nyland-seen.json)
 *
 * Une voiture vue n'est plus signalée : la fusion de la pull request vaut relecture.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const UPDATE = process.argv.includes("--update");
const SEEN_PATH = "scripts/nyland-seen.json";
const VEHICLES_DIR = "src/data/vehicles";
const RANGE_CSV = "scratch/bjorn_range.csv";
const CHARGE_CSV = "scratch/bjorn_charge.csv";

function parseLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean) : []);
const rangeCars = [...new Set(read(RANGE_CSV).slice(1).map((l) => parseLine(l)[0]).filter(Boolean))];
const chargeCars = (() => {
  const [head] = read(CHARGE_CSV);
  return head ? [...new Set(parseLine(head).slice(1).filter(Boolean))] : [];
})();

const seen = fs.existsSync(SEEN_PATH) ? JSON.parse(fs.readFileSync(SEEN_PATH, "utf8")) : { range: [], charge: [] };
const newRange = rangeCars.filter((c) => !seen.range.includes(c));
const newCharge = chargeCars.filter((c) => !seen.charge.includes(c));

/* ── Fiche probable d'une voiture Nyland ───────────────────────── */
const vehicles = fs
  .readdirSync(VEHICLES_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(VEHICLES_DIR, f), "utf8")));

const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/mercedes-benz/g, "mercedes")
    .replace(/\bvw\b/g, "volkswagen");
const tokens = (s) => norm(s).split(/[^a-z0-9.+#]+/).filter(Boolean);
// Mots qui ne disent rien du modèle (batterie, transmission, millésime)
const GENERIC = new Set(["model", "lr", "sr", "awd", "rwd", "fwd", "kwh", "performance", "long", "range", "standard", "plus", "new", "electric", "e", "ev", "the"]);

function guess(car) {
  const t = new Set(tokens(car).filter((x) => !/^20\d\d$/.test(x)));
  return vehicles
    .filter((v) => tokens(v.brand).every((b) => t.has(b)))
    .map((v) => {
      const model = tokens(v.model).filter((x) => !tokens(v.brand).includes(x) && !GENERIC.has(x));
      const hits = model.filter((x) => t.has(x)).length;
      return { slug: v.slug, score: model.length ? hits / model.length : 0 };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((m) => m.slug);
}

/* ── Ce que la synchronisation a changé ────────────────────────── */
function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

const CONF = { bjorn_nyland: "mesurée (Nyland)", tested: "mesurée (essai)", estimated: "estimée", manufacturer: "constructeur" };
const changed = git(["diff", "--name-only", "--", VEHICLES_DIR]).split("\n").filter((f) => f.endsWith(".json"));
const changeLines = [];
for (const file of changed) {
  const after = JSON.parse(fs.readFileSync(file, "utf8"));
  let before = null;
  try {
    before = JSON.parse(git(["show", `HEAD:${file}`]));
  } catch {
    /* nouvelle fiche */
  }
  const old = new Map((before?.configurations ?? []).map((c) => [c.id, c]));
  const lines = [];
  for (const c of after.configurations ?? []) {
    const o = old.get(c.id);
    if (!o) continue;
    const parts = [];
    const [a, b] = [o.realRange ?? {}, c.realRange ?? {}];
    if (a.mixed_km !== b.mixed_km) parts.push(`mixte ${a.mixed_km ?? "?"} → ${b.mixed_km} km`);
    if (a.confidence !== b.confidence) parts.push(`${CONF[a.confidence] ?? a.confidence} → ${CONF[b.confidence] ?? b.confidence}`);
    if (o.chargingDC_10_80_min !== c.chargingDC_10_80_min) parts.push(`10 → 80 % ${o.chargingDC_10_80_min ?? "?"} → ${c.chargingDC_10_80_min} min`);
    if (o.chargingDC_peak_kW !== c.chargingDC_peak_kW) parts.push(`pic ${o.chargingDC_peak_kW ?? "?"} → ${c.chargingDC_peak_kW} kW`);
    if (parts.length) lines.push(`  - ${c.label} : ${parts.join(", ")}`);
  }
  changeLines.push(`- **${after.brand} ${after.model}** (\`${after.slug}\`)${lines.length ? "" : " : estimations recalées"}`, ...lines);
}

/* ── Rapport ───────────────────────────────────────────────────── */
const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const out = [`## Veille Nyland du ${date}`, ""];
if (changed.length) {
  out.push(`### Fiches modifiées (${changed.length})`, "", ...changeLines, "");
} else {
  out.push("Aucune fiche modifiée par la synchronisation.", "");
}
const newRows = [...newRange.map((c) => ["autonomie", c]), ...newCharge.map((c) => ["recharge", c])];
if (newRows.length) {
  out.push(
    `### Nouveaux essais Nyland à relier (${newRows.length})`,
    "",
    "Apparus dans les tableaux de Nyland depuis la dernière veille. Pour les reprendre : même batterie et même génération que la fiche, puis une ligne dans `MAPPING` de `scripts/sync-nyland-ranges.mjs` (autonomie) ou `scripts/sync-nyland-charging.mjs` (recharge), et `npm run sync:nyland`. Fusionner cette pull request les marque comme vus.",
    "",
    "| Tableau | Voiture Nyland | Fiche probable |",
    "| --- | --- | --- |",
    ...newRows.map(([kind, car]) => `| ${kind} | ${car.replace(/\|/g, "/")} | ${guess(car).map((s) => `\`${s}\``).join(", ") || "aucune"} |`),
    ""
  );
}
out.push("Après fusion, le site se reconstruit : les changements apparaissent sur les fiches, dans l'observatoire et dans les nouveautés des données.");
console.log(out.join("\n"));

if (UPDATE && (newRange.length || newCharge.length)) {
  const next = {
    range: [...new Set([...seen.range, ...rangeCars])].sort((a, b) => a.localeCompare(b)),
    charge: [...new Set([...seen.charge, ...chargeCars])].sort((a, b) => a.localeCompare(b)),
  };
  fs.writeFileSync(SEEN_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
}
