import fs from 'node:fs';
import path from 'node:path';

const vehiclesDir = 'src/data/vehicles';

// Helper to write a JSON file
function writeJSON(filename, data) {
  const filepath = path.join(vehiclesDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Wrote ${filepath}`);
}

// Helper to delete a file if it exists
function deleteFile(filename) {
  const filepath = path.join(vehiclesDir, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    console.log(`Deleted ${filepath}`);
  }
}

// --- OPERATIONS ---

// 1. Delete EQA and eSprinter
deleteFile('mercedes-eqa.json');
deleteFile('mercedes-esprinter.json');

// 2. Modify mercedes-eqe.json (model: "EQE Berline")
if (fs.existsSync(path.join(vehiclesDir, 'mercedes-eqe.json'))) {
  const eqe = JSON.parse(fs.readFileSync(path.join(vehiclesDir, 'mercedes-eqe.json'), 'utf8'));
  eqe.model = "EQE Berline";
  writeJSON('mercedes-eqe.json', eqe);
}

// 3. Modify mercedes-eqs.json (model: "EQS Berline")
if (fs.existsSync(path.join(vehiclesDir, 'mercedes-eqs.json'))) {
  const eqs = JSON.parse(fs.readFileSync(path.join(vehiclesDir, 'mercedes-eqs.json'), 'utf8'));
  eqs.model = "EQS Berline";
  writeJSON('mercedes-eqs.json', eqs);
}

// 4. Rename/Replace EQB -> GLB
let glbData = {};
if (fs.existsSync(path.join(vehiclesDir, 'mercedes-eqb.json'))) {
  glbData = JSON.parse(fs.readFileSync(path.join(vehiclesDir, 'mercedes-eqb.json'), 'utf8'));
  deleteFile('mercedes-eqb.json');
} else {
  // Try reading from glb if already created
  glbData = JSON.parse(fs.readFileSync(path.join(vehiclesDir, 'mercedes-glb.json'), 'utf8'));
}

glbData.slug = "mercedes-glb";
glbData.model = "GLB";
glbData.trims = glbData.trims.map(t => {
  t.name = t.name.replace(/EQB/g, 'GLB');
  return t;
});
glbData.configurations = glbData.configurations.map(c => {
  c.id = c.id.replace(/eqb/g, 'glb');
  c.label = c.label.replace(/EQB/g, 'GLB');
  c.trim = c.trim.replace(/EQB/g, 'GLB');
  return c;
});
writeJSON('mercedes-glb.json', glbData);

// 5. Rename/Replace eVito -> EQV
let eqvData = {};
if (fs.existsSync(path.join(vehiclesDir, 'mercedes-evito.json'))) {
  eqvData = JSON.parse(fs.readFileSync(path.join(vehiclesDir, 'mercedes-evito.json'), 'utf8'));
  deleteFile('mercedes-evito.json');
} else {
  try {
    eqvData = JSON.parse(fs.readFileSync(path.join(vehiclesDir, 'mercedes-eqv.json'), 'utf8'));
  } catch (e) {
    // fallback if file doesn't exist
    eqvData = {
      brand: "Mercedes",
      variant: "90 kWh · Tourer/Monospace",
      bodyType: "Monospace",
      segment: "E",
      productionCountry: "Espagne",
      assemblyPlant: "Vitoria-Gasteiz",
      releaseYear: 2024,
      marketAvailability: "Disponible",
      power_kW: 150,
      power_hp: 204,
      torque_Nm: 362,
      drivetrain: "FWD",
      motors: 1,
      acceleration_0_100_s: 12.1,
      topSpeed_kmh: 140,
      usableCapacity_kWh: 90,
      grossCapacity_kWh: 100,
      chemistry: "NMC",
      architecture_V: 400,
      mass_kg: 2635,
      wltp_max_km: 350,
      wltp_min_km: 340,
      realRange: {
        mixed_km: 260,
        highway_130_km: 190,
        urban_km: 330,
        winter_minus5_km: 215,
        confidence: "estimated"
      },
      consumption_mixed_kWh_per_100km: 26.2,
      consumption_highway_kWh_per_100km: 34.0,
      consumption_winter_kWh_per_100km: 32.0,
      dragCoefficient_Cx: 0.35,
      chargingDC: {
        peakPower_kW: 110,
        time_10_80_min: 40,
        kWh_added_30min: 42,
        confidence: "estimated"
      },
      chargingAC: {
        onboardCharger_kW: 11,
        phases: 3,
        time_0_100_h: 10
      },
      plugAndCharge: false,
      v2l: false,
      v2g: false,
      v2l_option_EUR: null,
      chargingCurve: [
        { soc: 0, power: 85 },
        { soc: 10, power: 110 },
        { soc: 50, power: 70 },
        { soc: 80, power: 30 },
        { soc: 100, power: 7 }
      ],
      trims: [],
      configurations: [],
      warranty: {
        vehicle_years: 3,
        vehicle_km: 100000,
        battery_years: 8,
        battery_km: 160000,
        battery_soh_minimum_percent: 70
      },
      keyFeatures: [
        { category: "confort", label: "Salon roulant avec espace modulable premium" },
        { category: "technologie", label: "Systeme MBUX intelligent de Mercedes-Benz" },
        { category: "securite", label: "Active Brake Assist et assistance active de serie" },
        { category: "design", label: "Monospace de prestige avec portes coulissantes" }
      ],
      verdict: {
        strengths: ["Luxe interieur et confort de salon", "Jusqu'a 8 personnes"],
        weaknesses: ["Consommation elevee", "Autonomie autoroute limitee"],
        idealUserProfile: "Navettes d'hotel, chauffeurs VTC et familles nombreuses.",
        notIdealFor: "Longs trajets quotidiens sans recharge planifiee."
      },
      lastUpdated: "2026-06-02",
      sources: ["constructeur"],
      imageCredit: "Constructeur"
    };
  }
}

eqvData.slug = "mercedes-eqv";
eqvData.model = "EQV";
eqvData.bodyType = "Monospace";
eqvData.segment = "E";
eqvData.variant = "90 kWh";
eqvData.usableCapacity_kWh = 90;
eqvData.grossCapacity_kWh = 100;
eqvData.wltp_max_km = 358;
eqvData.wltp_min_km = 350;
eqvData.power_kW = 150;
eqvData.power_hp = 204;
eqvData.torque_Nm = 362;
eqvData.acceleration_0_100_s = 12.1;
eqvData.topSpeed_kmh = 140;
eqvData.mass_kg = 2635;

eqvData.thousandKmChallenge = null;
eqvData.length_mm = 5140;
eqvData.width_mm = 1928;
eqvData.height_mm = 1910;
eqvData.wheelbase_mm = 3200;
eqvData.trunkCapacity_L = 1030;
eqvData.trunkCapacityFolded_L = 4630;
eqvData.frunkCapacity_L = null;
eqvData.leasingSocialEligible = false;
eqvData.leasingSocial_EUR_per_month = null;
eqvData.availableAids = [];
eqvData.lastUpdated = "2026-06-02";

eqvData.trims = [
  {
    name: "EQV 300 Tourer Pro",
    price_EUR: 78900,
    batteryUsed: "90 kWh",
    equipmentHighlights: [
      "Jusqu'à 8 places",
      "Écran MBUX 10 pouces",
      "Portes latérales coulissantes"
    ]
  },
  {
    name: "EQV 300 Tourer Avantgarde",
    price_EUR: 86500,
    batteryUsed: "90 kWh",
    equipmentHighlights: [
      "Sièges en cuir individuel",
      "Pack Assistance à la conduite",
      "Jantes alliage 17 pouces"
    ]
  }
];

eqvData.configurations = [
  {
    id: "mercedes-eqv-tourer-pro",
    label: "EQV 300 Tourer Pro",
    battery: "standard",
    trim: "EQV 300 Tourer Pro",
    wheelSize_inches: 17,
    tyreType: "summer",
    options: [],
    price_EUR: 78900,
    monthlyLease_EUR: null,
    leasingSocialEligible: false,
    wltp_km: 358,
    wltp_consumption_kWh_100km: 26.2,
    realRange: {
      mixed_km: 270,
      highway_130_km: 195,
      urban_km: 335,
      winter_minus5_km: 220,
      confidence: "estimated"
    },
    rangeTests: [],
    chargingDC_peak_kW: 110,
    chargingDC_10_80_min: 40,
    chargingDC_kWh_30min: 42,
    chargingCurve: [
      { soc: 0, power: 85 },
      { soc: 10, power: 110 },
      { soc: 50, power: 70 },
      { soc: 80, power: 30 },
      { soc: 100, power: 7 }
    ],
    availability: "available",
    notes: "Minivan de prestige 7 ou 8 places, grande batterie."
  },
  {
    id: "mercedes-eqv-tourer-avantgarde",
    label: "EQV 300 Tourer Avantgarde",
    battery: "standard",
    trim: "EQV 300 Tourer Avantgarde",
    wheelSize_inches: 17,
    tyreType: "summer",
    options: [],
    price_EUR: 86500,
    monthlyLease_EUR: null,
    leasingSocialEligible: false,
    wltp_km: 350,
    wltp_consumption_kWh_100km: 26.8,
    realRange: {
      mixed_km: 265,
      highway_130_km: 190,
      urban_km: 325,
      winter_minus5_km: 215,
      confidence: "estimated"
    },
    rangeTests: [],
    chargingDC_peak_kW: 110,
    chargingDC_10_80_min: 40,
    chargingDC_kWh_30min: 42,
    chargingCurve: [
      { soc: 0, power: 85 },
      { soc: 10, power: 110 },
      { soc: 50, power: 70 },
      { soc: 80, power: 30 },
      { soc: 100, power: 7 }
    ],
    availability: "available",
    notes: "Finition grand luxe, sièges individuels en vis-à-vis."
  }
];

eqvData.keyFeatures = [
  { category: "confort", label: "Salon mobile ultra-confortable jusqu'à 8 places modulables" },
  { category: "technologie", label: "Interface intelligente MBUX avec navigation spécifique EV" },
  { category: "securite", label: "Assistance active au freinage et détection d'angle mort" },
  { category: "design", label: "Monospace de prestige avec portes coulissantes électriques" }
];
eqvData.verdict = {
  strengths: ["Espace interieur geant et modulaire", "Finition et standing premium"],
  weaknesses: ["Consommation importante a haute vitesse", "Plateforme thermique adaptee"],
  idealUserProfile: "Chauffeurs VIP, navettes d'hotel haut de gamme et familles nombreuses.",
  notIdealFor: "Navetteurs longue distance pressés ou petits budgets."
};

writeJSON('mercedes-eqv.json', eqvData);


// 6. Create Classe C Berline
const classeC = {
  slug: "mercedes-classe-c-berline",
  brand: "Mercedes",
  model: "Classe C Berline",
  variant: "83 kWh · Propulsion/4MATIC",
  bodyType: "Berline",
  segment: "D",
  productionCountry: "Allemagne",
  assemblyPlant: "Bremen",
  releaseYear: 2026,
  marketAvailability: "À commander",
  power_kW: 215,
  power_hp: 292,
  torque_Nm: 400,
  drivetrain: "RWD",
  motors: 1,
  acceleration_0_100_s: 5.7,
  topSpeed_kmh: 210,
  usableCapacity_kWh: 83.0,
  grossCapacity_kWh: 88.0,
  chemistry: "NMC",
  architecture_V: 800,
  mass_kg: 2050,
  wltp_max_km: 720,
  wltp_min_km: 590,
  realRange: {
    mixed_km: 550,
    highway_130_km: 390,
    urban_km: 670,
    winter_minus5_km: 430,
    confidence: "estimated"
  },
  consumption_mixed_kWh_per_100km: 13.0,
  consumption_highway_kWh_per_100km: 18.5,
  consumption_winter_kWh_per_100km: 16.5,
  dragCoefficient_Cx: 0.22,
  chargingDC: {
    peakPower_kW: 250,
    time_10_80_min: 22,
    kWh_added_30min: 70,
    confidence: "estimated"
  },
  chargingAC: {
    onboardCharger_kW: 11.0,
    phases: 3,
    time_0_100_h: 8.5
  },
  plugAndCharge: true,
  v2l: true,
  v2g: false,
  v2l_option_EUR: null,
  chargingCurve: [
    { soc: 0, power: 100 },
    { soc: 10, power: 250 },
    { soc: 30, power: 210 },
    { soc: 50, power: 160 },
    { soc: 80, power: 65 },
    { soc: 100, power: 10 }
  ],
  thousandKmChallenge: null,
  length_mm: 4751,
  width_mm: 1820,
  height_mm: 1438,
  wheelbase_mm: 2865,
  trunkCapacity_L: 455,
  trunkCapacityFolded_L: 1375,
  frunkCapacity_L: null,
  leasingSocialEligible: false,
  leasingSocial_EUR_per_month: null,
  availableAids: [],
  lastUpdated: "2026-06-02",
  trims: [
    {
      name: "PRO C 250e Berline",
      price_EUR: 52900,
      batteryUsed: "83 kWh",
      equipmentHighlights: [
        "720 km d'autonomie WLTP",
        "Architecture de charge 800V",
        "Écran tactile vertical MBUX"
      ]
    },
    {
      name: "AMG Line C 250e Berline",
      price_EUR: 58900,
      batteryUsed: "83 kWh",
      equipmentHighlights: [
        "Style extérieur sport AMG Line",
        "Jantes AMG 19 pouces",
        "Sièges Sport Similicuir Artico"
      ]
    }
  ],
  configurations: [
    {
      id: "mercedes-classe-c-berline-pro",
      label: "Classe C Berline 250e PRO",
      battery: "standard",
      trim: "PRO C 250e Berline",
      wheelSize_inches: 18,
      tyreType: "summer",
      options: [],
      price_EUR: 52900,
      monthlyLease_EUR: null,
      leasingSocialEligible: false,
      wltp_km: 720,
      wltp_consumption_kWh_100km: 12.8,
      realRange: {
        mixed_km: 550,
        highway_130_km: 390,
        urban_km: 670,
        winter_minus5_km: 430,
        confidence: "estimated"
      },
      rangeTests: [],
      chargingDC_peak_kW: 250,
      chargingDC_10_80_min: 22,
      chargingDC_kWh_30min: 70,
      chargingCurve: [
        { soc: 0, power: 100 },
        { soc: 10, power: 250 },
        { soc: 30, power: 210 },
        { soc: 50, power: 160 },
        { soc: 80, power: 65 },
        { soc: 100, power: 10 }
      ],
      availability: "upcoming",
      notes: "Version d'efficience maximale, aérodynamisme optimisé."
    },
    {
      id: "mercedes-classe-c-berline-amg",
      label: "Classe C Berline 250e AMG Line",
      battery: "standard",
      trim: "AMG Line C 250e Berline",
      wheelSize_inches: 19,
      tyreType: "summer",
      options: [],
      price_EUR: 58900,
      monthlyLease_EUR: null,
      leasingSocialEligible: false,
      wltp_km: 670,
      wltp_consumption_kWh_100km: 13.5,
      realRange: {
        mixed_km: 520,
        highway_130_km: 370,
        urban_km: 630,
        winter_minus5_km: 410,
        confidence: "estimated"
      },
      rangeTests: [],
      chargingDC_peak_kW: 250,
      chargingDC_10_80_min: 22,
      chargingDC_kWh_30min: 70,
      chargingCurve: [
        { soc: 0, power: 100 },
        { soc: 10, power: 250 },
        { soc: 30, power: 210 },
        { soc: 50, power: 160 },
        { soc: 80, power: 65 },
        { soc: 100, power: 10 }
      ],
      availability: "upcoming",
      notes: "Look dynamique avec suspensions sport de série."
    }
  ],
  warranty: {
    vehicle_years: 2,
    vehicle_km: 100000,
    battery_years: 8,
    battery_km: 160000,
    battery_soh_minimum_percent: 70
  },
  keyFeatures: [
    { category: "design", label: "Silhouette tricorps épurée avec feux LED matriciels" },
    { category: "technologie", label: "Système multimédia MBUX 3 avec commande vocale et 5G" },
    { category: "securite", label: "Aides à la conduite actives et pack sécurité passagers" },
    { category: "confort", label: "Suspension confortable et insonorisation de premier plan" }
  ],
  verdict: {
    strengths: [
      "Autonomie confortable de plus de 700 km WLTP",
      "Recharge 800V rapide à 250 kW en pointe"
    ],
    weaknesses: [
      "Volume de coffre réduit par rapport au GLC thermique",
      "Tarifs premium et liste d'options habituelle de Mercedes"
    ],
    idealUserProfile: "Cadres et professionnels de la route cherchant une berline statutaire, efficiente et rapide.",
    notIdealFor: "Utilisateurs ayant un besoin impératif d'un hayon de chargement vertical."
  },
  sources: ["constructeur"],
  imageCredit: "Constructeur"
};
writeJSON('mercedes-classe-c-berline.json', classeC);


// 7. Create EQE SUV
const eqeSuv = {
  slug: "mercedes-eqe-suv",
  brand: "Mercedes",
  model: "EQE SUV",
  variant: "90.6 kWh · Propulsion/4MATIC",
  bodyType: "SUV",
  segment: "E",
  productionCountry: "États-Unis",
  assemblyPlant: "Tuscaloosa",
  releaseYear: 2023,
  marketAvailability: "Disponible",
  power_kW: 215,
  power_hp: 292,
  torque_Nm: 565,
  drivetrain: "RWD",
  motors: 1,
  acceleration_0_100_s: 6.7,
  topSpeed_kmh: 210,
  usableCapacity_kWh: 90.6,
  grossCapacity_kWh: 96.0,
  chemistry: "NMC",
  architecture_V: 400,
  mass_kg: 2430,
  wltp_max_km: 590,
  wltp_min_km: 480,
  realRange: {
    mixed_km: 430,
    highway_130_km: 310,
    urban_km: 520,
    winter_minus5_km: 340,
    confidence: "estimated"
  },
  consumption_mixed_kWh_per_100km: 21.0,
  consumption_highway_kWh_per_100km: 28.0,
  consumption_winter_kWh_per_100km: 25.5,
  dragCoefficient_Cx: 0.25,
  chargingDC: {
    peakPower_kW: 170,
    time_10_80_min: 32,
    kWh_added_30min: 52,
    confidence: "estimated"
  },
  chargingAC: {
    onboardCharger_kW: 22.0,
    phases: 3,
    time_0_100_h: 4.5
  },
  plugAndCharge: true,
  v2l: false,
  v2g: false,
  v2l_option_EUR: null,
  chargingCurve: [
    { soc: 0, power: 120 },
    { soc: 10, power: 170 },
    { soc: 30, power: 150 },
    { soc: 50, power: 110 },
    { soc: 80, power: 45 },
    { soc: 100, power: 8 }
  ],
  thousandKmChallenge: null,
  length_mm: 4863,
  width_mm: 1940,
  height_mm: 1686,
  wheelbase_mm: 3030,
  trunkCapacity_L: 520,
  trunkCapacityFolded_L: 1675,
  frunkCapacity_L: null,
  leasingSocialEligible: false,
  leasingSocial_EUR_per_month: null,
  availableAids: [],
  lastUpdated: "2026-06-02",
  trims: [
    {
      name: "Electric Art EQE SUV 300",
      price_EUR: 84900,
      batteryUsed: "90.6 kWh",
      equipmentHighlights: [
        "Autonomie 590 km WLTP",
        "Sellerie similicuir ARTICO",
        "Chargeur embarqué AC 22 kW"
      ]
    },
    {
      name: "AMG Line EQE SUV 350 4MATIC",
      price_EUR: 95600,
      batteryUsed: "90.6 kWh",
      equipmentHighlights: [
        "Transmission intégrale AWD",
        "Kit carrosserie AMG exclusif",
        "Direction de l'essieu arrière (10°)"
      ]
    }
  ],
  configurations: [
    {
      id: "mercedes-eqe-suv-300-art",
      label: "EQE SUV 300 Electric Art",
      battery: "standard",
      trim: "Electric Art EQE SUV 300",
      wheelSize_inches: 19,
      tyreType: "summer",
      options: [],
      price_EUR: 84900,
      monthlyLease_EUR: null,
      leasingSocialEligible: false,
      wltp_km: 590,
      wltp_consumption_kWh_100km: 18.2,
      realRange: {
        mixed_km: 430,
        highway_130_km: 310,
        urban_km: 520,
        winter_minus5_km: 340,
        confidence: "estimated"
      },
      rangeTests: [],
      chargingDC_peak_kW: 170,
      chargingDC_10_80_min: 32,
      chargingDC_kWh_30min: 52,
      chargingCurve: [
        { soc: 0, power: 120 },
        { soc: 10, power: 170 },
        { soc: 30, power: 150 },
        { soc: 50, power: 110 },
        { soc: 80, power: 45 },
        { soc: 100, power: 8 }
      ],
      availability: "available",
      notes: "Modèle propulsion confortable et sobre."
    },
    {
      id: "mercedes-eqe-suv-350-amg",
      label: "EQE SUV 350 4MATIC AMG Line",
      battery: "standard",
      trim: "AMG Line EQE SUV 350 4MATIC",
      wheelSize_inches: 20,
      tyreType: "summer",
      options: [],
      price_EUR: 95600,
      monthlyLease_EUR: null,
      leasingSocialEligible: false,
      wltp_km: 540,
      wltp_consumption_kWh_100km: 19.5,
      realRange: {
        mixed_km: 410,
        highway_130_km: 295,
        urban_km: 495,
        winter_minus5_km: 320,
        confidence: "estimated"
      },
      rangeTests: [],
      chargingDC_peak_kW: 170,
      chargingDC_10_80_min: 32,
      chargingDC_kWh_30min: 52,
      chargingCurve: [
        { soc: 0, power: 120 },
        { soc: 10, power: 170 },
        { soc: 30, power: 150 },
        { soc: 50, power: 110 },
        { soc: 80, power: 45 },
        { soc: 100, power: 8 }
      ],
      availability: "available",
      notes: "Transmission intégrale, excellent comportement routier."
    }
  ],
  warranty: {
    vehicle_years: 3,
    vehicle_km: 150000,
    battery_years: 10,
    battery_km: 250000,
    battery_soh_minimum_percent: 70
  },
  keyFeatures: [
    { category: "design", label: "Lignes fluides optimisant le coefficient de traînée Cx à 0,25" },
    { category: "technologie", label: "MBUX Hyperscreen et climatisation intelligente THERMOTRONIC" },
    { category: "securite", label: "Pack Assistance à la conduite Plus et caméras 360°" },
    { category: "confort", label: "Suspension pneumatique AIRMATIC et essieu arrière directeur" }
  ],
  verdict: {
    strengths: [
      "Insonorisation remarquable et grand confort de roulement",
      "Écran géant Hyperscreen en option et chargeur AC 22 kW de série"
    ],
    weaknesses: [
      "Poids important dépassant les 2,4 tonnes",
      "Tarifs élitistes et coffre plus petit que la berline en volume utile"
    ],
    idealUserProfile: "Acheteurs à la recherche d'un grand SUV familial ultra-confortable et à la pointe de la technologie.",
    notIdealFor: "Petits garages ou personnes ayant un budget limité."
  },
  sources: ["constructeur"],
  imageCredit: "Constructeur"
};
writeJSON('mercedes-eqe-suv.json', eqeSuv);


// 8. Create EQS SUV
const eqsSuv = {
  slug: "mercedes-eqs-suv",
  brand: "Mercedes",
  model: "EQS SUV",
  variant: "118 kWh · Propulsion/4MATIC",
  bodyType: "SUV",
  segment: "F",
  productionCountry: "États-Unis",
  assemblyPlant: "Tuscaloosa",
  releaseYear: 2023,
  marketAvailability: "Disponible",
  power_kW: 265,
  power_hp: 360,
  torque_Nm: 568,
  drivetrain: "RWD",
  motors: 1,
  acceleration_0_100_s: 6.7,
  topSpeed_kmh: 210,
  usableCapacity_kWh: 118.0,
  grossCapacity_kWh: 122.0,
  chemistry: "NMC",
  architecture_V: 400,
  mass_kg: 2620,
  wltp_max_km: 660,
  wltp_min_km: 540,
  realRange: {
    mixed_km: 510,
    highway_130_km: 370,
    urban_km: 620,
    winter_minus5_km: 410,
    confidence: "estimated"
  },
  consumption_mixed_kWh_per_100km: 23.0,
  consumption_highway_kWh_per_100km: 31.0,
  consumption_winter_kWh_per_100km: 28.5,
  dragCoefficient_Cx: 0.26,
  chargingDC: {
    peakPower_kW: 200,
    time_10_80_min: 31,
    kWh_added_30min: 65,
    confidence: "estimated"
  },
  chargingAC: {
    onboardCharger_kW: 22.0,
    phases: 3,
    time_0_100_h: 6.0
  },
  plugAndCharge: true,
  v2l: false,
  v2g: false,
  v2l_option_EUR: null,
  chargingCurve: [
    { soc: 0, power: 140 },
    { soc: 10, power: 200 },
    { soc: 30, power: 180 },
    { soc: 50, power: 130 },
    { soc: 80, power: 50 },
    { soc: 100, power: 10 }
  ],
  thousandKmChallenge: null,
  length_mm: 5125,
  width_mm: 1959,
  height_mm: 1718,
  wheelbase_mm: 3210,
  trunkCapacity_L: 645,
  trunkCapacityFolded_L: 2100,
  frunkCapacity_L: null,
  leasingSocialEligible: false,
  leasingSocial_EUR_per_month: null,
  availableAids: [],
  lastUpdated: "2026-06-02",
  trims: [
    {
      name: "Electric Art EQS SUV 450+",
      price_EUR: 139900,
      batteryUsed: "118 kWh",
      equipmentHighlights: [
        "Autonomie 660 km WLTP",
        "Sellerie en cuir et inserts bois",
        "Toit ouvrant panoramique"
      ]
    },
    {
      name: "AMG Line EQS SUV 580 4MATIC",
      price_EUR: 168900,
      batteryUsed: "118 kWh",
      equipmentHighlights: [
        "AWD 544 ch et 0-100 en 4,6 s",
        "MBUX Hyperscreen de série",
        "Suspension pneumatique de série"
      ]
    }
  ],
  configurations: [
    {
      id: "mercedes-eqs-suv-450-art",
      label: "EQS SUV 450+ Electric Art",
      battery: "standard",
      trim: "Electric Art EQS SUV 450+",
      wheelSize_inches: 21,
      tyreType: "summer",
      options: [],
      price_EUR: 139900,
      monthlyLease_EUR: null,
      leasingSocialEligible: false,
      wltp_km: 660,
      wltp_consumption_kWh_100km: 20.2,
      realRange: {
        mixed_km: 510,
        highway_130_km: 370,
        urban_km: 620,
        winter_minus5_km: 410,
        confidence: "estimated"
      },
      rangeTests: [],
      chargingDC_peak_kW: 200,
      chargingDC_10_80_min: 31,
      chargingDC_kWh_30min: 65,
      chargingCurve: [
        { soc: 0, power: 140 },
        { soc: 10, power: 200 },
        { soc: 30, power: 180 },
        { soc: 50, power: 130 },
        { soc: 80, power: 50 },
        { soc: 100, power: 10 }
      ],
      availability: "available",
      notes: "Propulsion 360 ch, efficience et autonomie maximisées."
    },
    {
      id: "mercedes-eqs-suv-580-amg",
      label: "EQS SUV 580 4MATIC AMG Line",
      battery: "standard",
      trim: "AMG Line EQS SUV 580 4MATIC",
      wheelSize_inches: 21,
      tyreType: "summer",
      options: [],
      price_EUR: 168900,
      monthlyLease_EUR: null,
      leasingSocialEligible: false,
      wltp_km: 590,
      wltp_consumption_kWh_100km: 21.8,
      realRange: {
        mixed_km: 480,
        highway_130_km: 350,
        urban_km: 580,
        winter_minus5_km: 390,
        confidence: "estimated"
      },
      rangeTests: [],
      chargingDC_peak_kW: 200,
      chargingDC_10_80_min: 31,
      chargingDC_kWh_30min: 65,
      chargingCurve: [
        { soc: 0, power: 140 },
        { soc: 10, power: 200 },
        { soc: 30, power: 180 },
        { soc: 50, power: 130 },
        { soc: 80, power: 50 },
        { soc: 100, power: 10 }
      ],
      availability: "available",
      notes: "Version haut de gamme avec transmission intégrale 4MATIC."
    }
  ],
  warranty: {
    vehicle_years: 3,
    vehicle_km: 150000,
    battery_years: 10,
    battery_km: 250000,
    battery_soh_minimum_percent: 70
  },
  keyFeatures: [
    { category: "design", label: "Gros gabarit de 5,12 m avec design raffiné et aérodynamique" },
    { category: "technologie", label: "MBUX Hyperscreen triple écran et sono Burmester 3D" },
    { category: "securite", label: "Conduite autonome de niveau 3 sur autoroute (Drive Pilot)" },
    { category: "confort", label: "Option 7 places et suspensions pneumatiques haut de gamme" }
  ],
  verdict: {
    strengths: [
      "Luxe exceptionnel et espace à bord remarquable en configuration 5 ou 7 places",
      "Garantie batterie de 10 ans et intégration de la technologie Drive Pilot"
    ],
    weaknesses: [
      "Vitesse de charge rapide correcte mais en retrait par rapport à la concurrence 800V",
      "Encombrement routier difficile en centre-ville (longueur 5,12 m)"
    ],
    idealUserProfile: "Familles fortunées ou cadres à la recherche du maximum de confort et d'espace disponible dans l'univers électrique.",
    notIdealFor: "Acheteurs cherchant de la maniabilité urbaine ou à budget restreint."
  },
  sources: ["constructeur"],
  imageCredit: "Constructeur"
};
writeJSON('mercedes-eqs-suv.json', eqsSuv);


// 9. Create GLC
const glc = {
  slug: "mercedes-glc",
  brand: "Mercedes",
  model: "GLC",
  variant: "85 kWh · Propulsion/4MATIC",
  bodyType: "SUV",
  segment: "D",
  productionCountry: "Allemagne",
  assemblyPlant: "Bremen",
  releaseYear: 2026,
  marketAvailability: "À commander",
  power_kW: 200,
  power_hp: 272,
  torque_Nm: 380,
  drivetrain: "RWD",
  motors: 1,
  acceleration_0_100_s: 6.2,
  topSpeed_kmh: 190,
  usableCapacity_kWh: 85.0,
  grossCapacity_kWh: 90.0,
  chemistry: "NMC",
  architecture_V: 800,
  mass_kg: 2150,
  wltp_max_km: 610,
  wltp_min_km: 510,
  realRange: {
    mixed_km: 470,
    highway_130_km: 330,
    urban_km: 560,
    winter_minus5_km: 375,
    confidence: "estimated"
  },
  consumption_mixed_kWh_per_100km: 18.0,
  consumption_highway_kWh_per_100km: 25.0,
  consumption_winter_kWh_per_100km: 23.0,
  dragCoefficient_Cx: 0.26,
  chargingDC: {
    peakPower_kW: 250,
    time_10_80_min: 22,
    kWh_added_30min: 68,
    confidence: "estimated"
  },
  chargingAC: {
    onboardCharger_kW: 11.0,
    phases: 3,
    time_0_100_h: 8.5
  },
  plugAndCharge: true,
  v2l: true,
  v2g: false,
  v2l_option_EUR: null,
  chargingCurve: [
    { soc: 0, power: 100 },
    { soc: 10, power: 250 },
    { soc: 30, power: 210 },
    { soc: 50, power: 160 },
    { soc: 80, power: 65 },
    { soc: 100, power: 10 }
  ],
  thousandKmChallenge: null,
  length_mm: 4716,
  width_mm: 1890,
  height_mm: 1640,
  wheelbase_mm: 2888,
  trunkCapacity_L: 550,
  trunkCapacityFolded_L: 1600,
  frunkCapacity_L: null,
  leasingSocialEligible: false,
  leasingSocial_EUR_per_month: null,
  availableAids: [],
  lastUpdated: "2026-06-02",
  trims: [
    {
      name: "PRO GLC 250e SUV",
      price_EUR: 59900,
      batteryUsed: "85 kWh",
      equipmentHighlights: [
        "610 km WLTP",
        "Architecture de charge 800V",
        "MBUX écran 11,9 pouces"
      ]
    },
    {
      name: "AMG Line GLC 250e SUV",
      price_EUR: 66900,
      batteryUsed: "85 kWh",
      equipmentHighlights: [
        "Kit carrosserie AMG de série",
        "Jantes alliage AMG 19 pouces",
        "Sellerie similicuir/microfibre"
      ]
    }
  ],
  configurations: [
    {
      id: "mercedes-glc-pro",
      label: "GLC 250e SUV PRO",
      battery: "standard",
      trim: "PRO GLC 250e SUV",
      wheelSize_inches: 18,
      tyreType: "summer",
      options: [],
      price_EUR: 59900,
      monthlyLease_EUR: null,
      leasingSocialEligible: false,
      wltp_km: 610,
      wltp_consumption_kWh_100km: 15.2,
      realRange: {
        mixed_km: 470,
        highway_130_km: 330,
        urban_km: 560,
        winter_minus5_km: 375,
        confidence: "estimated"
      },
      rangeTests: [],
      chargingDC_peak_kW: 250,
      chargingDC_10_80_min: 22,
      chargingDC_kWh_30min: 68,
      chargingCurve: [
        { soc: 0, power: 100 },
        { soc: 10, power: 250 },
        { soc: 30, power: 210 },
        { soc: 50, power: 160 },
        { soc: 80, power: 65 },
        { soc: 100, power: 10 }
      ],
      availability: "upcoming",
      notes: "SUV familial polyvalent d'efficience maximale."
    },
    {
      id: "mercedes-glc-amg",
      label: "GLC 250e SUV AMG Line",
      battery: "standard",
      trim: "AMG Line GLC 250e SUV",
      wheelSize_inches: 19,
      tyreType: "summer",
      options: [],
      price_EUR: 66900,
      monthlyLease_EUR: null,
      leasingSocialEligible: false,
      wltp_km: 560,
      wltp_consumption_kWh_100km: 16.5,
      realRange: {
        mixed_km: 440,
        highway_130_km: 310,
        urban_km: 520,
        winter_minus5_km: 350,
        confidence: "estimated"
      },
      rangeTests: [],
      chargingDC_peak_kW: 250,
      chargingDC_10_80_min: 22,
      chargingDC_kWh_30min: 68,
      chargingCurve: [
        { soc: 0, power: 100 },
        { soc: 10, power: 250 },
        { soc: 30, power: 210 },
        { soc: 50, power: 160 },
        { soc: 80, power: 65 },
        { soc: 100, power: 10 }
      ],
      availability: "upcoming",
      notes: "Look dynamique avec kit AMG et jantes sport."
    }
  ],
  warranty: {
    vehicle_years: 2,
    vehicle_km: 100000,
    battery_years: 8,
    battery_km: 160000,
    battery_soh_minimum_percent: 70
  },
  keyFeatures: [
    { category: "design", label: "Design de SUV athlétique avec d'excellentes finitions" },
    { category: "technologie", label: "Charge ultra-rapide 800V 250 kW et écran central vertical" },
    { category: "securite", label: "Pack assistance active et projecteurs DIGITAL LIGHT" },
    { category: "confort", label: "Suspensions confortables et coffre polyvalent de 550 L" }
  ],
  verdict: {
    strengths: [
      "Autonomie réelle confortable et charge ultra-rapide 800V",
      "Volume de coffre pratique et polyvalence de SUV familial"
    ],
    weaknesses: [
      "Tarif supérieur à la berline équivalente",
      "Poids important de plus de 2,1 tonnes"
    ],
    idealUserProfile: "Familles et professionnels recherchant le compromis idéal de confort, d'habitabilité et de vitesse de recharge sur autoroute.",
    notIdealFor: "Acheteurs prioritaires sur les petits budgets ou cherchant un véhicule ultra-compact."
  },
  sources: ["constructeur"],
  imageCredit: "Constructeur"
};
writeJSON('mercedes-glc.json', glc);


// 10. Create Classe G
const classeG = {
  slug: "mercedes-classe-g",
  brand: "Mercedes",
  model: "Classe G",
  variant: "116 kWh · 4MATIC",
  bodyType: "Tout-terrain",
  segment: "F",
  productionCountry: "Autriche",
  assemblyPlant: "Graz",
  releaseYear: 2024,
  marketAvailability: "Disponible",
  power_kW: 432,
  power_hp: 587,
  torque_Nm: 1164,
  drivetrain: "AWD",
  motors: 4,
  acceleration_0_100_s: 4.7,
  topSpeed_kmh: 180,
  usableCapacity_kWh: 116.0,
  grossCapacity_kWh: 122.0,
  chemistry: "NMC",
  architecture_V: 400,
  mass_kg: 3085,
  wltp_max_km: 473,
  wltp_min_km: 450,
  realRange: {
    mixed_km: 360,
    highway_130_km: 240,
    urban_km: 440,
    winter_minus5_km: 280,
    confidence: "estimated"
  },
  consumption_mixed_kWh_per_100km: 27.5,
  consumption_highway_kWh_per_100km: 38.0,
  consumption_winter_kWh_per_100km: 34.0,
  dragCoefficient_Cx: 0.44,
  chargingDC: {
    peakPower_kW: 200,
    time_10_80_min: 32,
    kWh_added_30min: 65,
    confidence: "estimated"
  },
  chargingAC: {
    onboardCharger_kW: 11.0,
    phases: 3,
    time_0_100_h: 12.0
  },
  plugAndCharge: true,
  v2l: false,
  v2g: false,
  v2l_option_EUR: null,
  chargingCurve: [
    { soc: 0, power: 120 },
    { soc: 10, power: 200 },
    { soc: 30, power: 180 },
    { soc: 50, power: 130 },
    { soc: 80, power: 50 },
    { soc: 100, power: 10 }
  ],
  thousandKmChallenge: null,
  length_mm: 4624,
  width_mm: 1931,
  height_mm: 1987,
  wheelbase_mm: 2890,
  trunkCapacity_L: 640,
  trunkCapacityFolded_L: 1940,
  frunkCapacity_L: null,
  leasingSocialEligible: false,
  leasingSocial_EUR_per_month: null,
  availableAids: [],
  lastUpdated: "2026-06-02",
  trims: [
    {
      name: "G 580 EDITION ONE",
      price_EUR: 165000,
      batteryUsed: "116 kWh",
      equipmentHighlights: [
        "4 moteurs électriques indépendants",
        "Fonction G-TURN (demi-tour sur place)",
        "G-STEERING pour braquage ultra-court"
      ]
    }
  ],
  configurations: [
    {
      id: "mercedes-classe-g-580-edition-one",
      label: "G 580 EDITION ONE",
      battery: "standard",
      trim: "G 580 EDITION ONE",
      wheelSize_inches: 20,
      tyreType: "summer",
      options: [],
      price_EUR: 165000,
      monthlyLease_EUR: null,
      leasingSocialEligible: false,
      wltp_km: 473,
      wltp_consumption_kWh_100km: 26.3,
      realRange: {
        mixed_km: 360,
        highway_130_km: 240,
        urban_km: 440,
        winter_minus5_km: 280,
        confidence: "estimated"
      },
      rangeTests: [],
      chargingDC_peak_kW: 200,
      chargingDC_10_80_min: 32,
      chargingDC_kWh_30min: 65,
      chargingCurve: [
        { soc: 0, power: 120 },
        { soc: 10, power: 200 },
        { soc: 30, power: 180 },
        { soc: 50, power: 130 },
        { soc: 80, power: 50 },
        { soc: 100, power: 10 }
      ],
      availability: "available",
      notes: "Version de lancement haut de gamme, capacités off-road ultimes."
    }
  ],
  warranty: {
    vehicle_years: 3,
    vehicle_km: 150000,
    battery_years: 10,
    battery_km: 250000,
    battery_soh_minimum_percent: 70
  },
  keyFeatures: [
    { category: "design", label: "Design boxy emblématique préservé avec calandre éclairée" },
    { category: "technologie", label: "4 moteurs électriques permettant le G-TURN (rotation 360°)" },
    { category: "securite", label: "Protection sous châssis ultra-résistante en carbone et kevlar" },
    { category: "confort", label: "Aptitude exceptionnelle au franchissement off-road (pente 100%)" }
  ],
  verdict: {
    strengths: [
      "Capacités de franchissement et fonctions technologiques off-road révolutionnaires (G-TURN)",
      "Préservation du design iconique et finitions intérieures luxueuses"
    ],
    weaknesses: [
      "Poids démesuré de plus de 3 tonnes limitant l'efficience",
      "Consommation colossale sur autoroute et aérodynamisme d'armoire normande"
    ],
    idealUserProfile: "Passionnés de franchissement et amateurs de véhicules d'exception souhaitant allier l'icône G avec le silence et la force du couple électrique.",
    notIdealFor: "Navetteurs autoroutiers réguliers ou personnes soucieuses d'efficience énergétique."
  },
  sources: ["constructeur"],
  imageCredit: "Constructeur"
};
writeJSON('mercedes-classe-g.json', classeG);

console.log("MERCEDES DATABASE ALIGNMENT COMPLETED SUCCESSFULY!");
