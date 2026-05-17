// Régénération des fiches Peugeot — tarifs officiels PDF avril/mai 2026
// Option C : toutes les configurations (batterie × finition) déclinées.

import fs from "node:fs";
import path from "node:path";

const DIR = "src/data/vehicles";
const TODAY = "2026-05-17";

// --- Génère une courbe DC plausible scalée sur le pic ---
function curve(peakKw) {
  if (!peakKw) return [{ soc: 0, power: 0 }, { soc: 100, power: 0 }];
  const top = Math.round(peakKw);
  return [
    { soc: 0,   power: Math.max(1, Math.round(peakKw * 0.92)) },
    { soc: 10,  power: top },
    { soc: 20,  power: top },
    { soc: 50,  power: Math.max(1, Math.round(peakKw * 0.71)) },
    { soc: 80,  power: Math.max(1, Math.round(peakKw * 0.32)) },
    { soc: 100, power: Math.max(1, Math.round(peakKw * 0.06)) },
  ];
}

// --- Crée une config à partir d'une combinaison ---
function makeConfig({ slug, trimName, batteryKind, wheels, price, batt }) {
  const cfgId = `${slug}-${trimName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${batt.usable}`;
  return {
    id: cfgId,
    label: `${trimName} · ${batt.usable} kWh`,
    battery: batteryKind,
    trim: trimName,
    wheelSize_inches: wheels,
    tyreType: "summer",
    options: [],
    price_EUR: price,
    monthlyLease_EUR: null,
    leasingSocialEligible: false,
    wltp_km: batt.wltp,
    wltp_consumption_kWh_100km: batt.conso ?? 15.5,
    realRange: {
      mixed_km: batt.real.mixed,
      highway_130_km: batt.real.hw130,
      urban_km: batt.real.urban,
      winter_minus5_km: batt.real.win,
      confidence: batt.confidence ?? "estimated",
    },
    rangeTests: [],
    chargingDC_peak_kW: batt.dcPeak,
    chargingDC_10_80_min: batt.dc10_80,
    chargingDC_kWh_30min: batt.dc30,
    chargingCurve: curve(batt.dcPeak),
    availability: "available",
    notes: null,
  };
}

// --- Génère tous les trims + toutes les configs depuis la déf compacte ---
function build(spec) {
  const { slug, batteries, trims, leasingSocial } = spec;
  const flatTrims = [];
  const configurations = [];
  for (const trim of trims) {
    for (const [battKind, price] of Object.entries(trim.prices)) {
      const batt = batteries.find(b => b.kind === battKind);
      if (!batt) continue;
      flatTrims.push({
        name: `${trim.name} ${batt.usable} kWh`,
        price_EUR: price,
        batteryUsed: `${batt.usable} kWh`,
        equipmentHighlights: trim.highlights ?? ["Configuration constructeur"],
      });
      configurations.push(makeConfig({
        slug, trimName: trim.name, batteryKind: battKind,
        wheels: trim.wheels, price, batt,
      }));
    }
  }
  // Reference battery = larger
  const ref = batteries.reduce((a, b) => (b.usable > a.usable ? b : a));
  return { flatTrims, configurations, ref, leasingSocial };
}

// --- Patche un fichier existant en gardant dimensions / verdict / keyFeatures ---
function patch(slug, spec, overrides = {}) {
  const fp = path.join(DIR, slug + ".json");
  const v = JSON.parse(fs.readFileSync(fp, "utf8"));
  const { flatTrims, configurations, ref, leasingSocial } = build(spec);

  v.variant = spec.variant;
  v.power_kW = spec.powerKW;
  v.power_hp = spec.powerHp;
  v.torque_Nm = spec.torque ?? v.torque_Nm;
  v.drivetrain = spec.drivetrain ?? v.drivetrain;
  v.acceleration_0_100_s = spec.accel ?? v.acceleration_0_100_s;
  v.topSpeed_kmh = spec.vmax ?? v.topSpeed_kmh;
  v.usableCapacity_kWh = ref.usable;
  v.grossCapacity_kWh = ref.gross ?? null;
  v.chemistry = spec.chemistry ?? v.chemistry;
  v.wltp_max_km = Math.max(...spec.batteries.map(b => b.wltp));
  v.wltp_min_km = Math.min(...spec.batteries.map(b => b.wltp));
  v.realRange = {
    mixed_km: ref.real.mixed,
    highway_130_km: ref.real.hw130,
    urban_km: ref.real.urban,
    winter_minus5_km: ref.real.win,
    confidence: ref.confidence ?? "estimated",
  };
  v.consumption_mixed_kWh_per_100km = ref.conso ?? 15.5;
  v.chargingDC = {
    peakPower_kW: ref.dcPeak,
    time_10_80_min: ref.dc10_80,
    kWh_added_30min: ref.dc30,
    confidence: "estimated",
  };
  v.chargingCurve = curve(ref.dcPeak);
  v.trims = flatTrims;
  v.configurations = configurations;
  v.leasingSocialEligible = !!leasingSocial;
  v.productionCountry = spec.country ?? v.productionCountry;
  v.assemblyPlant = spec.plant ?? v.assemblyPlant;
  // Prime CEE VE seulement si produit en UE ET prix ≤ 47000
  const cheapest = Math.min(...flatTrims.map(t => t.price_EUR));
  const EU = ["France","Allemagne","Slovaquie","Rép. Tchèque","Pologne","Espagne","Italie","Belgique","Suède","Slovénie","Hongrie","Autriche","Portugal"];
  if (EU.includes(v.productionCountry) && cheapest <= 47000) {
    if (!v.availableAids?.some(a => /prime\s*cee/i.test(a.label))) {
      v.availableAids = [...(v.availableAids ?? []), { label: "Prime CEE VE", amount_EUR: 4000 }];
    }
  } else {
    v.availableAids = (v.availableAids ?? []).filter(a => !/prime\s*cee/i.test(a.label));
  }
  Object.assign(v, overrides);
  v.lastUpdated = TODAY;
  fs.writeFileSync(fp, JSON.stringify(v, null, 2) + "\n");
  console.log("✓", slug, "—", flatTrims.length, "trims /", configurations.length, "configs / dès", cheapest, "€");
}

// ============================================================
//   DÉFINITIONS PEUGEOT — données extraites des PDF officiels
// ============================================================

// e-208 — tarif 01/04/2026 — 2 batteries
patch("peugeot-e-208", {
  slug: "peugeot-e-208",
  variant: "50 / 54 kWh",
  powerKW: 115, powerHp: 156, torque: 260, accel: 8.2, vmax: 150,
  country: "Slovaquie", plant: "Trnava",
  batteries: [
    { kind: "standard", usable: 50, gross: 51, wltp: 360,
      dcPeak: 100, dc10_80: 30, dc30: 32, conso: 14.8,
      real: { mixed: 290, hw130: 190, urban: 350, win: 220 } },
    { kind: "long-range", usable: 54, gross: 55, wltp: 410,
      dcPeak: 100, dc10_80: 30, dc30: 34, conso: 14.6,
      real: { mixed: 330, hw130: 215, urban: 395, win: 250 } },
  ],
  trims: [
    { name: "Style",        wheels: 16, highlights: ["Climatisation auto", "i-Cockpit 10\""],
      prices: { standard: 28400 } },
    { name: "Allure",       wheels: 16, highlights: ["Caméra recul", "Pack Drive Assist"],
      prices: { standard: 36500 } },
    { name: "GT",           wheels: 17, highlights: ["Batterie 54 kWh exclusive · i-Cockpit 3D"],
      prices: { "long-range": 39700 } },
    { name: "GT Exclusive", wheels: 17, highlights: ["Batterie 54 kWh · toit pano · sièges chauffants"],
      prices: { "long-range": 41600 } },
  ],
  leasingSocial: true,
});

// e-2008 — tarif 02/03/2026 — 1 batterie 54 kWh
patch("peugeot-e-2008", {
  slug: "peugeot-e-2008",
  variant: "54 kWh",
  powerKW: 115, powerHp: 156, torque: 260, accel: 8.6, vmax: 150,
  country: "Espagne", plant: "Vigo",
  batteries: [
    { kind: "standard", usable: 54, gross: 55, wltp: 406,
      dcPeak: 100, dc10_80: 30, dc30: 34, conso: 15.2,
      real: { mixed: 310, hw130: 200, urban: 380, win: 240 } },
  ],
  trims: [
    { name: "Style",        wheels: 17, highlights: ["Climatisation auto", "i-Cockpit"], prices: { standard: 38500 } },
    { name: "Allure",       wheels: 17, highlights: ["Caméra recul", "i-Cockpit 10\""], prices: { standard: 40300 } },
    { name: "GT",           wheels: 18, highlights: ["i-Cockpit 3D", "ADML niveau 2"], prices: { standard: 42200 } },
    { name: "GT Exclusive", wheels: 18, highlights: ["Toit pano ouvrant", "Sièges AGR"], prices: { standard: 44100 } },
  ],
  leasingSocial: true,
});

// e-308 (berline + SW mêmes tarifs) — 04/05/2026 — 1 batterie 55 kWh
patch("peugeot-e-308", {
  slug: "peugeot-e-308",
  variant: "Berline & SW · 55 kWh",
  powerKW: 115, powerHp: 156, torque: 260, accel: 8.5, vmax: 170,
  country: "France", plant: "Mulhouse",
  batteries: [
    { kind: "standard", usable: 55, gross: 58, wltp: 450,
      dcPeak: 100, dc10_80: 30, dc30: 36, conso: 14.7,
      real: { mixed: 350, hw130: 230, urban: 420, win: 275 } },
  ],
  trims: [
    { name: "Berline Style",        wheels: 17, highlights: ["i-Cockpit", "Pack Drive Assist"],            prices: { standard: 42600 } },
    { name: "Berline Allure",       wheels: 17, highlights: ["i-Cockpit 10\"", "Caméra recul"],            prices: { standard: 44000 } },
    { name: "Berline GT",           wheels: 18, highlights: ["i-Cockpit 3D", "Pack Drive Assist Plus"],   prices: { standard: 46350 } },
    { name: "Berline GT Exclusive", wheels: 18, highlights: ["Toit pano", "Sièges AGR chauffants"],        prices: { standard: 47950 } },
    { name: "SW Style",             wheels: 17, highlights: ["Break · coffre 608 L"],                     prices: { standard: 42600 } },
    { name: "SW Allure",            wheels: 17, highlights: ["Break · i-Cockpit 10\""],                   prices: { standard: 44000 } },
    { name: "SW GT",                wheels: 18, highlights: ["Break · i-Cockpit 3D"],                     prices: { standard: 46350 } },
    { name: "SW GT Exclusive",      wheels: 18, highlights: ["Break · toit pano · Sièges AGR"],           prices: { standard: 47950 } },
  ],
  leasingSocial: true,
});

// e-3008 — 04/05/2026 — 3 motorisations
// Note: les 4x4 sont modélisées via le trim name (le schéma ne porte pas le drivetrain par config)
patch("peugeot-e-3008", {
  slug: "peugeot-e-3008",
  variant: "73 / 97 kWh · FWD/AWD",
  powerKW: 240, powerHp: 325, torque: 509, accel: 6.4, vmax: 170,
  country: "France", plant: "Sochaux",
  batteries: [
    { kind: "standard", usable: 73, gross: 78, wltp: 527,
      dcPeak: 160, dc10_80: 30, dc30: 50, conso: 16.0,
      real: { mixed: 410, hw130: 285, urban: 490, win: 320 } },
    { kind: "long-range", usable: 97, gross: 98, wltp: 700,
      dcPeak: 160, dc10_80: 35, dc30: 60, conso: 16.5,
      real: { mixed: 540, hw130: 380, urban: 640, win: 420 } },
  ],
  trims: [
    { name: "Allure 210 ch",       wheels: 19, highlights: ["FWD 210 ch", "Panoramic i-Cockpit"],                prices: { standard: 45090 } },
    { name: "GT 210 ch",           wheels: 19, highlights: ["FWD 210 ch", "Sièges AGR · pack Drive Assist Plus"], prices: { standard: 46990 } },
    { name: "GT Exclusive 210 ch", wheels: 20, highlights: ["FWD 210 ch", "Hi-Fi Focal · toit pano"],            prices: { standard: 49790 } },
    { name: "Allure 230 ch GA",    wheels: 19, highlights: ["FWD 230 ch · Grande Autonomie 700 km WLTP"],         prices: { "long-range": 46990 } },
    { name: "GT 230 ch GA",        wheels: 19, highlights: ["FWD 230 ch GA · pack Drive Assist Plus"],            prices: { "long-range": 51390 } },
    { name: "GT Exclusive 230 ch GA", wheels: 20, highlights: ["FWD 230 ch GA · Hi-Fi Focal · toit pano"],        prices: { "long-range": 54190 } },
    { name: "GT 325 ch AWD",       wheels: 20, highlights: ["AWD 325 ch · 0–100 km/h en 6,4 s"],                 prices: { standard: 50890 } },
    { name: "GT Exclusive 325 ch AWD", wheels: 20, highlights: ["AWD 325 ch · top Peugeot · Hi-Fi Focal"],        prices: { standard: 53190 } },
  ],
  leasingSocial: false,
});

// e-408 — 04/05/2026 — 1 batterie 58 kWh
patch("peugeot-e-408", {
  slug: "peugeot-e-408",
  variant: "58 kWh",
  powerKW: 155, powerHp: 210, torque: 345, accel: 7.5, vmax: 170,
  country: "France", plant: "Mulhouse",
  batteries: [
    { kind: "standard", usable: 58, gross: 61, wltp: 453,
      dcPeak: 120, dc10_80: 30, dc30: 40, conso: 15.4,
      real: { mixed: 355, hw130: 235, urban: 425, win: 280 } },
  ],
  trims: [
    { name: "Allure",       wheels: 19, highlights: ["i-Cockpit 10\"", "Caméra recul"],         prices: { standard: 42700 } },
    { name: "GT",           wheels: 19, highlights: ["i-Cockpit 3D", "ADML niveau 2"],          prices: { standard: 45250 } },
    { name: "GT Exclusive", wheels: 20, highlights: ["Toit pano", "Hi-Fi Focal · sièges AGR"], prices: { standard: 47600 } },
  ],
  leasingSocial: false,
});

// e-5008 — 04/05/2026 — 3 motorisations (même base que 3008)
patch("peugeot-e-5008", {
  slug: "peugeot-e-5008",
  variant: "73 / 97 kWh · 7 places · FWD/AWD",
  powerKW: 240, powerHp: 325, torque: 509, accel: 6.4, vmax: 170,
  country: "France", plant: "Sochaux",
  batteries: [
    { kind: "standard", usable: 73, gross: 78, wltp: 502,
      dcPeak: 160, dc10_80: 30, dc30: 50, conso: 16.5,
      real: { mixed: 395, hw130: 270, urban: 475, win: 310 } },
    { kind: "long-range", usable: 97, gross: 98, wltp: 668,
      dcPeak: 160, dc10_80: 35, dc30: 60, conso: 17.0,
      real: { mixed: 510, hw130: 360, urban: 615, win: 400 } },
  ],
  trims: [
    { name: "Allure 210 ch",       wheels: 19, highlights: ["FWD 210 ch · 7 places"], prices: { standard: 46690 } },
    { name: "GT 210 ch",           wheels: 19, highlights: ["FWD 210 ch · 7 places · Hi-Fi"], prices: { standard: 51490 } },
    { name: "GT Exclusive 210 ch", wheels: 20, highlights: ["FWD 210 ch · 7 places · toit pano"], prices: { standard: 54290 } },
    { name: "Allure 230 ch GA",    wheels: 19, highlights: ["FWD 230 ch · 7 places · Grande Autonomie"], prices: { "long-range": 51290 } },
    { name: "GT 230 ch GA",        wheels: 19, highlights: ["FWD 230 ch GA · 7 places · Hi-Fi Focal"], prices: { "long-range": 55890 } },
    { name: "GT Exclusive 230 ch GA", wheels: 20, highlights: ["FWD 230 ch GA · 7 places · toit pano"], prices: { "long-range": 58690 } },
    { name: "GT 325 ch AWD",       wheels: 20, highlights: ["AWD 325 ch · 7 places · Hi-Fi"], prices: { standard: 55390 } },
    { name: "GT Exclusive 325 ch AWD", wheels: 20, highlights: ["AWD 325 ch · 7 places · toit pano"], prices: { standard: 57690 } },
  ],
  leasingSocial: false,
});

// e-Rifter — tarif 2026 — 1 batterie 54 kWh, M/XL × Allure/GT
patch("peugeot-e-rifter", {
  slug: "peugeot-e-rifter",
  variant: "M / XL · 54 kWh",
  powerKW: 100, powerHp: 136, torque: 270, accel: 11.7, vmax: 135,
  country: "Espagne", plant: "Vigo",
  batteries: [
    { kind: "standard", usable: 54, gross: 55, wltp: 343,
      dcPeak: 100, dc10_80: 32, dc30: 32, conso: 18.5,
      real: { mixed: 250, hw130: 160, urban: 320, win: 200 } },
  ],
  trims: [
    { name: "M Allure",  wheels: 16, highlights: ["5 places · 775 L coffre"], prices: { standard: 38250 } },
    { name: "M GT",      wheels: 17, highlights: ["5 places · sièges chauffants"], prices: { standard: 42550 } },
    { name: "XL Allure", wheels: 16, highlights: ["5 places (7 en option) · empattement long"], prices: { standard: 39250 } },
    { name: "XL GT",     wheels: 17, highlights: ["5 places (7 en option) · top gamme"], prices: { standard: 43550 } },
  ],
  leasingSocial: false,
});

// e-Traveller — Business + Business Pack × M/XL × 49/75 kWh
patch("peugeot-e-traveller", {
  slug: "peugeot-e-traveller",
  variant: "M / XL · 49 / 75 kWh",
  powerKW: 100, powerHp: 136, torque: 260, accel: 13.3, vmax: 130,
  country: "France", plant: "Hordain",
  batteries: [
    { kind: "standard", usable: 49, gross: 50, wltp: 230,
      dcPeak: 100, dc10_80: 32, dc30: 30, conso: 21.5,
      real: { mixed: 175, hw130: 110, urban: 220, win: 140 } },
    { kind: "long-range", usable: 75, gross: 78, wltp: 350,
      dcPeak: 100, dc10_80: 45, dc30: 40, conso: 22.0,
      real: { mixed: 270, hw130: 175, urban: 335, win: 215 } },
  ],
  trims: [
    { name: "M Business",       wheels: 17, highlights: ["8 places · navette VIP"],            prices: { standard: 53720, "long-range": 59720 } },
    { name: "XL Business",      wheels: 17, highlights: ["8 places · empattement long"],        prices: { standard: 54720, "long-range": 60720 } },
    { name: "M Business Pack",  wheels: 17, highlights: ["8 places · finition haut de gamme"],  prices: { standard: 61870, "long-range": 67870 } },
    { name: "XL Business Pack", wheels: 17, highlights: ["8 places · empattement long · top"],  prices: { standard: 62870, "long-range": 68870 } },
  ],
  leasingSocial: false,
});

console.log("\nTerminé. Lancer `npm run build` pour valider.");
