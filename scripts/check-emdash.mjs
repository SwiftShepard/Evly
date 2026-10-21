/**
 * Garde-fou typographique (npm run lint:typo, lancé en CI avant le build) :
 * - aucun tiret cadratin ni demi-cadratin dans src/ ;
 * - dans les textes affichés des fiches : pas de mot courant privé de ses accents,
 *   pas de décimale à point, pas d'unité collée au nombre (roadmap J8).
 */
import fs from "node:fs";
import path from "node:path";

let failed = false;

const remaining = [];
function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(json|astro|tsx?|md|css)$/.test(f.name)) {
      const c = fs.readFileSync(p, "utf8");
      const em = (c.match(/—/g) || []).length;
      const en = (c.match(/–/g) || []).length;
      if (em + en > 0) remaining.push({ file: p.split(path.sep).join("/"), em, en });
    }
  }
}
walk("src");
if (remaining.length > 0) {
  console.error("Erreur : des caractères em-dash (—) ou en-dash (–) ont été détectés :");
  console.error(JSON.stringify(remaining, null, 2));
  failed = true;
} else {
  console.log("Succès : aucun em-dash ou en-dash détecté dans src/.");
}

/* ---------------------------------------------------------------- */
/* Textes des fiches                                                 */
/* ---------------------------------------------------------------- */

// Mots qui n'existent pas sans accent : leur présence trahit une phrase tapée sans accents
const UNACCENTED = new Set(`
apres arriere caractere camera cameras chassis competitif competitive degres deja depot detection
eclairage ecran ecrans electrique electriques eleve elevee eligibilite eligible entree equipement
equipements europeen europeenne europeens francaise francaises generation genereux genereuse grace
habitabilite inferieur inferieure integree interieur interieure legerement limitee limitees malgre
materiaux memes modele modeles modularite multimedia necessitant periurbain periurbains premiere
privilegiant reelle regulateur reseau securite serie siege sieges superieur superieure systeme systemes
tres vehicule vehicules visibilite
`.trim().split(/\s+/));

// Clés non affichées ou dont le contenu est un nom propre (finition, pneumatique, source)
const SKIP_KEYS = new Set(["slug", "id", "category", "sourceId", "videoUrl", "url", "imageUrl", "protocol", "battery", "tyreType",
  "availability", "drivetrain", "chemistry", "heatPump", "confidence", "sources", "lastUpdated", "testDate", "imageCredit",
  "tyreModel", "model", "variant", "brand"]);
// Numéros de version (« DS Drive Assist 2.0 ») : le point y est d'usage
const VERSION_BEFORE = /(Assist|Sense|Pilot|OS|iDrive|version)\s$/i;
const DECIMAL = /(?<![\w.])\d+\.\d+(?![\w.])/g;
const STUCK_UNIT = /\b\d+(?:[.,]\d+)?(?:kWh|kW|min|kg|mm|Nm|V|L|s|m3)\b|\d%/;

const issues = [];
const dir = "src/data/vehicles";
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const check = (o, key) => {
    if (Array.isArray(o)) return o.forEach((x) => check(x, key));
    if (o && typeof o === "object") return Object.entries(o).forEach(([k, v]) => check(v, k));
    if (typeof o !== "string" || SKIP_KEYS.has(key)) return;
    const words = (o.match(/\p{L}+/gu) ?? []).filter((w) => UNACCENTED.has(w.toLowerCase()));
    if (words.length) issues.push(`${f} [${key}] accents manquants (${words.join(", ")}) : ${o}`);
    for (const m of o.matchAll(DECIMAL)) {
      if (!VERSION_BEFORE.test(o.slice(0, m.index))) issues.push(`${f} [${key}] décimale à point (${m[0]}) : ${o}`);
    }
    const stuck = o.match(STUCK_UNIT);
    if (stuck) issues.push(`${f} [${key}] unité collée (${stuck[0]}) : ${o}`);
  };
  check(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), "");
}
if (issues.length > 0) {
  console.error(`Erreur : ${issues.length} fautes typographiques dans les fiches :`);
  for (const i of issues) console.error(`  ${i}`);
  failed = true;
} else {
  console.log("Succès : textes des fiches accentués, décimales à virgule, unités détachées.");
}

process.exit(failed ? 1 : 0);
