/**
 * Télécharge les tableaux publics de Bjørn Nyland (autonomies, 1000 km, courbes de charge)
 * dans scratch/ (non versionné). Étape préalable à scripts/sync-nyland-ranges.mjs.
 */
import fs from "node:fs";

const SHEETS = {
  "scratch/bjorn_range.csv": "https://docs.google.com/spreadsheets/d/1V6ucyFGKWuSQzvI8lMzvvWJHrBS82echMVJH37kwgjE/export?format=csv&gid=735351678",
  "scratch/bjorn_1000k.csv": "https://docs.google.com/spreadsheets/d/1V6ucyFGKWuSQzvI8lMzvvWJHrBS82echMVJH37kwgjE/export?format=csv&gid=15442336",
  "scratch/bjorn_charge.csv": "https://docs.google.com/spreadsheets/d/1hpXNhRxaIM06OBIKM8R1rOvYXlHgrWNpjWmK6Ra1zZ8/export?format=csv&gid=1593904708",
};

fs.mkdirSync("scratch", { recursive: true });
for (const [dest, url] of Object.entries(SHEETS)) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${url} : HTTP ${res.status}`);
  fs.writeFileSync(dest, await res.text(), "utf8");
  console.log(`✓ ${dest}`);
}
