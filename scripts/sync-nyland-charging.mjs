/**
 * Synchronise les courbes de recharge rapide mesurées par Bjørn Nyland dans les fiches.
 *
 * Usage :
 *   node scripts/download-nyland.mjs          # met à jour scratch/bjorn_*.csv
 *   node scripts/sync-nyland-charging.mjs     # applique aux JSON (--dry pour simuler)
 *
 * Règles :
 * - Une configuration n'est « mesurée » que si Nyland a relevé la courbe de la même batterie,
 *   de la même génération : table MAPPING ci-dessous, tenue à la main. Les relevés à froid,
 *   bridés ou sur borne limitée sont écartés.
 * - Pour une config mesurée : courbe tous les 5 % (plus le point du pic), pic = maximum relevé,
 *   10 → 80 % = intégration pas à pas de 1 % de la capacité utile, +30 min = énergie ajoutée
 *   en 30 minutes depuis 10 %. chargingDC_confidence = "tested".
 * - Une config sans relevé d'un modèle mesuré ne garde pas l'étiquette « mesurée » du modèle :
 *   chargingDC_confidence reprend la confiance précédente, ou « estimated » si c'était « tested ».
 * - Les valeurs du modèle (chargingDC, chargingCurve) suivent la config mesurée dont la batterie
 *   est celle du modèle, s'il y en a une.
 */
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const VEHICLES_DIR = "src/data/vehicles";
const CSV_PATH = "scratch/bjorn_charge.csv";

// slug → [{ car: colonne exacte du tableau Nyland, kWh: capacité utile, configs: suffixes d'id }]
const MAPPING = {
  "audi-e-tron-gt": [{ car: "Audi e-tron GT 105 kWh", kWh: 97, configs: ["audi-etron-gt-quattro", "audi-s-etron-gt", "audi-rs-etron-gt", "audi-rs-etron-gt-perf"] }],
  // Q4 : relevé 2024 d'une 45 / 55 quattro (175 kW), pas des versions limitées à 135 kW
  "audi-q4-e-tron": [{ car: "Audi Q4 e-tron 82 kWh February 2024", kWh: 77, configs: ["audi-q4-etron-quattro", "audi-q4-sportback-quattro"] }],
  "audi-q6-e-tron": [{ car: "Audi Q6 e-tron 100 kWh", kWh: 94.9, configs: ["audi-q6-quattro-design", "audi-q6-quattro-sline", "audi-sq6-e-tron", "audi-q6-sportback-quattro-design", "audi-q6-sportback-quattro-sline", "audi-sq6-sportback-e-tron"] }],
  "bmw-i4": [{ car: "BMW i4 February 2021", kWh: 80.7, configs: ["edrive40-base", "edrive40-msport", "xdrive40-base", "xdrive40-msport", "m50-msport"] }],
  "bmw-i5": [{ car: "BMW i5 M60 84 kWh", kWh: 81.2, configs: ["edrive40-base", "edrive40-msport", "xdrive40-base", "xdrive40-msport", "m60"] }],
  "bmw-i7": [{ car: "BMW i7 105 kWh", kWh: 101.7, configs: ["edrive50", "xdrive60"] }],
  // "bmw-ix" : Nyland a relevé les xDrive40/50 d'avant le restylage
  "bmw-ix1": [{ car: "BMW iX1", kWh: 64.7, configs: ["edrive20-base", "edrive20-xline", "edrive20-msport", "xdrive30-base", "xdrive30-xline", "xdrive30-msport"] }],
  "bmw-ix3-neue-klasse": [{ car: "BMW iX3 50 xDrive", kWh: 108.7, configs: ["50", "50-m-sport"] }],
  "byd-atto-3": [{ car: "BYD Atto 3 Evo 76 kWh", kWh: 74.8, configs: ["design", "excellence"] }],
  "byd-dolphin": [{ car: "BYD Dolphin 60 kWh", kWh: 60.4, configs: ["comfort", "design"] }],
  "byd-seal-u": [{ car: "BYD Seal U 89 kWh", kWh: 87, configs: ["design"] }],
  "byd-seal": [{ car: "BYD Seal 84 kWh", kWh: 82.5, configs: ["design-rwd", "excellence-awd"] }],
  "citroen-e-c3": [{ car: "Citroen e-C3 45 kWh", kWh: 44, configs: ["you-44", "max-44"] }],
  "citroen-e-c4": [
    { car: "Citroen e-C4 50 kWh", kWh: 46.3, configs: ["you-136", "plus-136", "x-you-136", "x-plus-136"] },
    { car: "Citroen e-C4X 54 kWh", kWh: 51, configs: ["plus-156", "max-156", "x-plus-156", "x-max-156"] },
  ],
  "citroen-e-spacetourer": [{ car: "Citroen e-Spacetourer 75 kWh", kWh: 68, configs: ["business-75-m", "business-75-xl"] }],
  "cupra-tavascan": [{ car: "Cupra Tavascan 82 kWh 2025", kWh: 77, configs: ["endurance-rwd-210-kw--77", "vz-awd-250-kw--77"] }],
  // "ford-capri" : seul un relevé batterie froide existe
  "ford-explorer": [{ car: "Ford Explorer 84 kWh March 2025", kWh: 77, configs: ["77", "premium-77", "awd-77"] }],
  // Mach-E ER : le relevé de 2021 précède les mises à jour de recharge
  "ford-mustang-mach-e": [{ car: "Ford Mustang Mach-e GT July 2022", kWh: 91, configs: ["gt"] }],
  "ford-puma-gen-e": [{ car: "Ford Puma 2025", kWh: 43, configs: ["titanium", "stline", "vignale"] }],
  "hyundai-inster": [{ car: "Hyundai Inster 49 kWh", kWh: 49, configs: ["intuitive-49", "creative-49", "cross-creative-49", "cross-executive-49"] }],
  "hyundai-ioniq-6": [{ car: "Hyundai Ioniq 6 77 kWh", kWh: 77.4, configs: ["intuitive-77", "creative-77", "executive-77", "executive-awd-77"] }],
  "hyundai-ioniq-9": [{ car: "Hyundai Ioniq 9 110 kWh", kWh: 110.3, configs: ["creative-110", "executive-110", "calligraphy-110"] }],
  "hyundai-kona": [{ car: "Hyundai Kona 65 kWh", kWh: 65.4, configs: ["creative-65", "ultime-65", "n-line-creative-65", "n-line-executive-65"] }],
  "kia-ev2": [{ car: "Kia EV2 LR 61 kWh", kWh: 61, configs: ["air-61", "earth-61", "gt-line-61"] }],
  "kia-ev3": [{ car: "Kia EV3 81 kWh", kWh: 81.4, configs: ["long-range-air", "long-range-earth", "long-range-gt-line"] }],
  "kia-ev5": [{ car: "Kia EV5 81 kWh", kWh: 81.4, configs: ["lr-air", "lr-earth", "lr-gt-line"] }],
  "kia-ev9": [{ car: "Kia EV9 100 kWh", kWh: 99.8, configs: ["air", "earth", "gt-line"] }],
  "kia-pv5-cargo": [{ car: "Kia PV5 71 kWh", kWh: 71.2, configs: ["essential-71"] }],
  "kia-pv5-passenger": [{ car: "Kia PV5 71 kWh", kWh: 71.2, configs: ["essential-71", "plus-71"] }],
  "mazda-6e": [{ car: "Mazda 6e Standard Range", kWh: 68.8, configs: ["takumi-69", "takumi-plus-69"] }],
  "mercedes-cla": [{ car: "Mercedes CLA 90 kWh", kWh: 85, configs: ["250-pro", "250-amg", "350-4matic-amg"] }],
  "mercedes-classe-g": [{ car: "Mercedes G580 124 kWh", kWh: 116, configs: ["580-edition-one"] }],
  // "mercedes-eqe" : relevé de 2022 (90,6 kWh), batterie d'avant la mise à jour
  "mercedes-eqs": [{ car: "Mercedes EQS 120 kWh", kWh: 118, configs: ["450-avantgarde", "450-amg", "580-amg", "amg-53"] }],
  "mercedes-eqv": [{ car: "Mercedes EQV 100 kWh", kWh: 90, configs: ["tourer-pro", "tourer-avantgarde"] }],
  "mercedes-glc": [{ car: "Mercedes GLC 400", kWh: 94, configs: ["pro", "amg"] }],
  "mg-cyberster": [{ car: "MG Cyberster 77 kWh", kWh: 74.4, configs: ["trophy-rwd", "gt-awd"] }],
  "mg-im6": [{ car: "MG IM6 100 kWh", kWh: 96, configs: ["long-range"] }],
  "mg-marvel-r": [{ car: "MG Marvel R 70 kWh September 2022", kWh: 70, configs: ["comfort", "luxury", "performance"] }],
  "mg-mg4": [{ car: "MG4 64 kWh", kWh: 61.7, configs: ["luxury", "xpower"] }],
  "mg-mg5": [{ car: "MG5 61 kWh", kWh: 57.4, configs: ["luxury-61"] }],
  "mg-zs-ev": [{ car: "MG ZS EV 72 kWh", kWh: 68.3, configs: ["comfort-70", "luxury-70"] }],
  "mini-cooper": [{ car: "Mini Cooper SE 54 kWh", kWh: 49.2, configs: ["se-classic"] }],
  "nio-et5": [
    { car: "Nio ET5 75 kWh", kWh: 71, configs: ["75"] },
    { car: "Nio ET5 100 kWh May 2023", kWh: 90, configs: ["100"] },
  ],
  "nissan-ariya": [
    { car: "Nissan Ariya 63 kWh", kWh: 63, configs: ["engage-63", "advance-63"] },
    { car: "Nissan Ariya 87 kWh", kWh: 87, configs: ["evolve-87", "nismo-87"] },
  ],
  "nissan-leaf": [{ car: "Nissan Leaf 75 kWh", kWh: 75, configs: ["advance-75", "advance-75-2026", "ndesign-75"] }],
  "peugeot-e-5008": [{ car: "Peugeot e-5008 77 kWh", kWh: 73, configs: ["allure-210-ch-73", "gt-210-ch-73", "gt-exclusive-210-ch-73", "gt-325-ch-awd-73", "gt-exclusive-325-ch-awd-73"] }],
  "polestar-2": [{ car: "Polestar 2 refresh 82 kWh", kWh: 79, configs: ["lr-sm", "lr-dm"] }],
  "polestar-3": [{ car: "Polestar 3 111 kWh June 2025", kWh: 107, configs: ["lr-dm", "lr-dm-perf"] }],
  "polestar-4": [{ car: "Polestar 4 100 kWh", kWh: 94, configs: ["lr-sm", "lr-dm"] }],
  "renault-5": [{ car: "Renault 5 55 kWh", kWh: 52, configs: ["evolution-52", "techno-52", "iconic-cinq-52"] }],
  "renault-megane": [{ car: "Renault Megane 60 kWh", kWh: 60, configs: ["techno", "esprit-alpine", "iconic"] }],
  "renault-scenic": [{ car: "Renault Scenic 92 kWh", kWh: 87, configs: ["techno-ev87", "esprit-alpine-ev87", "iconic-ev87"] }],
  "skoda-elroq": [{ car: "Skoda Elroq 59 kWh June 2025", kWh: 59, configs: ["60-59-kwh-150-kw-fwd--52"] }],
  // Enyaq : seule la 85x recharge à 175 kW comme le véhicule relevé
  "skoda-enyaq": [{ car: "2025 Skoda Enyaq Coupé 85x 82 kWh", kWh: 77, configs: ["85x-210-kw-awd--77"] }],
  "smart-1": [{ car: "Smart #1 Brabus 66 kWh", kWh: 62, configs: ["pro-plus-66", "premium-66", "brabus-66"] }],
  "tesla-model-3": [{ car: "Tesla Model 3 RWD Highland", kWh: 57.5, configs: ["propulsion"] }],
  "tesla-model-y": [
    { car: "Tesla Model Y LR RWD 82 kWh Jan 2026", kWh: 75, configs: ["grande-autonomie-prop"] },
    { car: "Tesla Model Y LR Juniper June 2025", kWh: 75, configs: ["grande-autonomie-awd"] },
    { car: "Tesla Model Y Performance Juniper 82 kWh hot", kWh: 75, configs: ["performance"] },
  ],
  "volvo-ex30": [{ car: "Volvo EX30 69 kWh", kWh: 64, configs: ["start-sm-er", "plus-sm-er", "ultra-sm-er", "plus-tm"] }],
  "volvo-es90": [{ car: "Volvo ES90 92 kWh", kWh: 88, configs: ["start-sm", "plus-sm", "ultra-sm"] }],
  "vw-id7": [
    { car: "VW ID7 82 kWh March 2024", kWh: 77, configs: ["pro", "tourer"] },
    { car: "VW ID7 GTX Tourer 91 kWh", kWh: 86, configs: ["pro-s-86-kwh"] },
  ],
  "xpeng-g6": [{ car: "Xpeng G6 81 kWh 2025", kWh: 80.8, configs: ["long-range", "performance"] }],
  // G9 : relevé sur borne 400 kW, la plus puissante courante en France
  "xpeng-g9": [{ car: "Xpeng G9 93 kWh 2025 400 kW", kWh: 93.1, configs: ["long-range", "performance"] }],
  "xpeng-p7-plus": [{ car: "Xpeng P7+ LR", kWh: 76.3, configs: ["long-range", "performance"] }],
  "zeekr-7x": [{ car: "Zeekr 7X 100 kWh on 400 kW", kWh: 95, configs: ["lr-100", "privilege-100"] }],
  // "zeekr-x" : relevé d'une batterie « Golden » (LFP, 280 kW) qui n'est pas celle vendue en France
};

/* ── Lecture du tableau Nyland (SoC en lignes, une courbe par colonne) ───────────── */
const lines = fs.readFileSync(CSV_PATH, "utf8").trim().split(/\r?\n/);
const header = lines[0].split(",");
const rows = lines.slice(1).map((l) => l.split(","));

/** Puissance (kW) par SoC entier de 10 à la fin du relevé, trous comblés par interpolation */
function readCurve(car) {
  const col = header.indexOf(car);
  if (col < 1) return null;
  const pts = rows
    .map((r) => [Number(r[0]), r[col] === "" || r[col] == null ? NaN : Number(r[col])])
    .filter(([soc]) => Number.isFinite(soc));
  const known = pts.filter(([, p]) => Number.isFinite(p));
  if (known.length < 10) return null;
  const first = known[0][0];
  const last = known.at(-1)[0];
  const bySoc = new Map();
  for (let soc = first; soc <= last; soc++) {
    const exact = known.find(([s]) => s === soc);
    if (exact) { bySoc.set(soc, exact[1]); continue; }
    const lo = known.filter(([s]) => s < soc).at(-1);
    const hi = known.find(([s]) => s > soc);
    bySoc.set(soc, lo[1] + ((hi[1] - lo[1]) * (soc - lo[0])) / (hi[0] - lo[0]));
  }
  return { first, last, bySoc };
}

/** Courbe, pic, 10 → 80 % et énergie en 30 min pour une capacité utile donnée */
function chargingFrom(curve, kWh) {
  const { first, last, bySoc } = curve;
  if (first > 10 || last < 80) return null;
  const power = (soc) => bySoc.get(Math.min(last, Math.max(first, Math.floor(soc))));

  let peak = 0;
  let peakSoc = first;
  for (const [soc, p] of bySoc) if (p > peak) { peak = p; peakSoc = soc; }

  // 10 → 80 % : chaque point de SoC (1 % de la capacité utile) chargé à la puissance relevée
  let hours = 0;
  for (let soc = 10; soc < 80; soc++) hours += kWh / 100 / power(soc);

  // +30 min depuis 10 %, jusqu'à la fin du relevé au plus
  let minutes = 0;
  let added = 0;
  for (let soc = 10; soc < last && minutes < 30; soc++) {
    const step = kWh / 100;
    const dt = (step / power(soc)) * 60;
    if (minutes + dt > 30) { added += step * ((30 - minutes) / dt); minutes = 30; break; }
    minutes += dt;
    added += step;
  }

  const socs = new Set([peakSoc]);
  for (let soc = 10; soc <= last; soc += 5) socs.add(soc);
  if (last % 5) socs.add(last);
  const points = [...socs].sort((a, b) => a - b).map((soc) => ({ soc, power: Math.round(bySoc.get(soc)) }));

  return {
    chargingCurve: points,
    peak_kW: Math.round(peak),
    time_10_80_min: Math.round(hours * 60),
    kWh_30min: Math.round(added),
  };
}

/* ── Application aux fiches ────────────────────────────────── */
const report = { measuredConfigs: 0, vehicles: [], missingCars: [], unusable: [], missingConfigs: [], deltas: [] };

for (const file of fs.readdirSync(VEHICLES_DIR).filter((f) => f.endsWith(".json"))) {
  const filePath = path.join(VEHICLES_DIR, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const v = JSON.parse(raw);
  const mapping = MAPPING[v.slug];
  if (!mapping) continue;
  const before = JSON.stringify(v);

  const measured = new Map(); // id de config → { result, kWh, car }
  for (const { car, kWh, configs } of mapping) {
    const curve = readCurve(car);
    if (!curve) { report.missingCars.push(`${v.slug}: ${car}`); continue; }
    const result = chargingFrom(curve, kWh);
    if (!result) { report.unusable.push(`${v.slug}: ${car} (relevé ${curve.first}-${curve.last} %)`); continue; }
    for (const suffix of configs) {
      const cfg = v.configurations
        .filter((c) => c.id === suffix || c.id.endsWith(`-${suffix}`))
        .sort((a, b) => a.id.length - b.id.length)[0];
      if (!cfg) { report.missingConfigs.push(`${v.slug}: ${suffix}`); continue; }
      measured.set(cfg.id, { result, kWh, car });
    }
  }

  const priorConfidence = v.chargingDC.confidence;
  for (const cfg of v.configurations) {
    const m = measured.get(cfg.id);
    if (m) {
      const r = m.result;
      report.deltas.push(
        `${cfg.id.padEnd(44)} pic ${cfg.chargingDC_peak_kW}→${r.peak_kW} kW · 10-80 ${cfg.chargingDC_10_80_min}→${r.time_10_80_min} min · 30 min ${cfg.chargingDC_kWh_30min}→${r.kWh_30min} kWh`
      );
      cfg.chargingDC_peak_kW = r.peak_kW;
      cfg.chargingDC_10_80_min = r.time_10_80_min;
      cfg.chargingDC_kWh_30min = r.kWh_30min;
      cfg.chargingCurve = r.chargingCurve;
      cfg.chargingDC_confidence = "tested";
      report.measuredConfigs++;
    } else if (!cfg.chargingDC_confidence || cfg.chargingDC_confidence === "tested") {
      cfg.chargingDC_confidence = priorConfidence === "tested" ? "estimated" : priorConfidence;
    }
  }

  // Valeurs du modèle : config mesurée de la batterie du modèle
  const ref = [...measured.values()].find((m) => Math.abs(m.kWh - v.usableCapacity_kWh) < 1);
  if (ref) {
    v.chargingDC.peakPower_kW = ref.result.peak_kW;
    v.chargingDC.time_10_80_min = ref.result.time_10_80_min;
    v.chargingDC.kWh_added_30min = ref.result.kWh_30min;
    v.chargingDC.confidence = "tested";
    v.chargingCurve = ref.result.chargingCurve;
  }

  if (JSON.stringify(v) !== before) {
    report.vehicles.push(`${v.slug} (${measured.size} config${measured.size > 1 ? "s" : ""}${ref ? ", modèle" : ""})`);
    if (!DRY) fs.writeFileSync(filePath, (JSON.stringify(v, null, 2) + "\n").replace(/\n/g, eol), "utf8");
  }
}

console.log(report.deltas.join("\n"));
console.log(`\n${report.measuredConfigs} configurations mesurées, ${report.vehicles.length} fiches${DRY ? " (simulation)" : ""}`);
if (report.missingCars.length) console.log("Courbes introuvables :\n  " + report.missingCars.join("\n  "));
if (report.unusable.length) console.log("Relevés trop courts :\n  " + report.unusable.join("\n  "));
if (report.missingConfigs.length) console.log("Configs introuvables :\n  " + report.missingConfigs.join("\n  "));
