// Strip "Long Range", "Standard Range", "Standard" des champs batterie des JSON véhicules
import fs from "node:fs";
import path from "node:path";

const DIR = "src/data/vehicles";

function strip(s) {
  if (!s) return s;
  return s
    .replace(/Long Range\s+/g, "")
    .replace(/Standard Range\s+/g, "")
    .replace(/Standard\s+(\d)/g, "$1") // "Standard 58.3" → "58.3"
    .replace(/Long Range\s*·\s*/g, "")
    .replace(/Standard Range\s*·\s*/g, "");
}

let touched = 0, changes = 0;
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith(".json")) continue;
  const fp = path.join(DIR, f);
  const v = JSON.parse(fs.readFileSync(fp, "utf8"));
  let dirty = false;

  // trims[].name + trims[].batteryUsed
  if (Array.isArray(v.trims)) {
    for (const t of v.trims) {
      const newName = strip(t.name);
      const newBatt = strip(t.batteryUsed);
      if (newName !== t.name) { t.name = newName; dirty = true; changes++; }
      if (newBatt !== t.batteryUsed) { t.batteryUsed = newBatt; dirty = true; changes++; }
    }
  }

  // configurations[].label + .trim
  if (Array.isArray(v.configurations)) {
    for (const c of v.configurations) {
      const newLabel = strip(c.label);
      const newTrim = strip(c.trim);
      if (newLabel !== c.label) { c.label = newLabel; dirty = true; changes++; }
      if (newTrim !== c.trim) { c.trim = newTrim; dirty = true; changes++; }
    }
  }

  if (dirty) {
    v.lastUpdated = "2026-05-18";
    fs.writeFileSync(fp, JSON.stringify(v, null, 2) + "\n");
    touched++;
    console.log("✓", f);
  }
}
console.log("\nFichiers modifiés:", touched, "| Champs nettoyés:", changes);
