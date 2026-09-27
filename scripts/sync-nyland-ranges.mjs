/**
 * Synchronise les autonomies mesurées par Bjørn Nyland (90 et 120 km/h) dans les fiches.
 *
 * Usage :
 *   node scripts/download-nyland.mjs        # met à jour scratch/bjorn_*.csv
 *   node scripts/sync-nyland-ranges.mjs     # applique aux JSON (--dry pour simuler)
 *
 * Règles :
 * - Une configuration n'est « mesurée » que si Nyland a testé la même batterie (et la même
 *   transmission quand il existe plusieurs essais) : table MAPPING ci-dessous, tenue à la main.
 * - Pour une config mesurée (essais à 90 ET 120 km/h d'une même session) :
 *   mixed_km = moyenne des autonomies Nyland à 90 et 120 km/h. Ce « mixte route + autoroute »
 *   reste comparable aux autonomies estimées (≈ 0,8 × WLTP), contrairement au seul 90 km/h
 *   d'été, proche du WLTP. highway_120_km = mesure à 120 km/h ; ville, 130 km/h et hiver en sont
 *   dérivés. confidence = "bjorn_nyland".
 * - Une config sans essai Nyland garde ses autres essais sourcés (confidence "tested"), sinon
 *   repasse en "estimated" (ou reste "manufacturer").
 */
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const VEHICLES_DIR = "src/data/vehicles";
const CSV_PATH = "scratch/bjorn_range.csv";

// slug → [{ car: nom exact dans le tableau Nyland, configs: suffixes d'id de configuration }]
const MAPPING = {
  "audi-a6-e-tron": [{ car: "Audi A6 e-tron Sportback Quattro", configs: ["design-quattro", "sline-quattro"] }],
  "audi-s6-e-tron": [{ car: "Audi S6 e-tron Avant", configs: ["avant"] }],
  "audi-e-tron-gt": [{ car: "2024 Audi RS e-tron GT", configs: ["rs-etron-gt"] }],
  "audi-q4-e-tron": [
    { car: "Audi Q4 e-tron Sportback 45 Quattro", configs: ["sportback-quattro"] },
    { car: "Audi Q4 e-tron 45 Quattro", configs: ["etron-quattro"] },
  ],
  "audi-q6-e-tron": [
    { car: "2026 Audi Q6 e-tron Quattro", configs: ["quattro-design", "quattro-sline"] },
    { car: "Audi Q6 e-tron Sportback Quattro", configs: ["sportback-quattro-design", "sportback-quattro-sline"] },
    { car: "Audi SQ6 e-tron", configs: ["sq6-e-tron"] },
  ],
  "bmw-i4": [
    { car: "BMW i4 eDrive40", configs: ["edrive40-base", "edrive40-msport"] },
    { car: "BMW i4 M50", configs: ["m50-msport"] },
  ],
  "bmw-i5": [{ car: "BMW i5 M60", configs: ["m60"] }],
  "bmw-i7": [{ car: "BMW i7 xDrive60", configs: ["xdrive60"] }],
  "bmw-ix": [
    { car: "BMW iX xDrive40", configs: ["xdrive40"] },
    { car: "BMW iX xDrive50", configs: ["xdrive50"] },
  ],
  "bmw-ix1": [{ car: "BMW iX1 xDrive30", configs: ["xdrive30-base", "xdrive30-xline", "xdrive30-msport"] }],
  "bmw-ix2": [{ car: "BMW iX2 xDrive30", configs: ["xdrive30-base", "xdrive30-msport"] }],
  "bmw-ix3-neue-klasse": [{ car: "BMW iX3 50 xDrive", configs: ["50"] }],
  "byd-atto-3": [{ car: "BYD Atto 3 60 kWh", configs: ["design", "excellence"] }],
  "byd-dolphin": [{ car: "BYD Dolphin", configs: ["comfort", "design"] }],
  "byd-seal-u": [{ car: "BYD Seal U", configs: ["design"] }],
  "byd-seal": [{ car: "BYD Seal Performance", configs: ["excellence-awd"] }],
  "citroen-e-c3": [{ car: "Citroen e-C3", configs: ["you-44", "max-44"] }],
  "citroen-e-c4": [
    { car: "Citroen e-C4", configs: ["you-136", "plus-136"] },
    { car: "Citroen e-C4X", configs: ["x-plus-156", "x-max-156"] },
  ],
  "citroen-e-spacetourer": [{ car: "Citroen e-Spacetourer", configs: ["business-75-m", "business-75-xl"] }],
  "cupra-born": [
    { car: "Cupra Born 58", configs: ["58-kwh-e-boost-170-kw--58"] },
    { car: "Cupra Born 82 kWh", configs: ["77-kwh-e-boost-170-kw--77"] },
  ],
  "cupra-tavascan": [{ car: "Cupra Tavascan VZ Adrenaline", configs: ["vz-awd-250-kw--77"] }],
  "fiat-500e": [{ car: "Fiat 500e", configs: ["pop-42", "red-42", "la-prima-42"] }],
  "fiat-600e": [{ car: "Fiat 600e", configs: ["red-54", "la-prima-54"] }],
  "ford-capri": [{ car: "Ford Capri", configs: ["77", "premium-77"] }],
  "ford-explorer": [{ car: "Ford Explorer", configs: ["77", "premium-77"] }],
  "ford-mustang-mach-e": [
    { car: "Ford Mustang Mach-E LR RWD", configs: ["er"] },
    { car: "Ford Mustang Mach-E GT", configs: ["gt"] },
  ],
  "ford-puma-gen-e": [{ car: "Ford Puma 2025", configs: ["titanium", "stline", "vignale"] }],
  "hyundai-inster": [{ car: "Hyundai Inster", configs: ["intuitive-49", "creative-49", "cross-creative-49", "cross-executive-49"] }],
  "hyundai-ioniq-5": [{ car: "Hyundai Ioniq 5 AWD 84 kWh", configs: ["n-line-awd-84"] }],
  "hyundai-ioniq-6": [{ car: "Hyundai Ioniq 6 RWD", configs: ["intuitive-77", "creative-77", "executive-77"] }],
  "hyundai-ioniq-9": [{ car: "Hyundai Ioniq 9 LR AWD", configs: ["executive-110", "calligraphy-110"] }],
  "hyundai-kona": [{ car: "Hyundai Kona 65 kWh MY2024", configs: ["creative-65", "ultime-65", "n-line-creative-65", "n-line-executive-65"] }],
  "jeep-avenger": [{ car: "Jeep Avenger", configs: ["longitude-54", "altitude-54", "summit-54"] }],
  "kia-ev3": [{ car: "Kia EV3 Long Range FWD", configs: ["long-range-air", "long-range-earth", "long-range-gt-line"] }],
  "kia-ev4": [{ car: "Kia EV4 Long Range FWD", configs: ["lr-air-17", "lr-earth-17", "lr-gt-line-19"] }],
  "kia-ev5": [{ car: "Kia EV5 Long Range FWD", configs: ["lr-air", "lr-earth", "lr-gt-line"] }],
  "kia-ev9": [{ car: "Kia EV9 GT-Line", configs: ["gt-line"] }],
  "kia-pv5-passenger": [{ car: "Kia PV5 Passenger", configs: ["active"] }],
  "leapmotor-b10": [{ car: "Leapmotor B10", configs: ["design"] }],
  "leapmotor-c10": [{ car: "Leapmotor C10", configs: ["style", "design"] }],
  "mazda-6e": [{ car: "Mazda 6e Standard Range", configs: ["takumi-69", "takumi-plus-69"] }],
  "mercedes-cla": [{ car: "Mercedes CLA 350 4Matic", configs: ["350-4matic-amg"] }],
  "mercedes-classe-g": [{ car: "Mercedes G580", configs: ["580-edition-one"] }],
  "mercedes-eqe": [
    { car: "Mercedes EQE 300", configs: ["300-executive", "300-amg"] },
    { car: "Mercedes EQE 43 AMG", configs: ["43"] },
    { car: "Mercedes EQE 53 4Matic+", configs: ["53-amg"] },
  ],
  "mercedes-eqe-suv": [{ car: "Mercedes EQE 350 4Matic SUV", configs: ["350-amg"] }],
  "mercedes-eqs": [
    { car: "Mercedes EQS 450+", configs: ["450-avantgarde", "450-amg"] },
    { car: "Mercedes EQS 580 4Matic", configs: ["580-amg"] },
    { car: "Mercedes EQS 53 4Matic+", configs: ["amg-53"] },
  ],
  "mercedes-eqs-suv": [{ car: "Mercedes EQS 580 4Matic SUV", configs: ["580-amg"] }],
  "mercedes-eqv": [{ car: "Mercedes EQV 300", configs: ["tourer-pro", "tourer-avantgarde"] }],
  // "mercedes-glb" : Nyland a testé le nouveau GLB (88,6 kWh), pas la génération de la fiche (70,5 kWh)
  "mercedes-glc": [{ car: "Mercedes GLC 400", configs: ["pro", "amg"] }],
  "mg-cyberster": [{ car: "MG Cyberster", configs: ["gt-awd"] }],
  "mg-im5": [{ car: "MG IM5 100 kWh AWD", configs: ["long-range"] }],
  "mg-im6": [
    { car: "MG IM6 75 kWh RWD", configs: ["standard"] },
    { car: "MG IM6 100 kWh AWD", configs: ["long-range"] },
  ],
  "mg-marvel-r": [{ car: "MG Marvel R Performance", configs: ["performance"] }],
  "mg-mg4": [
    { car: "MG4 51 kWh", configs: ["standard"] },
    { car: "MG4 Long Range", configs: ["luxury"] },
    { car: "MG4 XPower", configs: ["xpower"] },
  ],
  "mg-mg5": [{ car: "MG5", configs: ["luxury-61"] }],
  "mg-zs-ev": [{ car: "MG ZS EV 72 kWh", configs: ["comfort-70", "luxury-70"] }],
  "mini-cooper": [{ car: "2024 Mini Cooper SE", configs: ["se-classic"] }],
  "mini-countryman": [{ car: "Mini Countryman SE All4", configs: ["se-classic"] }],
  "nio-et5": [{ car: "Nio ET5 100 kWh", configs: ["100"] }],
  "nio-et7": [{ car: "Nio ET7 100 kWh", configs: ["100"] }],
  "nissan-ariya": [
    { car: "Nissan Ariya 63 kWh", configs: ["engage-63", "advance-63"] },
    { car: "Nissan Ariya 87 kWh FWD", configs: ["evolve-87"] },
  ],
  "nissan-leaf": [{ car: "Nissan Leaf 75 kWh", configs: ["advance-75", "ndesign-75"] }],
  "nissan-micra": [{ car: "Nissan Micra 55 kWh", configs: ["nconnecta-52"] }],
  "opel-astra": [{ car: "Opel Astra-e Tourer", configs: ["sports-tourer-gs-54", "sports-tourer-ultimate-54"] }],
  "opel-corsa-electric": [{ car: "Opel Corsa-e", configs: ["edition-50", "gs-50"] }],
  "opel-mokka-electric": [{ car: "Opel Mokka-e", configs: ["edition-50", "gs-50"] }],
  "peugeot-e-208": [{ car: "Peugeot e-208 GT", configs: ["style-50", "allure-50"] }],
  "peugeot-e-5008": [{ car: "Peugeot e-5008", configs: ["allure-210-ch-73", "gt-210-ch-73", "gt-exclusive-210-ch-73"] }],
  "polestar-2": [
    { car: "Polestar 2 LR SM refresh", configs: ["lr-sm"] },
    { car: "2024 Polestar 2 LR DM", configs: ["lr-dm"] },
  ],
  "polestar-3": [
    { car: "Polestar 3 LR DM", configs: ["lr-dm"] },
    { car: "Polestar 3 LR Performance", configs: ["lr-dm-perf"] },
  ],
  "polestar-4": [{ car: "Polestar 4 LR DM", configs: ["lr-dm"] }],
  "porsche-macan-electric": [{ car: "Porsche Macan 4", configs: ["porsche-macan-4"] }],
  "renault-5": [{ car: "Renault 5 E-Tech 55 kWh", configs: ["evolution-52", "techno-52", "iconic-cinq-52"] }],
  "renault-megane": [{ car: "Renault Megane E-Tech 60 kWh", configs: ["techno", "esprit-alpine", "iconic"] }],
  "renault-scenic": [{ car: "Renault Scenic E-Tech 92 kWh", configs: ["techno-ev87", "esprit-alpine-ev87", "iconic-ev87"] }],
  "skoda-enyaq": [{ car: "Skoda Enyaq Coupé 85x 2025", configs: ["85x-210-kw-awd--77"] }],
  "smart-1": [{ car: "Smart #1 Brabus", configs: ["brabus-66"] }],
  "smart-3": [{ car: "Smart #3 Brabus", configs: ["brabus-66"] }],
  "smart-5": [{ car: "Smart #5 Brabus", configs: ["brabus"] }],
  "tesla-model-3": [
    { car: "Tesla Model 3 RWD Highland", configs: ["propulsion"] },
    { car: "Tesla Model 3 LR RWD Highland", configs: ["grande-autonomie-prop"] },
    { car: "Tesla Model 3 LR Highland", configs: ["grande-autonomie-awd"] },
    { car: "Tesla Model 3 Performance Highland", configs: ["performance-awd"] },
  ],
  "tesla-model-y": [
    { car: "Tesla Model Y LR RWD Juniper", configs: ["grande-autonomie-prop"] },
    { car: "Tesla Model Y LR Juniper", configs: ["grande-autonomie-awd"] },
    { car: "Tesla Model Y Performance Juniper", configs: ["performance"] },
  ],
  "volvo-ex30": [
    { car: "Volvo EX30 RWD ER", configs: ["plus-sm-er", "ultra-sm-er"] },
    { car: "Volvo EX30 Twin Performance", configs: ["plus-tm"] },
  ],
  "volvo-ex40": [{ car: "Volvo XC40 82 kWh AWD", configs: ["plus-tm"] }],
  "volvo-ex90": [{ car: "Volvo EX90 Twin Ultra", configs: ["ultra-tm"] }],
  "volvo-es90": [{ car: "Volvo ES90 RWD 92 kWh", configs: ["plus-sm", "ultra-sm"] }],
  "vw-id-buzz": [
    { car: "VW ID Buzz 82 kWh", configs: ["5-places"] },
    { car: "VW ID Buzz LWB GTX", configs: ["gtx-awd"] },
  ],
  "vw-id3": [
    { car: "2025 VW ID3 Pure 55 kWh", configs: ["trend-50", "life-50"] },
    { car: "VW ID3 Pro 62 kWh facelift", configs: ["life-58", "style-58"] },
  ],
  "vw-id5": [{ car: "VW ID5 GTX 82 kWh", configs: ["gtx"] }],
  "vw-id7": [
    { car: "VW ID7 Pro", configs: ["pro"] },
    { car: "VW ID7 Tourer Pro", configs: ["tourer"] },
  ],
  "xpeng-g6": [{ car: "Xpeng G6 Performance 2025", configs: ["performance"] }],
  "xpeng-g9": [{ car: "Xpeng G9 Performance 2025", configs: ["performance"] }],
  "xpeng-p7-plus": [{ car: "Xpeng P7+ LR RWD", configs: ["long-range"] }],
  "zeekr-001": [{ car: "Zeekr 001 AWD", configs: ["lr-awd"] }],
  "zeekr-7x": [{ car: "Zeekr 7X Performance AWD", configs: ["privilege-100"] }],
  "zeekr-x": [
    { car: "Zeekr X LR RWD 2026", configs: ["lr-61"] },
    { car: "Zeekr X AWD", configs: ["privilege-69"] },
  ],
};

/* ── Lecture du tableau Nyland ─────────────────────────────── */
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
  return out;
}
const num = (s) => {
  const n = parseFloat(String(s ?? "").replace("−", "-").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const lines = fs.readFileSync(CSV_PATH, "utf8").split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.trim());
const rowsByCar = new Map();
for (const line of lines.slice(1)) {
  const values = parseLine(line);
  const row = Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").trim()]));
  if (!rowsByCar.has(row.Car)) rowsByCar.set(row.Car, []);
  rowsByCar.get(row.Car).push(row);
}

/**
 * Choisit la session à retenir : une paire 90 + 120 km/h de la même session (même saison,
 * températures les plus proches), l'été en priorité. null si aucune paire complète.
 */
function pickSession(rows) {
  const isSummer = (r) => /summer/i.test(r.Season);
  let best = null;
  for (const r120 of rows.filter((r) => num(r.Speed) === 120)) {
    for (const r90 of rows.filter((r) => num(r.Speed) === 90 && isSummer(r) === isSummer(r120))) {
      const score = (isSummer(r120) ? 0 : 100) + Math.abs(num(r90.Temp) - num(r120.Temp));
      if (!best || score < best.score) best = { r90, r120, score };
    }
  }
  return best ? { r90: best.r90, r120: best.r120 } : null;
}

function toTest(row, car) {
  const wheel = String(row["Wheel front"] || "").match(/(\d{2})(?:\D*)$/);
  const season = /summer/i.test(row.Season) ? "été" : "hiver";
  return {
    sourceId: "nyland",
    testDate: null,
    speed_kmh: num(row.Speed),
    range_km: Math.round(num(row.km)),
    consumption_kWh_100km: Math.round(num(row["Wh/km"])) / 10,
    temperature_C: num(row.Temp),
    wheelSize_inches: wheel ? Number(wheel[1]) : null,
    tyreModel: row.Tires || null,
    protocol: "nyland",
    videoUrl: null,
    notes: `Essai Nyland « ${car} » (${season}, route ${/dry/i.test(row.Surface) ? "sèche" : "humide"}).`,
  };
}

const isNyland = (t) => t.sourceId === "nyland" || t.protocol === "nyland";
const isMeasuredOther = (t) => !isNyland(t) && t.protocol !== "wltp" && t.protocol !== "manufacturer" && t.protocol !== "epa";

/* ── Application aux fiches ────────────────────────────────── */
const report = { updatedConfigs: 0, measuredVehicles: [], downgraded: [], missingCars: [], missingConfigs: [] };

for (const file of fs.readdirSync(VEHICLES_DIR).filter((f) => f.endsWith(".json"))) {
  const filePath = path.join(VEHICLES_DIR, file);
  const v = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const before = JSON.stringify(v);
  const mapping = MAPPING[v.slug] ?? [];

  // Suffixe d'id → essais Nyland (90 / 120)
  const testsByConfig = new Map();
  for (const { car, configs } of mapping) {
    const rows = rowsByCar.get(car);
    if (!rows) { report.missingCars.push(`${v.slug}: ${car}`); continue; }
    const session = pickSession(rows);
    if (!session) { report.missingCars.push(`${v.slug}: ${car} (pas de paire 90/120 km/h)`); continue; }
    const tests = [session.r90, session.r120].map((r) => toTest(r, car));
    for (const suffix of configs) {
      // Plusieurs ids peuvent finir par le suffixe (« 77 » / « premium-77 ») : on garde le plus court
      const cfg = v.configurations
        .filter((c) => c.id === suffix || c.id.endsWith(`-${suffix}`))
        .sort((a, b) => a.id.length - b.id.length)[0];
      if (!cfg) { report.missingConfigs.push(`${v.slug}: ${suffix}`); continue; }
      testsByConfig.set(cfg.id, tests);
    }
  }

  const priorConfidence = v.realRange.confidence;
  for (const cfg of v.configurations) {
    const others = (cfg.rangeTests ?? []).filter((t) => !isNyland(t));
    const nyTests = testsByConfig.get(cfg.id);
    cfg.realRange = cfg.realRange ?? { ...v.realRange };
    if (nyTests?.length) {
      cfg.rangeTests = [...nyTests, ...others];
      const t90 = nyTests.find((t) => t.speed_kmh === 90);
      const t120 = nyTests.find((t) => t.speed_kmh === 120);
      const rr = cfg.realRange;
      rr.mixed_km = Math.round((t90.range_km + t120.range_km) / 2);
      rr.highway_120_km = t120.range_km;
      rr.highway_130_km = Math.round(t120.range_km * 0.9);
      rr.urban_km = Math.round(t90.range_km * 1.1);
      rr.winter_minus5_km = Math.round(rr.mixed_km * 0.75);
      rr.confidence = "bjorn_nyland";
      report.updatedConfigs++;
    } else {
      cfg.rangeTests = others;
      delete cfg.realRange.highway_120_km;
      if (others.some(isMeasuredOther)) cfg.realRange.confidence = "tested";
      else if (cfg.realRange.confidence !== "manufacturer") cfg.realRange.confidence = "estimated";
    }
  }

  // Niveau véhicule (cartes, fallback) : la config mesurée la moins chère, sinon inchangé
  const measured = v.configurations
    .filter((c) => c.realRange?.confidence === "bjorn_nyland" || c.realRange?.confidence === "tested")
    .sort((a, b) => (a.price_EUR ?? Infinity) - (b.price_EUR ?? Infinity));
  const vehicleOthers = (v.rangeTests ?? []).filter((t) => !isNyland(t));
  if (measured.length) {
    const ref = measured[0];
    v.realRange = { ...ref.realRange };
    v.rangeTests = [...(ref.rangeTests ?? []).filter(isNyland), ...vehicleOthers];
    report.measuredVehicles.push(v.slug);
  } else {
    v.rangeTests = vehicleOthers;
    delete v.realRange.highway_120_km;
    if (vehicleOthers.some(isMeasuredOther)) v.realRange.confidence = "tested";
    else if (v.realRange.confidence !== "manufacturer") v.realRange.confidence = "estimated";
  }
  if ((priorConfidence === "tested" || priorConfidence === "bjorn_nyland") && !["tested", "bjorn_nyland"].includes(v.realRange.confidence)) {
    report.downgraded.push(v.slug);
  }

  if (JSON.stringify(v) !== before && !DRY) {
    if (v.sources && measured.some((c) => c.realRange.confidence === "bjorn_nyland") && !v.sources.includes("nyland")) {
      v.sources.push("nyland");
    }
    fs.writeFileSync(filePath, JSON.stringify(v, null, 2) + "\n", "utf8");
  }
}

console.log(JSON.stringify({
  dry: DRY,
  configsMesurees: report.updatedConfigs,
  vehiculesMesures: report.measuredVehicles.length,
  retrogradesEnEstimee: report.downgraded,
  voituresNylandIntrouvables: report.missingCars,
  configsIntrouvables: report.missingConfigs,
}, null, 2));
