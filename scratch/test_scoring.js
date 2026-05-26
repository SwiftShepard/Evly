import fs from 'fs';
import path from 'path';

// Mock types/constants matching scoring.ts
const EUROPEAN_COUNTRIES = new Set([
  "France", "Allemagne", "Espagne", "Italie", "Suède", "Royaume-Uni", "Portugal",
  "Pologne", "Tchéquie", "Slovaquie", "Hongrie", "Belgique", "Autriche", "Roumanie"
]);

const STELLANTIS_BRANDS = new Set([
  "Peugeot", "Citroën", "Fiat", "Opel", "Jeep", "Alfa Romeo", "Lancia", "DS"
]);

function getSoftwareRating(brand, model) {
  const b = brand.toLowerCase();
  if (b === "tesla" || b === "mercedes-benz" || b === "mercedes" || b === "bmw") return 5;
  if (["renault", "nissan", "volvo", "polestar", "porsche", "smart", "kia", "hyundai", "xpeng", "nio", "xiaomi"].includes(b)) return 4;
  if (b === "leapmotor") return 3.5;
  if (["peugeot", "citroën", "fiat", "opel", "jeep", "lancia", "alfa romeo", "ds", "toyota", "lexus", "dacia", "mobilize", "maxus"].includes(b)) return 2;
  return 3;
}

function matchesBodyType(vehicleBody, preference) {
  const body = vehicleBody.toLowerCase();
  if (preference === "hatchback_city") return body.includes("citadine") || body.includes("hatchback") || body.includes("mini");
  if (preference === "sedan_break") return body.includes("berline") || body.includes("break") || body.includes("sedan") || body.includes("coupe");
  if (preference === "suv_crossover") return body.includes("suv") || body.includes("crossover") || body.includes("fastback");
  if (preference === "van_monospace") return body.includes("monospace") || body.includes("ludospace") || body.includes("van") || body.includes("utilitaire");
  return true;
}

// Emulate scoreVehicle (Unfixed segment logic)
function scoreVehicleOld(vehicle, answers) {
  const isPrimary = answers.role === "primary";
  const trunk = vehicle.trunkCapacity_L;
  const length = vehicle.length_mm;

  const segment = vehicle.segment ?? "B";
  let allowedSegments;

  if (answers.household === "large_family") {
    allowedSegments = isPrimary ? new Set(["C", "D", "E", "F"]) : new Set(["B", "C", "D", "E"]);
  } else if (answers.household === "family") {
    allowedSegments = isPrimary ? new Set(["B", "C", "D"]) : new Set(["A", "B", "C"]);
  } else {
    allowedSegments = answers.usage === "highway" ? new Set(["B", "C", "D"]) : new Set(["A", "B", "C"]);
  }

  if (!allowedSegments.has(segment)) {
    return { status: "EXCLUDED_BY_SEGMENT", segment, allowedSegments: Array.from(allowedSegments) };
  }

  if (isPrimary) {
    if (vehicle.bodyType === "Quadricycle") return { status: "EXCLUDED_QUADRICYCLE" };
    if (answers.household === "large_family") {
      if (length < 4300 || trunk < 380) return { status: "EXCLUDED_LARGE_FAMILY_DIMENSIONS", length, trunk };
    } else if (answers.household === "family") {
      if (length < 4150 || trunk < 320) return { status: "EXCLUDED_FAMILY_DIMENSIONS", length, trunk };
    }
  }

  const virtualConfigs = vehicle.configurations || [];
  const validConfigs = virtualConfigs.filter(c => c.price_EUR !== null);
  if (validConfigs.length === 0) return { status: "NO_VALID_CONFIGS" };

  const isUserLeasingSocial = answers.leasingSocialRfr && answers.leasingSocialUsage;

  let bestConfigMatch = null;
  let highestScore = -999;
  let finalReasons = [];
  let finalWarnings = [];

  for (const config of validConfigs) {
    let score = 50;
    const reasons = [];
    const warnings = [];

    const rawPrice = config.price_EUR ?? 0;
    const isEU = EUROPEAN_COUNTRIES.has(vehicle.productionCountry);
    const isEligibleCEE = isEU && rawPrice <= 47000;
    const totalCeeAid = isEligibleCEE ? (vehicle.availableAids || []).reduce((sum, a) => sum + a.amount_EUR, 0) : 0;
    const configPrice = rawPrice - totalCeeAid;

    let monthlyLease = config.monthlyLease_EUR;
    if (monthlyLease === null || monthlyLease === 0) {
      monthlyLease = Math.round(configPrice * 0.009);
    }

    const isLeasingSocialApplied = isUserLeasingSocial && (config.leasingSocialEligible || vehicle.leasingSocialEligible);
    if (isLeasingSocialApplied) {
      monthlyLease = vehicle.leasingSocial_EUR_per_month ?? 100;
    }

    if (answers.budgetType === "buy") {
      if (configPrice > answers.budgetMax * 1.08) {
        continue;
      } else if (configPrice > answers.budgetMax) {
        score -= 25;
        warnings.push(`Over budget: ${configPrice} > ${answers.budgetMax}`);
      } else {
        score += 10;
        reasons.push(`Budget match`);
      }
    } else {
      if (monthlyLease > answers.budgetMax * 1.08) {
        continue;
      } else if (monthlyLease > answers.budgetMax) {
        score -= 25;
        warnings.push(`Over lease budget`);
      } else {
        score += 10;
        reasons.push(`Lease budget match`);
      }
    }

    const realRange = config.realRange || vehicle.realRange;
    const highwayRange = realRange?.highway_130_km ?? Math.round(vehicle.realRange.mixed_km * 0.7);
    const mixedRange = realRange?.mixed_km ?? vehicle.realRange.mixed_km;
    const winterRange = realRange?.winter_minus5_km ?? vehicle.realRange.winter_minus5_km;

    if (answers.usage === "highway") {
      if (highwayRange >= 320) score += 15;
      else if (highwayRange >= 220) score += 8;
      else score -= 15;

      const dcPeak = config.chargingDC_peak_kW ?? vehicle.chargingDC.peakPower_kW;
      const dcTime = config.chargingDC_10_80_min ?? vehicle.chargingDC.time_10_80_min;
      const is800V = vehicle.architecture_V === 800;

      if (is800V || dcTime <= 20) score += 15;
      else if (dcPeak >= 120 && dcTime <= 32) score += 8;
      else if (dcTime > 35 || dcPeak < 80) score -= 10;
    } else if (answers.usage === "urban") {
      if (length < 4200) score += 15;
      else if (length > 4700) score -= 10;
      if (vehicle.chemistry === "LFP") score += 8;
      if (answers.charging === "home") score += 5;
    } else {
      if (mixedRange >= 380) score += 15;
      else if (mixedRange >= 280) score += 8;
      else score -= 10;
    }

    if (answers.charging === "public_slow" || answers.charging === "public_fast") {
      if (mixedRange < 330) score -= 15;
      else if (mixedRange >= 480) score += 10;
    }

    if (answers.preferEurope) {
      if (isEU) score += 20;
      else score -= 15;
    }

    if (answers.chargingSpeed === "under_30") {
      const dcTime = config.chargingDC_10_80_min ?? vehicle.chargingDC.time_10_80_min;
      const dcPeak = config.chargingDC_peak_kW ?? vehicle.chargingDC.peakPower_kW;

      if (dcPeak > 0 && dcTime > 0 && dcTime <= 32) {
        score += 15;
      } else {
        score -= 25;
      }
    }

    const softwareRating = getSoftwareRating(vehicle.brand, vehicle.model);
    if (answers.softwareImportance === "good_software") {
      if (softwareRating >= 4) score += 15;
      else if (softwareRating <= 2) score -= 25;
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));
    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestConfigMatch = config;
      finalReasons = reasons;
      finalWarnings = warnings;
    }
  }

  if (bestConfigMatch === null || highestScore < 10) {
    return { status: "EXCLUDED_NO_MATCH", highestScore };
  }

  return { status: "MATCH", score: highestScore, bestConfigMatch, reasons: finalReasons, warnings: finalWarnings };
}

function scoreVehicle(vehicle, answers) {
  const cleanVehicle = { ...vehicle, segment: (vehicle.segment ?? "B").split(",")[0].trim() };
  return scoreVehicleOld(cleanVehicle, answers);
}

// Load kia-ev4
const ev4Path = path.resolve('src/data/vehicles/kia-ev4.json');
const ev4Data = JSON.parse(fs.readFileSync(ev4Path, 'utf8'));

// Test sets
const testAnswers = {
  usage: "mixed",
  mileage: 15000,
  charging: "home",
  role: "primary",
  household: "family",
  bodyType: "any",
  chargingSpeed: "under_30", // should pass with 31 min charging time!
  budgetType: "buy",
  budgetMax: 45000,
  leasingSocialRfr: false,
  leasingSocialUsage: false,
  preferEurope: true,
  softwareImportance: "good_software"
};

console.log("=== SCORING KIA EV4 (BEFORE SEGMENT SPLIT) ===");
const resultOldSegment = scoreVehicleOld({ ...ev4Data, segment: "C, berline compacte" }, testAnswers);
console.log(resultOldSegment);

console.log("\n=== SCORING KIA EV4 (WITH CORRECT FIX) ===");
// When segment is C, berline compacte but processed with split:
const resultFixed = scoreVehicle(ev4Data, testAnswers);
console.log(resultFixed);
