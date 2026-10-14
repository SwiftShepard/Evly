/**
 * Recalcule l'autonomie « hiver » (-5 °C) de toutes les fiches avec le modèle unique de
 * src/lib/winter.js : autonomie mixte × facteur (chimie, pompe à chaleur), et une marge de
 * prudence quand le mixte n'est qu'estimé.
 *
 * Usage :
 *   node scripts/apply-winter-model.mjs          # applique aux JSON
 *   node scripts/apply-winter-model.mjs --dry    # résumé sans écrire
 *
 * Seules les valeurs winter_minus5_km changent : le texte des fiches est modifié sur place,
 * objet d'autonomie par objet d'autonomie, sans reformater le fichier.
 */
import fs from "node:fs";
import path from "node:path";
import { heatPumpOf, isMeasured, winterKm } from "../src/lib/winter.js";

const DRY = process.argv.includes("--dry");
const DIR = "src/data/vehicles";
let changed = 0;
let ranges = 0;
const deltas = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const filePath = path.join(DIR, file);
  const text = fs.readFileSync(filePath, "utf8");
  const v = JSON.parse(text);
  const hp = heatPumpOf(v.heatPump);
  // Objets d'autonomie : plats, avec mixed_km, winter_minus5_km et confidence
  const next = text.replace(/\{[^{}]*"mixed_km"[^{}]*\}/g, (block) => {
    const mixed = Number(block.match(/"mixed_km":\s*(\d+)/)?.[1]);
    const conf = block.match(/"confidence":\s*"([a-z_]+)"/)?.[1] ?? "estimated";
    const old = block.match(/"winter_minus5_km":\s*(\d+)/);
    if (!mixed || !old) return block;
    ranges++;
    const win = Math.min(winterKm(mixed, v.chemistry, hp, isMeasured(conf)), mixed - 1);
    deltas.push(win / Number(old[1]) - 1);
    return block.replace(/("winter_minus5_km":\s*)\d+/, `$1${win}`);
  });
  if (next !== text) {
    changed++;
    if (!DRY) fs.writeFileSync(filePath, next, "utf8");
  }
}

deltas.sort((a, b) => a - b);
const pct = (x) => `${x > 0 ? "+" : ""}${Math.round(x * 100)} %`;
console.log(`${ranges} autonomies, ${changed} fiches ${DRY ? "à modifier" : "modifiées"}`);
console.log(`Écart sur l'hiver : médiane ${pct(deltas[deltas.length >> 1])}, de ${pct(deltas[0])} à ${pct(deltas.at(-1))}`);
