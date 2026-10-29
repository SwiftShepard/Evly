/**
 * Prix des carburants de src/data/fuelPrices.ts, relevés sur le flux officiel prix-carburants :
 * moyenne nationale du SP95-E10 et du gazole sur les stations mises à jour dans la semaine,
 * comme Ma semaine en direct (lib/map/fuel). Le fichier n'est réécrit que si un prix bouge
 * d'au moins 2 centimes ou si le relevé a plus de 4 semaines : un écart d'arrondi ne doit pas
 * modifier les pages (IndexNow signale chaque page dont le HTML change).
 *
 *   node scripts/fuel-prices.mjs            relève et met à jour si besoin
 *   node scripts/fuel-prices.mjs --dry-run  affiche le relevé sans rien écrire
 *   node scripts/fuel-prices.mjs --force    réécrit même sans écart
 *
 * Dans une Action GitHub, écrit changed=true|false et summary dans $GITHUB_OUTPUT
 * (workflow « Prix des carburants », .github/workflows/fuel-prices.yml).
 */
import fs from "node:fs";

const FILE = "src/data/fuelPrices.ts";
const ENDPOINT = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";
const MIN_STEP = 0.02;
const MAX_AGE_DAYS = 28;
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

async function average(fuel) {
  const params = new URLSearchParams({
    select: `avg(${fuel}_prix) as eur, count(${fuel}_prix) as n`,
    where: `${fuel}_maj >= now(days=-7)`,
    limit: "1",
  });
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const row = (await res.json())?.results?.[0];
      const eur = Number(row?.eur);
      const n = Number(row?.n);
      // Garde-fous : une moyenne aberrante ou un flux à moitié vide n'écrasent rien
      if (!(eur > 0.8 && eur < 4)) throw new Error(`moyenne aberrante (${row?.eur})`);
      if (!(n > 2000)) throw new Error(`trop peu de stations (${n})`);
      return { eur: Math.round(eur * 100) / 100, n };
    } catch (e) {
      lastError = e;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
  throw new Error(`${fuel} : ${lastError.message}`);
}

const fr = (x, d = 2) => x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const count = (n) => n.toLocaleString("fr-FR").replace(/[  ]/g, " ");

const src = fs.readFileSync(FILE, "utf8");
const read = (re, what) => {
  const m = src.match(re);
  if (!m) throw new Error(`${FILE} : ${what} introuvable`);
  return m[1];
};
const current = {
  date: read(/date: "(\d{4}-\d{2}-\d{2})"/, "date"),
  e10: Number(read(/\be10: ([\d.]+)/, "e10")),
  gazole: Number(read(/\bgazole: ([\d.]+)/, "gazole")),
};

const [e10, gazole] = await Promise.all([average("e10"), average("gazole")]);
// Date du relevé à l'heure de Paris (AAAA-MM-JJ)
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
const ageDays = (Date.parse(today) - Date.parse(current.date)) / 86_400_000;
const moved = Math.abs(e10.eur - current.e10) >= MIN_STEP - 1e-9 || Math.abs(gazole.eur - current.gazole) >= MIN_STEP - 1e-9;
const changed = force || moved || ageDays >= MAX_AGE_DAYS;

const summary = `SP95-E10 ${fr(current.e10)} → ${fr(e10.eur)} €/l (${count(e10.n)} stations), gazole ${fr(current.gazole)} → ${fr(gazole.eur)} €/l (${count(gazole.n)} stations)`;
console.log(summary);
console.log(changed ? `Mise à jour${moved ? "" : force ? " forcée" : ` : relevé du ${current.date} trop ancien`}.` : `Écart sous ${fr(MIN_STEP)} € : rien à changer (relevé du ${current.date}).`);

if (changed && !dryRun) {
  const next = src
    .replace(/date: "\d{4}-\d{2}-\d{2}"/, `date: "${today}"`)
    .replace(/\/\*\* SP95-E10, €\/l \([^)]*\) \*\/(\s+)e10: [\d.]+/, `/** SP95-E10, €/l (${count(e10.n)} stations) */$1e10: ${e10.eur}`)
    .replace(/\/\*\* Gazole, €\/l \([^)]*\) \*\/(\s+)gazole: [\d.]+/, `/** Gazole, €/l (${count(gazole.n)} stations) */$1gazole: ${gazole.eur}`);
  if (!next.includes(`e10: ${e10.eur}`) || !next.includes(`gazole: ${gazole.eur}`)) throw new Error(`${FILE} : format inattendu, rien n'est écrit`);
  fs.writeFileSync(FILE, next);
  console.log(`${FILE} mis à jour (${today}).`);
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed && !dryRun}\nsummary=${summary}\n`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n\n${changed && !dryRun ? "Fichier mis à jour, déploiement relancé." : "Aucun changement."}\n`);
}
