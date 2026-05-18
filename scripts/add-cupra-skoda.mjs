// Ajout Cupra + Skoda — 4 véhicules (Born, Tavascan, Enyaq, Elroq)
// Prix indicatifs 2026 (à recouper avec catalogues officiels PDF)

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
    notes: drivetrain === "AWD" ? "Transmission intégrale 4Drive" : null,
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
          slug,
          trimName: trim.name,
          batteryKind: battKind,
          wheels: trim.wheels,
          price,
          batt,
          drivetrain: trim.drivetrain,
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
    slug,
    brand: spec.brand,
    model: spec.model,
    variant: spec.variant,
    bodyType: spec.bodyType,
    segment: spec.segment,
    productionCountry: spec.country,
    assemblyPlant: spec.plant,
    releaseYear: spec.releaseYear,
    marketAvailability: "Disponible",
    power_kW: spec.powerKW,
    power_hp: spec.powerHp,
    torque_Nm: spec.torque,
    drivetrain: spec.drivetrain,
    motors: spec.drivetrain === "AWD" ? 2 : 1,
    acceleration_0_100_s: spec.accel,
    topSpeed_kmh: spec.vmax,
    usableCapacity_kWh: ref.usable,
    grossCapacity_kWh: ref.gross ?? null,
    chemistry: spec.chemistry ?? "NMC",
    architecture_V: spec.archV ?? 400,
    mass_kg: spec.mass,
    wltp_max_km: Math.max(...batteries.map((b) => b.wltp)),
    wltp_min_km: Math.min(...batteries.map((b) => b.wltp)),
    realRange: {
      mixed_km: ref.real.mixed,
      highway_130_km: ref.real.hw130,
      urban_km: ref.real.urban,
      winter_minus5_km: ref.real.win,
      confidence: "estimated",
    },
    consumption_mixed_kWh_per_100km: ref.conso,
    consumption_highway_kWh_per_100km: spec.consoHighway ?? ref.conso + 5,
    consumption_winter_kWh_per_100km: spec.consoWinter ?? ref.conso + 4,
    dragCoefficient_Cx: spec.cx,
    chargingDC: {
      peakPower_kW: ref.dcPeak,
      time_10_80_min: ref.dc10_80,
      kWh_added_30min: ref.dc30,
      confidence: "estimated",
    },
    chargingAC: {
      onboardCharger_kW: 11,
      phases: 3,
      time_0_100_h: spec.acHours ?? 7,
    },
    plugAndCharge: spec.plugAndCharge ?? false,
    v2l: spec.v2l ?? false,
    v2g: false,
    v2l_option_EUR: null,
    chargingCurve: curve(ref.dcPeak),
    rangeTests: [],
    thousandKmChallenge: null,
    length_mm: spec.length,
    width_mm: spec.width,
    height_mm: spec.height,
    wheelbase_mm: spec.wheelbase,
    trunkCapacity_L: spec.trunk,
    trunkCapacityFolded_L: spec.trunkFolded,
    frunkCapacity_L: null,
    trims: flatTrims,
    leasingSocialEligible: !!leasingSocial,
    leasingSocial_EUR_per_month: null,
    availableAids,
    configurations,
    warranty: {
      vehicle_years: 5,
      vehicle_km: 100000,
      battery_years: 8,
      battery_km: 160000,
      battery_soh_minimum_percent: 70,
    },
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

/* ============================================================
   CUPRA BORN — base MEB VW ID.3, production Zwickau (Allemagne)
   Batteries MEB : Pro (58/62 kWh) + Pro S (77/82 kWh)
   ============================================================ */
write("cupra-born", generate({
  slug: "cupra-born",
  brand: "Cupra", model: "Born", variant: "58 / 77 kWh",
  bodyType: "Compacte", segment: "C",
  country: "Allemagne", plant: "Zwickau",
  releaseYear: 2022,
  powerKW: 240, powerHp: 326, torque: 545, drivetrain: "RWD",
  accel: 5.6, vmax: 200, mass: 1830, cx: 0.27,
  length: 4322, width: 1809, height: 1540, wheelbase: 2767,
  trunk: 385, trunkFolded: 1267,
  chemistry: "NMC", archV: 400, acHours: 7.5,
  consoHighway: 21, consoWinter: 19.5,
  batteries: [
    { kind: "standard", usable: 58, gross: 62, wltp: 425,
      dcPeak: 135, dc10_80: 30, dc30: 60, conso: 15.3,
      real: { mixed: 320, hw130: 205, urban: 380, win: 250 } },
    { kind: "long-range", usable: 77, gross: 82, wltp: 555,
      dcPeak: 175, dc10_80: 28, dc30: 80, conso: 15.8,
      real: { mixed: 425, hw130: 280, urban: 510, win: 330 } },
  ],
  trims: [
    // 58 kWh : e-Boost uniquement (170 kW / 231 ch)
    { name: "58 kWh e-Boost (170 kW)", wheels: 19, drivetrain: "RWD",
      highlights: ["170 kW · 231 ch", "Sièges baquet CupBucket en option"],
      prices: { standard: 38500 } },
    // 77 kWh : e-Boost classique
    { name: "77 kWh e-Boost (170 kW)", wheels: 19, drivetrain: "RWD",
      highlights: ["170 kW · 231 ch · WLTP 555 km", "Pack Drive Assist"],
      prices: { "long-range": 43500 } },
    // 77 kWh : VZ (240 kW / 326 ch) — exclusif batterie 77 kWh
    { name: "77 kWh VZ (240 kW)", wheels: 20, drivetrain: "RWD",
      highlights: ["VZ — 240 kW · 326 ch · 0-100 en 5,6 s", "Sièges CupBucket de série", "Châssis sport"],
      prices: { "long-range": 47900 } },
  ],
  leasingSocial: false,
  keyFeatures: [
    { category: "design", label: "Identité Cupra — calandre triangulaire, jantes 19/20\"" },
    { category: "technologie", label: "Plateforme MEB VW · charge DC jusqu'à 175 kW (79 kWh)" },
    { category: "confort", label: "Sièges baquet CupBucket — maintien sport" },
    { category: "securite", label: "Travel Assist niveau 2 — conduite assistée autoroute" },
  ],
  verdict: {
    strengths: [
      "Production allemande (Zwickau) — éligible Prime CEE VE sous plafond",
      "Caractère sportif RWD assumé, châssis taillé pour la conduite",
    ],
    weaknesses: [
      "Habitabilité arrière en retrait face aux SUV équivalents",
      "Logiciel infodivertissement VW (ID.Software) régulièrement critiqué",
    ],
    idealUserProfile: "Conducteur enthousiaste cherchant une électrique compacte au caractère sportif, sans la prime de prix d'une Tesla Model 3 Performance.",
    notIdealFor: "Famille nombreuse ayant besoin d'espace ou utilisateur souhaitant un infotainment irréprochable dès la sortie.",
  },
}));

/* ============================================================
   CUPRA TAVASCAN — SUV coupé, production Anhui (Chine)
   Une seule batterie MEB Pro S 77 kWh / 82 kWh brute
   ============================================================ */
write("cupra-tavascan", generate({
  slug: "cupra-tavascan",
  brand: "Cupra", model: "Tavascan", variant: "77 kWh · Endurance / VZ",
  bodyType: "SUV coupé", segment: "D",
  country: "Chine", plant: "Anhui (JV SAIC-Volkswagen)",
  releaseYear: 2024,
  powerKW: 250, powerHp: 340, torque: 545, drivetrain: "AWD",
  accel: 5.6, vmax: 180, mass: 2280, cx: 0.27,
  length: 4644, width: 1861, height: 1597, wheelbase: 2766,
  trunk: 540, trunkFolded: 1410,
  chemistry: "NMC", archV: 400, acHours: 7.5,
  consoHighway: 21, consoWinter: 19.5,
  batteries: [
    { kind: "standard", usable: 77, gross: 82, wltp: 568,
      dcPeak: 135, dc10_80: 30, dc30: 70, conso: 17.2,
      real: { mixed: 410, hw130: 265, urban: 490, win: 320 } },
  ],
  trims: [
    { name: "Endurance RWD (210 kW)", wheels: 20, drivetrain: "RWD",
      highlights: ["RWD 210 kW · 286 ch · WLTP 568 km", "Configuration la plus efficiente"],
      prices: { standard: 52900 } },
    { name: "VZ AWD (250 kW)", wheels: 21, drivetrain: "AWD",
      highlights: ["AWD 250 kW · 340 ch · 0-100 en 5,6 s", "WLTP réduit à 522 km par AWD"],
      prices: { standard: 58500 } },
  ],
  leasingSocial: false,
  keyFeatures: [
    { category: "design", label: "SUV coupé Cupra — silhouette agressive, jantes 20-21\"" },
    { category: "technologie", label: "Plateforme MEB · DC 135 kW" },
    { category: "confort", label: "Habitacle 5 places · 540 L coffre" },
    { category: "securite", label: "Pack Travel Assist + freinage urgence" },
  ],
  verdict: {
    strengths: [
      "Châssis bien réglé pour un SUV coupé · 0-100 en 5,6 s en VZ",
      "Habitabilité supérieure au Born tout en gardant l'ADN sport",
    ],
    weaknesses: [
      "Production en Chine (JV Volkswagen-SAIC) → score ADEME défavorable, aucune Prime CEE VE",
      "Prix hors plafond CEE (>47 000 €) — aucune aide à l'achat",
    ],
    idealUserProfile: "Acheteur cherchant un SUV coupé sportif et n'étant pas dépendant des aides à l'achat. Profile premium urbain/extra-urbain.",
    notIdealFor: "Tout acheteur visant la Prime CEE VE ou le leasing social — production chinoise + prix exclus du dispositif.",
  },
}));

/* ============================================================
   SKODA ENYAQ — SUV compact, production Mladá Boleslav (Tchéquie)
   2 batteries MEB : Pro (63/65 kWh) + Pro S (77/82 kWh)
   ============================================================ */
write("skoda-enyaq", generate({
  slug: "skoda-enyaq",
  brand: "Skoda", model: "Enyaq", variant: "63 / 77 kWh",
  bodyType: "SUV", segment: "C",
  country: "Rép. Tchèque", plant: "Mladá Boleslav",
  releaseYear: 2021,
  powerKW: 250, powerHp: 340, torque: 545, drivetrain: "AWD",
  accel: 5.4, vmax: 180, mass: 2200, cx: 0.257,
  length: 4658, width: 1879, height: 1622, wheelbase: 2765,
  trunk: 585, trunkFolded: 1710,
  chemistry: "NMC", archV: 400, acHours: 8,
  consoHighway: 20, consoWinter: 18.5,
  batteries: [
    // Pro : 63 kWh utile / 65 brute — variante "60"
    { kind: "standard", usable: 63, gross: 65, wltp: 423,
      dcPeak: 145, dc10_80: 30, dc30: 60, conso: 16.0,
      real: { mixed: 320, hw130: 210, urban: 385, win: 250 } },
    // Pro S : 77 kWh utile / 82 brute — variantes "85", "85x", "vRS"
    { kind: "long-range", usable: 77, gross: 82, wltp: 580,
      dcPeak: 175, dc10_80: 28, dc30: 80, conso: 15.5,
      real: { mixed: 445, hw130: 290, urban: 535, win: 345 } },
  ],
  trims: [
    { name: "60 (132 kW RWD)", wheels: 19, drivetrain: "RWD",
      highlights: ["132 kW · 180 ch · WLTP 423 km", "DC 145 kW"],
      prices: { standard: 37200 } },
    { name: "85 (210 kW RWD)", wheels: 19, drivetrain: "RWD",
      highlights: ["210 kW · 286 ch · WLTP 580 km", "DC 175 kW · pompe à chaleur"],
      prices: { "long-range": 41700 } },
    { name: "85x (210 kW AWD)", wheels: 20, drivetrain: "AWD",
      highlights: ["AWD 210 kW · 286 ch", "WLTP 553 km (réduit par AWD)"],
      prices: { "long-range": 45200 } },
    { name: "vRS (250 kW AWD)", wheels: 21, drivetrain: "AWD",
      highlights: ["AWD 250 kW · 340 ch · 0-100 en 5,4 s", "Châssis sport DCC"],
      prices: { "long-range": 55900 } },
  ],
  leasingSocial: false,
  keyFeatures: [
    { category: "confort", label: "Coffre 585 L · habitabilité de référence dans le segment" },
    { category: "technologie", label: "DC 175 kW (82 kWh) · pompe à chaleur de série" },
    { category: "securite", label: "Travel Assist niveau 2 · 9 airbags" },
    { category: "design", label: "Calandre Crystal Face lumineuse (option)" },
  ],
  verdict: {
    strengths: [
      "Production tchèque (Mladá Boleslav) → éligible Prime CEE VE",
      "Espace intérieur et coffre parmi les meilleurs du segment SUV C",
    ],
    weaknesses: [
      "Logiciel ID.Software hérité du groupe VW — historiquement perfectible",
      "vRS dépasse largement le plafond Prime CEE VE (55 900 €)",
    ],
    idealUserProfile: "Famille cherchant un SUV électrique polyvalent à grand coffre, avec un rapport prestations/prix solide et une fabrication européenne.",
    notIdealFor: "Acheteur recherchant un design tranché ou un infodivertissement irréprochable.",
  },
}));

/* ============================================================
   SKODA ELROQ — Mini-SUV compact, Mladá Boleslav
   3 batteries réelles : 52 / 59 / 77 kWh
   (schéma limité à 2 enum, donc "60" partage la kind "standard"
   avec "50" et le kWh exact apparaît dans le nom du trim)
   ============================================================ */
write("skoda-elroq", generate({
  slug: "skoda-elroq",
  brand: "Skoda", model: "Elroq", variant: "52 / 59 / 77 kWh",
  bodyType: "Mini-SUV", segment: "B",
  country: "Rép. Tchèque", plant: "Mladá Boleslav",
  releaseYear: 2024,
  powerKW: 210, powerHp: 286, torque: 545, drivetrain: "RWD",
  accel: 6.6, vmax: 180, mass: 2050, cx: 0.26,
  length: 4488, width: 1884, height: 1625, wheelbase: 2765,
  trunk: 470, trunkFolded: 1580,
  chemistry: "NMC", archV: 400, acHours: 7,
  consoHighway: 19, consoWinter: 17.5,
  batteries: [
    // "standard" porte le 52 kWh de référence (Elroq 50)
    // Le 59 kWh (Elroq 60) utilise aussi la kind "standard" mais le trim porte la précision
    { kind: "standard", usable: 52, gross: 55, wltp: 375,
      dcPeak: 145, dc10_80: 25, dc30: 60, conso: 15.0,
      real: { mixed: 285, hw130: 180, urban: 340, win: 220 } },
    // "long-range" : Pro S 77 kWh utile / 82 brute (Elroq 85)
    { kind: "long-range", usable: 77, gross: 82, wltp: 580,
      dcPeak: 175, dc10_80: 28, dc30: 80, conso: 14.9,
      real: { mixed: 440, hw130: 290, urban: 530, win: 340 } },
  ],
  trims: [
    { name: "50 (52 kWh · 125 kW FWD)", wheels: 18, drivetrain: "FWD",
      highlights: ["170 ch · WLTP 375 km", "Entrée de gamme"],
      prices: { standard: 32000 } },
    { name: "60 (59 kWh · 150 kW FWD)", wheels: 19, drivetrain: "FWD",
      highlights: ["204 ch · WLTP 437 km", "Batterie intermédiaire 59 kWh utile"],
      prices: { standard: 36500 } },
    { name: "85 (77 kWh · 210 kW RWD)", wheels: 19, drivetrain: "RWD",
      highlights: ["286 ch · WLTP 580 km · DC 175 kW", "Pompe à chaleur de série"],
      prices: { "long-range": 41500 } },
    { name: "85 Sportline (77 kWh · 210 kW RWD)", wheels: 20, drivetrain: "RWD",
      highlights: ["Châssis sport · sièges enveloppants", "Jantes 20\""],
      prices: { "long-range": 44900 } },
  ],
  leasingSocial: false,
  keyFeatures: [
    { category: "design", label: "Tech-Deck Face — nouveau langage Skoda sans calandre" },
    { category: "technologie", label: "DC jusqu'à 175 kW (85) · pompe à chaleur de série" },
    { category: "confort", label: "470 L coffre · habitabilité segment supérieur" },
    { category: "securite", label: "9 airbags · Travel Assist niveau 2" },
  ],
  verdict: {
    strengths: [
      "Production tchèque → éligible Prime CEE VE pour toute la gamme (≤ 47 000 €)",
      "Excellent compromis taille / autonomie / prix dans le segment B-SUV",
    ],
    weaknesses: [
      "Logiciel ID.Software hérité VW — UX perfectible",
      "Version d'entrée 50 (FWD 170 ch · 375 km WLTP) un peu juste pour gros rouleurs",
    ],
    idealUserProfile: "Famille urbaine ou périurbaine cherchant un SUV compact polyvalent en dessous du plafond Prime CEE VE, avec un grand coffre pour la catégorie.",
    notIdealFor: "Conducteur sportif cherchant un châssis tranchant — l'Elroq reste un SUV confort avant tout.",
  },
}));

console.log("\n4 fiches créées. Lancer `npm run build` pour valider.");
