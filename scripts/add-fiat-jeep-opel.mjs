// Ajout Fiat + Jeep + Opel — 9 véhicules
// Plateformes Stellantis CMP/e-CMP et STLA Medium principalement.
// Prix indicatifs 2026 (à recouper avec catalogues officiels PDF).

import fs from "node:fs";
import path from "node:path";

const DIR = "src/data/vehicles";
const TODAY = "2026-05-18";

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

function makeConfig({ slug, trimName, batteryKind, wheels, price, batt, drivetrain }) {
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
    wltp_consumption_kWh_100km: batt.conso,
    realRange: {
      mixed_km: batt.real.mixed,
      highway_130_km: batt.real.hw130,
      urban_km: batt.real.urban,
      winter_minus5_km: batt.real.win,
      confidence: "estimated",
    },
    rangeTests: [],
    chargingDC_peak_kW: batt.dcPeak,
    chargingDC_10_80_min: batt.dc10_80,
    chargingDC_kWh_30min: batt.dc30,
    chargingCurve: curve(batt.dcPeak),
    availability: "available",
    notes: drivetrain === "AWD" ? "Transmission intégrale" : null,
  };
}

function generate(spec) {
  const { slug, batteries, trims, leasingSocial } = spec;
  const flatTrims = [];
  const configurations = [];
  for (const trim of trims) {
    for (const [battKind, price] of Object.entries(trim.prices)) {
      const batt = batteries.find((b) => b.kind === battKind);
      if (!batt) continue;
      flatTrims.push({
        name: `${trim.name} ${batt.usable} kWh`,
        price_EUR: price,
        batteryUsed: `${batt.usable} kWh`,
        equipmentHighlights: trim.highlights ?? ["Configuration constructeur"],
      });
      configurations.push(
        makeConfig({
          slug, trimName: trim.name, batteryKind: battKind,
          wheels: trim.wheels, price, batt, drivetrain: trim.drivetrain,
        }),
      );
    }
  }
  const ref = batteries.reduce((a, b) => (b.usable > a.usable ? b : a));
  const cheapest = Math.min(...flatTrims.map((t) => t.price_EUR));
  const EU = ["France","Allemagne","Slovaquie","Rép. Tchèque","Pologne","Espagne","Italie","Belgique","Suède","Slovénie","Hongrie","Autriche","Portugal"];
  const availableAids =
    EU.includes(spec.country) && cheapest <= 47000
      ? [{ label: "Prime CEE VE", amount_EUR: 4000 }]
      : [];

  return {
    slug, brand: spec.brand, model: spec.model, variant: spec.variant,
    bodyType: spec.bodyType, segment: spec.segment,
    productionCountry: spec.country, assemblyPlant: spec.plant,
    releaseYear: spec.releaseYear, marketAvailability: "Disponible",
    power_kW: spec.powerKW, power_hp: spec.powerHp, torque_Nm: spec.torque,
    drivetrain: spec.drivetrain, motors: spec.drivetrain === "AWD" ? 2 : 1,
    acceleration_0_100_s: spec.accel, topSpeed_kmh: spec.vmax,
    usableCapacity_kWh: ref.usable, grossCapacity_kWh: ref.gross ?? null,
    chemistry: spec.chemistry ?? "NMC", architecture_V: spec.archV ?? 400,
    mass_kg: spec.mass,
    wltp_max_km: Math.max(...batteries.map((b) => b.wltp)),
    wltp_min_km: Math.min(...batteries.map((b) => b.wltp)),
    realRange: {
      mixed_km: ref.real.mixed, highway_130_km: ref.real.hw130,
      urban_km: ref.real.urban, winter_minus5_km: ref.real.win,
      confidence: "estimated",
    },
    consumption_mixed_kWh_per_100km: ref.conso,
    consumption_highway_kWh_per_100km: spec.consoHighway ?? ref.conso + 5,
    consumption_winter_kWh_per_100km: spec.consoWinter ?? ref.conso + 4,
    dragCoefficient_Cx: spec.cx,
    chargingDC: { peakPower_kW: ref.dcPeak, time_10_80_min: ref.dc10_80, kWh_added_30min: ref.dc30, confidence: "estimated" },
    chargingAC: { onboardCharger_kW: 11, phases: 3, time_0_100_h: spec.acHours ?? 7 },
    plugAndCharge: false, v2l: spec.v2l ?? false, v2g: false, v2l_option_EUR: null,
    chargingCurve: curve(ref.dcPeak),
    rangeTests: [], thousandKmChallenge: null,
    length_mm: spec.length, width_mm: spec.width, height_mm: spec.height,
    wheelbase_mm: spec.wheelbase, trunkCapacity_L: spec.trunk, trunkCapacityFolded_L: spec.trunkFolded, frunkCapacity_L: null,
    trims: flatTrims,
    leasingSocialEligible: !!leasingSocial,
    leasingSocial_EUR_per_month: null,
    availableAids, configurations,
    warranty: { vehicle_years: 5, vehicle_km: 100000, battery_years: 8, battery_km: 160000, battery_soh_minimum_percent: 70 },
    keyFeatures: spec.keyFeatures,
    verdict: spec.verdict,
    lastUpdated: TODAY,
    sources: ["nyland", "lachaineev"],
    imageCredit: "Constructeur",
  };
}

function write(slug, json) {
  const fp = path.join(DIR, slug + ".json");
  fs.writeFileSync(fp, JSON.stringify(json, null, 2) + "\n");
  console.log("✓", slug, "—", json.trims.length, "trims /", json.configurations.length, "configs / dès", Math.min(...json.trims.map(t => t.price_EUR)), "€");
}

const STD_FEATURES = [
  { category: "confort", label: "Climatisation automatique" },
  { category: "technologie", label: "Système multimédia tactile, compatible Apple CarPlay / Android Auto" },
  { category: "securite", label: "Freinage automatique d'urgence avec détection piétons" },
  { category: "design", label: "Signature lumineuse LED" },
];

/* ============================================================
   FIAT 500e — citadine, production Mirafiori (Italie)
   ============================================================ */
write("fiat-500e", generate({
  slug: "fiat-500e",
  brand: "Fiat", model: "500e", variant: "42 kWh",
  bodyType: "Citadine", segment: "A",
  country: "Italie", plant: "Mirafiori (Turin)",
  releaseYear: 2020,
  powerKW: 87, powerHp: 118, torque: 220, drivetrain: "FWD",
  accel: 9.0, vmax: 150, mass: 1365, cx: 0.31,
  length: 3632, width: 1683, height: 1527, wheelbase: 2322,
  trunk: 185, trunkFolded: 550,
  acHours: 4.3,
  batteries: [
    { kind: "standard", usable: 42, gross: 44, wltp: 320,
      dcPeak: 85, dc10_80: 35, dc30: 50, conso: 14.5,
      real: { mixed: 240, hw130: 150, urban: 295, win: 185 } },
  ],
  trims: [
    { name: "Pop", wheels: 16, drivetrain: "FWD",
      highlights: ["Climatisation manuelle", "Écran 7\""],
      prices: { standard: 27990 } },
    { name: "Red", wheels: 16, drivetrain: "FWD",
      highlights: ["Édition (RED) caritative", "Écran 10,25\""],
      prices: { standard: 30990 } },
    { name: "La Prima", wheels: 17, drivetrain: "FWD",
      highlights: ["Toit ouvrant panoramique", "Sellerie cuir éco"],
      prices: { standard: 33990 } },
  ],
  leasingSocial: false,
  keyFeatures: STD_FEATURES,
  verdict: {
    strengths: ["Icône design Italie", "Production Mirafiori (label « Made in Italy »)"],
    weaknesses: ["Autonomie autoroute limitée (~150 km)", "Habitabilité arrière restreinte"],
    idealUserProfile: "Foyer urbain ou périurbain, 2e voiture du couple, trajets quotidiens < 50 km. Le style et l'usage en font une citadine premium.",
    notIdealFor: "Familles avec adolescents ou grand rouleur autoroutier régulier, l'autonomie et l'habitabilité ne suivent pas.",
  },
}));

/* ============================================================
   FIAT GRANDE PANDA — citadine, production Kragujevac (Serbie)
   Hors UE → pas de Prime CEE VE (statut "potential" leasing)
   ============================================================ */
write("fiat-grande-panda", generate({
  slug: "fiat-grande-panda",
  brand: "Fiat", model: "Grande Panda", variant: "44 kWh",
  bodyType: "Citadine", segment: "B",
  country: "Serbie", plant: "Kragujevac",
  releaseYear: 2024,
  powerKW: 83, powerHp: 113, torque: 124, drivetrain: "FWD",
  accel: 11.5, vmax: 132, mass: 1500, cx: 0.32,
  length: 3999, width: 1763, height: 1597, wheelbase: 2540,
  trunk: 361, trunkFolded: 1240,
  acHours: 4,
  batteries: [
    { kind: "standard", usable: 44, gross: 46, wltp: 320,
      dcPeak: 100, dc10_80: 27, dc30: 50, conso: 15.0,
      real: { mixed: 245, hw130: 155, urban: 300, win: 190 } },
  ],
  trims: [
    { name: "Pop", wheels: 17, drivetrain: "FWD",
      highlights: ["Tarif d'attaque", "Câble de recharge intégré"],
      prices: { standard: 24900 } },
    { name: "La Prima", wheels: 17, drivetrain: "FWD",
      highlights: ["Toit pano", "Sellerie premium"],
      prices: { standard: 28900 } },
  ],
  leasingSocial: false,
  keyFeatures: STD_FEATURES,
  verdict: {
    strengths: ["Prix d'attaque le plus bas du segment B électrique en 2026", "Câble de recharge intégré"],
    weaknesses: ["Production Serbie : score ADEME bas, pas de Prime CEE VE", "Performances modestes (113 ch)"],
    idealUserProfile: "Acheteur recherchant le ticket d'entrée le plus bas en VE familial compact. Idéal pour usage urbain et petite famille.",
    notIdealFor: "Acheteurs visant Prime CEE VE ou leasing social, production hors UE pénalisante pour les aides.",
  },
}));

/* ============================================================
   FIAT 600e — SUV urbain, production Tychy (Pologne)
   ============================================================ */
write("fiat-600e", generate({
  slug: "fiat-600e",
  brand: "Fiat", model: "600e", variant: "54 kWh",
  bodyType: "SUV urbain", segment: "B",
  country: "Pologne", plant: "Tychy",
  releaseYear: 2023,
  powerKW: 115, powerHp: 156, torque: 260, drivetrain: "FWD",
  accel: 9.0, vmax: 150, mass: 1615, cx: 0.33,
  length: 4171, width: 1781, height: 1523, wheelbase: 2557,
  trunk: 360, trunkFolded: 1231,
  acHours: 4.7,
  batteries: [
    { kind: "standard", usable: 54, gross: 55, wltp: 409,
      dcPeak: 100, dc10_80: 27, dc30: 50, conso: 14.6,
      real: { mixed: 315, hw130: 200, urban: 380, win: 245 } },
  ],
  trims: [
    { name: "Red", wheels: 17, drivetrain: "FWD",
      highlights: ["Édition (RED) caritative", "Écran 10,25\""],
      prices: { standard: 36900 } },
    { name: "La Prima", wheels: 18, drivetrain: "FWD",
      highlights: ["Sellerie premium", "Aides à la conduite niveau 2"],
      prices: { standard: 40900 } },
  ],
  leasingSocial: false,
  keyFeatures: STD_FEATURES,
  verdict: {
    strengths: ["Plateforme e-CMP éprouvée (base 2008, Avenger, Mokka)", "Production Tychy (UE) : éligible Prime CEE VE"],
    weaknesses: ["Style controversé : design Fiat sur base Stellantis", "Pas de pompe à chaleur de série"],
    idealUserProfile: "Famille urbaine cherchant le style Fiat sur une plateforme connue et bien rodée. Bon rapport prix/équipement.",
    notIdealFor: "Acheteurs cherchant la meilleure autonomie autoroute du segment, le 600e reste dans la moyenne.",
  },
}));

/* ============================================================
   JEEP AVENGER ELECTRIC — SUV urbain, production Tychy (Pologne)
   Plateforme e-CMP, partagée avec 600e et 2008
   ============================================================ */
write("jeep-avenger", generate({
  slug: "jeep-avenger",
  brand: "Jeep", model: "Avenger Electric", variant: "54 kWh",
  bodyType: "SUV urbain", segment: "B",
  country: "Pologne", plant: "Tychy",
  releaseYear: 2023,
  powerKW: 115, powerHp: 156, torque: 260, drivetrain: "FWD",
  accel: 9.0, vmax: 150, mass: 1580, cx: 0.32,
  length: 4084, width: 1776, height: 1528, wheelbase: 2562,
  trunk: 380, trunkFolded: 1218,
  acHours: 4.7,
  batteries: [
    { kind: "standard", usable: 54, gross: 55, wltp: 400,
      dcPeak: 100, dc10_80: 27, dc30: 50, conso: 14.8,
      real: { mixed: 305, hw130: 195, urban: 370, win: 240 } },
  ],
  trims: [
    { name: "Longitude", wheels: 16, drivetrain: "FWD",
      highlights: ["Entrée de gamme", "Écran 10,25\""],
      prices: { standard: 36600 } },
    { name: "Altitude", wheels: 17, drivetrain: "FWD",
      highlights: ["Pack tech : caméra 360°, hayon mains libres"],
      prices: { standard: 40990 } },
    { name: "Summit", wheels: 18, drivetrain: "FWD",
      highlights: ["Cuir, toit ouvrant, JBL audio"],
      prices: { standard: 42990 } },
  ],
  leasingSocial: false,
  keyFeatures: [
    { category: "confort", label: "Garde au sol 200 mm, capacités franchissement modérées" },
    { category: "technologie", label: "Écran tactile 10,25\" Uconnect" },
    { category: "securite", label: "Aides à la conduite niveau 2 (Highway Assist)" },
    { category: "design", label: "Look Jeep authentique sur base e-CMP" },
  ],
  verdict: {
    strengths: ["Look Jeep authentique sur plateforme efficace", "Production Tychy (UE) : éligible Prime CEE VE"],
    weaknesses: ["Pas de transmission intégrale (FWD seul)", "Habitabilité arrière limitée"],
    idealUserProfile: "Foyer urbain ou périurbain attiré par l'esthétique Jeep mais sans besoin réel de 4×4. Mix urbain/route quotidien.",
    notIdealFor: "Vrai usage off-road ou famille de 4 sur grands trajets : préférer un SUV familial plus spacieux.",
  },
}));

/* ============================================================
   JEEP COMPASS — SUV compact, production Melfi (Italie)
   ============================================================ */
write("jeep-compass", generate({
  slug: "jeep-compass",
  brand: "Jeep", model: "Compass", variant: "73 / 97 kWh",
  bodyType: "SUV compact", segment: "C",
  country: "Italie", plant: "Melfi",
  releaseYear: 2025,
  powerKW: 157, powerHp: 213, torque: 345, drivetrain: "FWD",
  accel: 7.9, vmax: 170, mass: 2110, cx: 0.32,
  length: 4550, width: 1890, height: 1640, wheelbase: 2690,
  trunk: 550, trunkFolded: 1500,
  acHours: 6.5,
  batteries: [
    { kind: "standard", usable: 73, gross: 77, wltp: 500,
      dcPeak: 160, dc10_80: 30, dc30: 50, conso: 16.2,
      real: { mixed: 390, hw130: 270, urban: 460, win: 300 } },
    { kind: "long-range", usable: 97, gross: 98, wltp: 650,
      dcPeak: 160, dc10_80: 35, dc30: 60, conso: 16.5,
      real: { mixed: 515, hw130: 360, urban: 610, win: 400 } },
  ],
  trims: [
    { name: "Altitude", wheels: 18, drivetrain: "FWD",
      highlights: ["FWD 213 ch", "Écran tactile 10.25\""],
      prices: { standard: 41900 } },
    { name: "Summit", wheels: 19, drivetrain: "FWD",
      highlights: ["FWD 213 ch", "Projecteurs LED matriciels", "Navigation connectée"],
      prices: { standard: 45900, "long-range": 49900 } },
  ],
  leasingSocial: false,
  keyFeatures: [
    { category: "confort", label: "Garde au sol surélevée (200 mm) et position de conduite haute" },
    { category: "technologie", label: "Système multimédia Uconnect avec écran tactile 10,25\"" },
    { category: "securite", label: "Aides à la conduite de niveau 2 (Highway Assist)" },
    { category: "design", label: "Calandre authentique Jeep à 7 fentes modernisée" },
  ],
  verdict: {
    strengths: ["Production européenne (Melfi, Italie) : éligible Prime CEE VE", "Excellent compromis autonomie (plateforme STLA Medium)", "Habitabilité et volume de coffre généreux (550 L)"],
    weaknesses: ["Style plus conventionnel que l'Avenger", "Poids élevé impactant l'agilité"],
    idealUserProfile: "Famille cherchant un SUV électrique polyvalent comme véhicule principal, éligible aux aides d'État.",
    notIdealFor: "Acheteurs cherchant une citadine facile à garer en ville ou des performances ultra-sportives.",
  },
}));


/* ============================================================
   OPEL CORSA ELECTRIC — citadine, Saragosse (Espagne)
   Plateforme e-CMP, même base que e-208
   ============================================================ */
write("opel-corsa-electric", generate({
  slug: "opel-corsa-electric",
  brand: "Opel", model: "Corsa Electric", variant: "50 / 54 kWh",
  bodyType: "Citadine", segment: "B",
  country: "Espagne", plant: "Saragosse",
  releaseYear: 2024,
  powerKW: 115, powerHp: 156, torque: 260, drivetrain: "FWD",
  accel: 8.2, vmax: 150, mass: 1530, cx: 0.30,
  length: 4060, width: 1765, height: 1435, wheelbase: 2540,
  trunk: 309, trunkFolded: 1118,
  acHours: 4.7,
  batteries: [
    { kind: "standard", usable: 50, gross: 51, wltp: 357,
      dcPeak: 100, dc10_80: 30, dc30: 50, conso: 14.8,
      real: { mixed: 280, hw130: 180, urban: 340, win: 220 } },
    { kind: "long-range", usable: 54, gross: 55, wltp: 405,
      dcPeak: 100, dc10_80: 30, dc30: 50, conso: 14.6,
      real: { mixed: 320, hw130: 205, urban: 380, win: 250 } },
  ],
  trims: [
    { name: "Edition", wheels: 16, drivetrain: "FWD",
      highlights: ["Entrée de gamme", "Caméra recul"],
      prices: { standard: 33500 } },
    { name: "GS", wheels: 17, drivetrain: "FWD",
      highlights: ["Look sportif", "Sièges sport"],
      prices: { standard: 36500, "long-range": 39500 } },
    { name: "Ultimate", wheels: 17, drivetrain: "FWD",
      highlights: ["Toit pano", "Aides à la conduite niveau 2"],
      prices: { "long-range": 41500 } },
  ],
  leasingSocial: false,
  keyFeatures: STD_FEATURES,
  verdict: {
    strengths: ["Plateforme e-CMP éprouvée", "Production espagnole : éligible Prime CEE VE"],
    weaknesses: ["Habitabilité arrière limitée", "Pas de pompe à chaleur sur Edition"],
    idealUserProfile: "Foyer urbain ou périurbain cherchant une citadine électrique fiable, finition sobre allemande, look discret.",
    notIdealFor: "Acheteur cherchant le maximum d'espace ou le look extraverti, préférer la 600e ou Avenger.",
  },
}));

/* ============================================================
   OPEL MOKKA ELECTRIC — SUV urbain, Saragosse (Espagne)
   ============================================================ */
write("opel-mokka-electric", generate({
  slug: "opel-mokka-electric",
  brand: "Opel", model: "Mokka Electric", variant: "50 / 54 kWh",
  bodyType: "SUV urbain", segment: "B",
  country: "Espagne", plant: "Saragosse",
  releaseYear: 2023,
  powerKW: 115, powerHp: 156, torque: 260, drivetrain: "FWD",
  accel: 9.0, vmax: 150, mass: 1598, cx: 0.32,
  length: 4151, width: 1791, height: 1531, wheelbase: 2557,
  trunk: 350, trunkFolded: 1105,
  acHours: 4.7,
  batteries: [
    { kind: "standard", usable: 50, gross: 51, wltp: 338,
      dcPeak: 100, dc10_80: 30, dc30: 50, conso: 15.5,
      real: { mixed: 265, hw130: 170, urban: 320, win: 205 } },
    { kind: "long-range", usable: 54, gross: 55, wltp: 406,
      dcPeak: 100, dc10_80: 30, dc30: 50, conso: 15.2,
      real: { mixed: 310, hw130: 200, urban: 370, win: 245 } },
  ],
  trims: [
    { name: "Edition", wheels: 17, drivetrain: "FWD",
      highlights: ["Entrée de gamme", "Climatisation manuelle"],
      prices: { standard: 36600 } },
    { name: "GS", wheels: 17, drivetrain: "FWD",
      highlights: ["Look sportif", "Caméra 360°"],
      prices: { standard: 39600, "long-range": 42600 } },
    { name: "Ultimate", wheels: 18, drivetrain: "FWD",
      highlights: ["Sellerie premium", "Pack Drive Assist"],
      prices: { "long-range": 44900 } },
  ],
  leasingSocial: false,
  keyFeatures: STD_FEATURES,
  verdict: {
    strengths: ["Design Opel Vizor reconnaissable", "Plateforme partagée 2008/600e/Avenger"],
    weaknesses: ["Habitabilité arrière compromise par la ligne de toit", "Pas de pompe à chaleur sur Edition"],
    idealUserProfile: "Foyer urbain ou périurbain cherchant un mini-SUV au look affirmé. Mix urbain quotidien avec quelques sorties autoroute.",
    notIdealFor: "Famille de 4 à l'arrière sur longs trajets, l'espace est compté.",
  },
}));

/* ============================================================
   OPEL ASTRA ELECTRIC — compacte, Rüsselsheim (Allemagne)
   Plateforme STLA Medium, base e-308
   ============================================================ */
write("opel-astra", generate({
  slug: "opel-astra",
  brand: "Opel", model: "Astra Electric", variant: "Berline & Sports Tourer · 54 kWh",
  bodyType: "Berline compacte", segment: "C",
  country: "Allemagne", plant: "Rüsselsheim",
  releaseYear: 2023,
  powerKW: 115, powerHp: 156, torque: 270, drivetrain: "FWD",
  accel: 9.2, vmax: 170, mass: 1718, cx: 0.28,
  length: 4374, width: 1860, height: 1470, wheelbase: 2675,
  trunk: 352, trunkFolded: 1268,
  acHours: 5,
  batteries: [
    { kind: "standard", usable: 54, gross: 55, wltp: 416,
      dcPeak: 100, dc10_80: 30, dc30: 50, conso: 14.7,
      real: { mixed: 330, hw130: 215, urban: 395, win: 255 } },
  ],
  trims: [
    { name: "Berline GS", wheels: 17, drivetrain: "FWD",
      highlights: ["Berline · pack sportif", "Caméra 360°"],
      prices: { standard: 40200 } },
    { name: "Berline Ultimate", wheels: 18, drivetrain: "FWD",
      highlights: ["Toit pano", "Aides niveau 2 augmenté"],
      prices: { standard: 43700 } },
    { name: "Sports Tourer GS", wheels: 17, drivetrain: "FWD",
      highlights: ["Break · coffre 516 L"],
      prices: { standard: 41200 } },
    { name: "Sports Tourer Ultimate", wheels: 18, drivetrain: "FWD",
      highlights: ["Break premium · toit pano"],
      prices: { standard: 44700 } },
  ],
  leasingSocial: false,
  keyFeatures: STD_FEATURES,
  verdict: {
    strengths: ["Production Rüsselsheim : qualité allemande perçue", "Choix berline + break à mêmes tarifs"],
    weaknesses: ["Autonomie 416 km WLTP en retrait des concurrents directs (e-308 : 416, Mégane : 450)", "Cocoon arrière étroit"],
    idealUserProfile: "Cadre quotidien ou famille petite cherchant une compacte premium allemande. Mix domicile-travail + trajets routes.",
    notIdealFor: "Gros rouleur autoroutier : l'autonomie 130 km/h tombe sous les 220 km.",
  },
}));

/* ============================================================
   OPEL FRONTERA ELECTRIC — SUV familial entrée gamme, Saragosse
   Plateforme Smart Car (commune à Citroën C3 Aircross)
   ============================================================ */
write("opel-frontera-electric", generate({
  slug: "opel-frontera-electric",
  brand: "Opel", model: "Frontera Electric", variant: "44 kWh",
  bodyType: "SUV familial", segment: "B",
  country: "Espagne", plant: "Saragosse",
  releaseYear: 2024,
  powerKW: 83, powerHp: 113, torque: 124, drivetrain: "FWD",
  accel: 12.1, vmax: 143, mass: 1530, cx: 0.34,
  length: 4385, width: 1795, height: 1635, wheelbase: 2670,
  trunk: 460, trunkFolded: 1600,
  acHours: 4,
  batteries: [
    { kind: "standard", usable: 44, gross: 46, wltp: 305,
      dcPeak: 100, dc10_80: 27, dc30: 50, conso: 15.8,
      real: { mixed: 235, hw130: 150, urban: 290, win: 185 } },
  ],
  trims: [
    { name: "Edition", wheels: 17, drivetrain: "FWD",
      highlights: ["Entrée de gamme", "5 places"],
      prices: { standard: 29000 } },
    { name: "GS", wheels: 17, drivetrain: "FWD",
      highlights: ["Look sportif", "Caméra recul"],
      prices: { standard: 31900 } },
  ],
  leasingSocial: false,
  keyFeatures: [
    { category: "confort", label: "5 places (option 7 places sur version essence/PHEV uniquement)" },
    { category: "technologie", label: "Écran tactile 10\" central" },
    { category: "securite", label: "Freinage automatique d'urgence" },
    { category: "design", label: "Style SUV familial assumé, pavillon haut" },
  ],
  verdict: {
    strengths: ["Prix d'attaque parmi les plus bas du SUV familial électrique 2026", "Habitabilité supérieure à un Mokka (segment B+)"],
    weaknesses: ["Autonomie modeste (305 km WLTP, ~150 km autoroute)", "113 ch seulement, performances limitées"],
    idealUserProfile: "Famille cherchant un SUV familial électrique au prix d'attaque le plus bas. Usage urbain et péri-urbain principal.",
    notIdealFor: "Gros rouleur ou usage autoroutier régulier : l'autonomie 305 km WLTP est juste.",
  },
}));

console.log("\n9 fiches créées. Lancer `npm run build` pour valider.");
