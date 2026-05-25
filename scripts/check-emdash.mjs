import fs from "node:fs";
import path from "node:path";

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
console.log("Fichiers texte avec em (U+2014) ou en (U+2013):");
console.log(JSON.stringify(remaining, null, 2));
console.log("Total:", remaining.length, "fichiers");

if (remaining.length > 0) {
  console.error("Erreur : Des caractères em-dash (—) ou en-dash (–) ont été détectés dans les fichiers ci-dessus.");
  process.exit(1);
} else {
  console.log("Succès : Aucun em-dash ou en-dash détecté dans src/.");
  process.exit(0);
}
