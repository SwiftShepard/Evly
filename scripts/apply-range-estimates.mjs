/**
 * Recale les autonomies estimées (versions sans essai) sur les mesures du catalogue, avec
 * src/lib/rangeEstimate.js : mixte = WLTP × rapport mesuré d'une autre version du même modèle,
 * sinon médiane mesurée de la carrosserie ; autoroute et ville d'après les rapports des essais. Puis recalcule l'hiver (apply-winter-model).
 * Les autonomies mesurées (Nyland, essais presse) et constructeur ne sont pas touchées.
 *
 * Usage :
 *   node scripts/apply-range-estimates.mjs          # applique aux JSON
 *   node scripts/apply-range-estimates.mjs --dry    # coefficients et écarts, sans écrire
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { calibrate, estimateRange, ownCalibration, FAMILY_LABEL } from "../src/lib/rangeEstimate.js";

const DRY = process.argv.includes("--dry");
const DIR = "src/data/vehicles";
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
const vehicles = files.map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));
const k = calibrate(vehicles);

const pct = (x) => `${x > 0 ? "+" : ""}${Math.round(x * 100)} %`;
console.log(`Coefficients (${k.n} versions mesurées) :`);
for (const [f, { ratio, n }] of Object.entries(k.byFamily)) console.log(`  ${FAMILY_LABEL[f]} : ${ratio.toFixed(3)} × WLTP (${n} mesures${n < 12 ? ", trop peu : médiane du catalogue" : ""})`);
console.log(`  Autoroute 130 km/h : ${k.highway.toFixed(3)} × mixte ; ville : ${k.urban.toFixed(3)} × mixte`);

let changed = 0;
const deltas = [];
files.forEach((file, idx) => {
  const filePath = path.join(DIR, file);
  const text = fs.readFileSync(filePath, "utf8");
  const v = vehicles[idx];
  // Quadricycles (45 km/h, usage urbain) : rien de comparable parmi les voitures mesurées
  if (v.bodyType === "Quadricycle") return;
  const own = ownCalibration(v);
  const batteries = new Set(v.configurations.map((c) => c.usableCapacity_kWh ?? v.usableCapacity_kWh));
  const next = text.replace(/\{[^{}]*"mixed_km"[^{}]*\}/g, (block, offset) => {
    if (!/"confidence":\s*"estimated"/.test(block)) return block;
    const oldMixed = Number(block.match(/"mixed_km":\s*(\d+)/)?.[1]);
    // Version propriétaire du bloc ; au niveau du modèle, la version de même autonomie
    const start = text.lastIndexOf('"id": "', offset);
    const id = start >= 0 ? text.slice(start).match(/"id": "([^"]+)"/)?.[1] : null;
    const cfg = id ? v.configurations.find((c) => c.id === id) : v.configurations.find((c) => c.realRange?.mixed_km === oldMixed);
    // Sans WLTP propre, le WLTP du modèle ne vaut que s'il n'y a qu'une batterie
    const wltp = cfg?.wltp_km ?? (batteries.size === 1 ? v.wltp_max_km : null);
    if (!wltp || !oldMixed) return block;
    const est = estimateRange(wltp, v.bodyType, k, own);
    deltas.push(est.mixed_km / oldMixed - 1);
    return block
      .replace(/("mixed_km":\s*)\d+/, `$1${est.mixed_km}`)
      .replace(/("highway_130_km":\s*)\d+/, `$1${est.highway_130_km}`)
      .replace(/("urban_km":\s*)\d+/, `$1${est.urban_km}`);
  });
  if (next !== text) {
    changed++;
    if (!DRY) fs.writeFileSync(filePath, next, "utf8");
  }
});

deltas.sort((a, b) => a - b);
console.log(`${deltas.length} autonomies estimées, ${changed} fiches ${DRY ? "à modifier" : "modifiées"}`);
console.log(`Écart sur le mixte : médiane ${pct(deltas[deltas.length >> 1])}, de ${pct(deltas[0])} à ${pct(deltas.at(-1))}`);
if (!DRY) execFileSync(process.execPath, ["scripts/apply-winter-model.mjs"], { stdio: "inherit" });
