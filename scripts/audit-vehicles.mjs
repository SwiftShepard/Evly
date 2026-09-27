/**
 * Audit de cohérence des fiches véhicules (au-delà de la validation Zod).
 * Usage : node scripts/audit-vehicles.mjs [--json]
 * Chaque règle signale une incohérence probable ; à vérifier avant correction.
 */
import fs from "node:fs";

const DIR = "src/data/vehicles";
const vehicles = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8")));
const sourceIds = new Set([...fs.readFileSync("src/data/sources.ts", "utf8").matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]));

const issues = [];
const add = (slug, rule, detail) => issues.push({ slug, rule, detail });
const AWD_RE = /\b(awd|4matic|xdrive|quattro|e-4orce|4motion|dual motor|htrac|all4|intégrale|integrale|twin|bi-?moteur|4x4)\b/i;

for (const v of vehicles) {
  const s = v.slug;
  const labels = [v.variant, ...v.trims.map((t) => t.name), ...v.configurations.map((c) => `${c.label} ${c.trim}`)].join(" ");
  const equipment = v.trims.flatMap((t) => t.equipmentHighlights).join(" ");

  const isQuadricycle = /quadricycle/i.test(`${v.bodyType} ${v.segment}`);

  // 1. Valeurs du gabarit de génération (204 ch / 300 Nm / 7,5 s / 160 km/h / 1 700 kg…)
  const TEMPLATE = { power_hp: 204, torque_Nm: 300, acceleration_0_100_s: 7.5, topSpeed_kmh: 160, mass_kg: 1700, wheelbase_mm: 2700 };
  const hits = Object.entries(TEMPLATE).filter(([k, val]) => v[k] === val).map(([k]) => k);
  if (hits.length >= 3) add(s, "valeur-gabarit", `${hits.length} valeurs du gabarit : ${hits.map((k) => `${k}=${v[k]}`).join(", ")}`);
  // 2. ch / kW
  if (Math.abs(v.power_hp - v.power_kW * 1.36) > Math.max(4, v.power_kW * 0.04)) add(s, "ch-kw", `${v.power_hp} ch pour ${v.power_kW} kW (attendu ≈ ${Math.round(v.power_kW * 1.36)} ch)`);
  for (const c of v.configurations) {
    if (c.power_kW && c.power_hp && Math.abs(c.power_hp - c.power_kW * 1.36) > Math.max(4, c.power_kW * 0.04)) add(s, "ch-kw", `config ${c.id} : ${c.power_hp} ch / ${c.power_kW} kW`);
  }
  // 3. Transmission
  const allAwd = v.configurations.length > 0 && v.configurations.every((c) => AWD_RE.test(`${c.label} ${c.id}`));
  if (v.drivetrain === "FWD" && /tesla|bmw|porsche|polestar|volvo ex30|vw id\.?[3457]|cupra (born|tavascan)|skoda enyaq/i.test(`${v.brand} ${v.model}`)) add(s, "transmission", `FWD improbable pour ${v.brand} ${v.model}`);
  if (v.drivetrain !== "AWD" && allAwd) add(s, "transmission", `toutes les configs sont intégrales mais drivetrain = ${v.drivetrain}`);
  if (v.drivetrain === "AWD" && v.motors < 2) add(s, "transmission", "AWD avec 1 seul moteur");
  // 4. Architecture
  if (/800\s?v/i.test(equipment + labels) && v.architecture_V !== 800) add(s, "architecture", "« 800V » dans les finitions mais architecture_V = 400");
  // 5. Recharge DC
  const cap = v.usableCapacity_kWh;
  const dc = v.chargingDC;
  if (dc.peakPower_kW > 0 && dc.time_10_80_min > 0) {
    const avg = (0.7 * cap) / (dc.time_10_80_min / 60);
    if (avg > dc.peakPower_kW * 1.02) add(s, "recharge-dc", `10→80 % en ${dc.time_10_80_min} min implique ${Math.round(avg)} kW de moyenne > pic ${dc.peakPower_kW} kW`);
    if (avg < dc.peakPower_kW * 0.3) add(s, "recharge-dc", `10→80 % en ${dc.time_10_80_min} min = ${Math.round(avg)} kW de moyenne, très loin du pic ${dc.peakPower_kW} kW`);
  }
  if (dc.kWh_added_30min > cap * 0.95) add(s, "recharge-dc", `${dc.kWh_added_30min} kWh ajoutés en 30 min pour ${cap} kWh utiles`);
  const curveMax = Math.max(...(v.chargingCurve ?? []).map((p) => p.power));
  if (dc.peakPower_kW > 0 && curveMax < dc.peakPower_kW * 0.8) add(s, "courbe", `pic de courbe ${curveMax} kW < pic annoncé ${dc.peakPower_kW} kW`);
  // 6. Recharge AC
  const acExpected = cap / v.chargingAC.onboardCharger_kW;
  if (!isQuadricycle && (v.chargingAC.time_0_100_h < acExpected * 0.85 || v.chargingAC.time_0_100_h > acExpected * 1.6)) add(s, "recharge-ac", `0→100 % AC en ${v.chargingAC.time_0_100_h} h pour ${cap} kWh à ${v.chargingAC.onboardCharger_kW} kW (attendu ≈ ${(acExpected * 1.1).toFixed(1)} h)`);
  // 7. Consommations
  const { consumption_mixed_kWh_per_100km: cm, consumption_highway_kWh_per_100km: ch, consumption_winter_kWh_per_100km: cw } = v;
  if (!isQuadricycle && (cm < 9 || cm > 32)) add(s, "conso", `conso mixte ${cm} kWh/100 km hors plage`);
  if (!isQuadricycle && ch <= cm) add(s, "conso", `conso autoroute ${ch} ≤ mixte ${cm}`);
  if (cw <= cm) add(s, "conso", `conso hiver ${cw} ≤ mixte ${cm}`);
  // 8. Autonomies
  const checkRange = (rr, wltpMax, wltpMin, where) => {
    if (!rr) return;
    if (rr.highway_130_km >= rr.mixed_km) add(s, "autonomie", `${where} autoroute 130 (${rr.highway_130_km}) ≥ mixte (${rr.mixed_km})`);
    if (rr.urban_km < rr.mixed_km) add(s, "autonomie", `${where} ville (${rr.urban_km}) < mixte (${rr.mixed_km})`);
    if (rr.winter_minus5_km >= rr.mixed_km) add(s, "autonomie", `${where} hiver (${rr.winter_minus5_km}) ≥ mixte (${rr.mixed_km})`);
    if (wltpMax && rr.mixed_km > wltpMax * 1.02) add(s, "autonomie", `${where} mixte réel (${rr.mixed_km}) > WLTP (${wltpMax})`);
    if (wltpMin && rr.mixed_km < wltpMin * 0.55) add(s, "autonomie", `${where} mixte réel (${rr.mixed_km}) < 55 % du WLTP (${wltpMin})`);
    if (rr.highway_120_km && rr.highway_120_km < rr.highway_130_km) add(s, "autonomie", `${where} 120 km/h (${rr.highway_120_km}) < 130 km/h (${rr.highway_130_km})`);
  };
  checkRange(v.realRange, v.wltp_max_km, v.wltp_min_km, "véhicule :");
  v.configurations.forEach((c) => checkRange(c.realRange, c.wltp_km, c.wltp_km, `config ${c.id} :`));
  const maxCap = Math.max(cap, ...v.configurations.map((c) => c.usableCapacity_kWh ?? 0),
    ...v.trims.map((t) => parseFloat(String(t.batteryUsed).replace(",", ".")) || 0));
  const kmPerKwh = v.wltp_max_km / maxCap;
  if (!isQuadricycle && (kmPerKwh < 3.5 || kmPerKwh > 9.5)) add(s, "wltp-batterie", `WLTP max ${v.wltp_max_km} km pour ${maxCap} kWh max (${kmPerKwh.toFixed(1)} km/kWh)`);
  // 9. Batterie
  if (v.grossCapacity_kWh && v.grossCapacity_kWh < cap) add(s, "batterie", `brute ${v.grossCapacity_kWh} < utile ${cap}`);
  // 10. Performances
  if (!isQuadricycle && (v.acceleration_0_100_s < 2 || v.acceleration_0_100_s > 20)) add(s, "performances", `0-100 en ${v.acceleration_0_100_s} s`);
  if (!isQuadricycle && (v.topSpeed_kmh < 90 || v.topSpeed_kmh > 330)) add(s, "performances", `Vmax ${v.topSpeed_kmh} km/h`);
  if (v.mass_kg && v.power_kW / v.mass_kg > 0.35) add(s, "performances", `${v.power_kW} kW pour ${v.mass_kg} kg`);
  // 11. Dimensions
  if (v.wheelbase_mm >= v.length_mm) add(s, "dimensions", `empattement ${v.wheelbase_mm} ≥ longueur ${v.length_mm}`);
  if (!isQuadricycle && (v.length_mm < 2400 || v.length_mm > 6000 || v.width_mm < 1400 || v.width_mm > 2300 || v.height_mm < 1100 || v.height_mm > 2800)) add(s, "dimensions", `${v.length_mm} × ${v.width_mm} × ${v.height_mm} mm`);
  if (v.trunkCapacityFolded_L && v.trunkCapacityFolded_L < v.trunkCapacity_L) add(s, "dimensions", `coffre rabattu ${v.trunkCapacityFolded_L} L < coffre ${v.trunkCapacity_L} L`);
  // 12. Configurations ↔ finitions
  const trimNames = new Set(v.trims.map((t) => t.name));
  for (const c of v.configurations) {
    if (!trimNames.has(c.trim) && ![...trimNames].some((t) => t.startsWith(c.trim) || c.trim.startsWith(t))) add(s, "config-finition", `config ${c.id} : finition « ${c.trim} » absente des finitions`);
    if (c.price_EUR && ![...v.trims].some((t) => t.price_EUR && Math.abs(t.price_EUR - c.price_EUR) <= 3000)) add(s, "config-prix", `config ${c.id} : ${c.price_EUR} € sans finition proche`);
  }
  // 13. Aides
  // L'éco-score ADEME n'exige pas une production UE (Inster coréen, Grande Panda serbe éligibles),
  // mais aucun modèle produit en Chine ne l'obtient à ce jour.
  const inChina = /chine/i.test(v.productionCountry);
  if (inChina && v.availableAids.length > 0) add(s, "aides", `aides CEE listées pour une production en Chine`);
  if (inChina && v.leasingSocialEligible) add(s, "aides", `leasing social pour une production en Chine`);
  const minPrice = Math.min(...v.trims.map((t) => t.price_EUR ?? Infinity));
  if (v.availableAids.length > 0 && Number.isFinite(minPrice) && minPrice >= 47000 && !/utilitaire|fourgon|van/i.test(v.bodyType)) add(s, "aides", `aides CEE listées mais prix mini ${minPrice} € ≥ 47 000 €`);
  // 14. Sources
  for (const id of v.sources) if (!sourceIds.has(id)) add(s, "source-inconnue", `source « ${id} » absente du registre`);
  // 15. Divers
  if (v.lastUpdated > new Date().toISOString().slice(0, 10)) add(s, "date", `lastUpdated dans le futur (${v.lastUpdated})`);
  if (v.v2l === false && /v2l/i.test(equipment)) add(s, "v2l", "V2L dans les finitions mais v2l = false");
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(issues, null, 2));
} else {
  const byRule = new Map();
  issues.forEach((i) => byRule.set(i.rule, [...(byRule.get(i.rule) ?? []), i]));
  console.log(`${issues.length} signalements sur ${new Set(issues.map((i) => i.slug)).size} fiches\n`);
  for (const [rule, list] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`── ${rule} (${list.length})`);
    list.forEach((i) => console.log(`   ${i.slug.padEnd(28)} ${i.detail}`));
  }
}
