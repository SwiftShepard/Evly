import type { Vehicle, VehicleConfiguration } from "@/data/schemas";
import { calculateCeeAid } from "@/lib/cee";

export interface MatcherAnswers {
  usage: "urban" | "mixed" | "highway";
  mileage: number; // km/an
  charging: "home" | "public_slow" | "public_fast";
  role: "primary" | "secondary";
  longTripDistance: number; // km (plus long trajet habituel/annuel)
  household: "single_couple" | "family" | "large_family";
  trunkNeed: "any" | "medium" | "large";
  bodyType: "any" | "hatchback_city" | "sedan_break" | "suv_crossover" | "van_monospace";
  chargingSpeed: "any" | "under_30";
  budgetType: "buy" | "lease";
  budgetMax: number;
  leasingSocialRfr: boolean;
  leasingSocialUsage: boolean;
  preferEurope: boolean;
  softwareImportance: "any" | "good_software";
}

export interface MatchResult {
  vehicle: Vehicle;
  bestConfig: VehicleConfiguration | { label: string; price_EUR: number; monthlyLease_EUR: number | null; leasingSocialEligible: boolean };
  score: number;
  reasons: string[];
  warnings: string[];
}

const EUROPEAN_COUNTRIES = new Set([
  "France", "Allemagne", "Espagne", "Italie", "Suède", "Royaume-Uni", "Portugal",
  "Pologne", "Tchéquie", "Slovaquie", "Hongrie", "Belgique", "Autriche", "Roumanie"
]);

const STELLANTIS_BRANDS = new Set([
  "Peugeot", "Citroën", "Fiat", "Opel", "Jeep", "Alfa Romeo", "Lancia", "DS"
]);

function getSoftwareRating(brand: string, model: string): number {
  const b = brand.toLowerCase();
  
  // 5/5 : Tesla, Mercedes, BMW
  if (b === "tesla" || b === "mercedes-benz" || b === "mercedes" || b === "bmw") {
    return 5;
  }
  
  // 4/5 : Renault, Nissan, Volvo, Polestar, Porsche, Smart, Kia, Hyundai, Xpeng, Nio, Xiaomi
  if (
    b === "renault" || b === "nissan" || b === "volvo" || b === "polestar" || 
    b === "porsche" || b === "smart" || b === "kia" || b === "hyundai" || 
    b === "xpeng" || b === "nio" || b === "xiaomi"
  ) {
    return 4;
  }
  
  // 3.5/5 : Leapmotor
  if (b === "leapmotor") {
    return 3.5;
  }
  
  // 2/5 : Stellantis (Peugeot, Citroën, Fiat, Opel, Jeep, Lancia, Alfa Romeo, DS), Toyota, Lexus, Dacia, Maxus
  if (
    b === "peugeot" || b === "citroën" || b === "fiat" || b === "opel" || b === "jeep" || 
    b === "lancia" || b === "alfa romeo" || b === "ds" || b === "toyota" || b === "lexus" || 
    b === "dacia" || b === "maxus"
  ) {
    return 2;
  }
  
  // 3/5 : Volkswagen, Cupra, Skoda, Audi, BYD, MG, Zeekr, Ford, Mazda
  return 3;
}

function matchesBodyType(vehicleBody: string, preference: string): boolean {
  const body = vehicleBody.toLowerCase();
  if (preference === "hatchback_city") {
    return body.includes("citadine") || body.includes("hatchback") || body.includes("mini");
  }
  if (preference === "sedan_break") {
    return body.includes("berline") || body.includes("break") || body.includes("sedan") || body.includes("coupe");
  }
  if (preference === "suv_crossover") {
    return body.includes("suv") || body.includes("crossover") || body.includes("fastback");
  }
  if (preference === "van_monospace") {
    return body.includes("monospace") || body.includes("ludospace") || body.includes("van") || body.includes("utilitaire");
  }
  return true;
}

export function scoreVehicle(vehicle: Vehicle, answers: MatcherAnswers): MatchResult | null {
  const isPrimary = answers.role === "primary";
  const trunk = vehicle.trunkCapacity_L;
  const length = vehicle.length_mm;
  const isEU = EUROPEAN_COUNTRIES.has(vehicle.productionCountry);

  // Pré-filtre éliminatoire par segment (coeur et segments adjacents) pour éviter les résultats farfelus
  const segment = (vehicle.segment ?? "B").split(",")[0].trim();
  let allowedSegments: Set<string>;

  if (answers.household === "large_family") {
    if (isPrimary) {
      // Coeur D/E -> C, D, E, F (exclut citadines A, B)
      allowedSegments = new Set(["C", "D", "E", "F"]);
    } else {
      // Secondaire -> B, C, D, E
      allowedSegments = new Set(["B", "C", "D", "E"]);
    }
  } else if (answers.household === "family") {
    if (isPrimary) {
      // Coeur C -> B, C, D (exclut micro-urbains A et gros routiers/luxueux E, F)
      allowedSegments = new Set(["B", "C", "D"]);
    } else {
      // Secondaire -> A, B, C (exclut routières et grands SUV D, E, F)
      allowedSegments = new Set(["A", "B", "C"]);
    }
  } else {
    // Célibataire / couple
    if (answers.usage === "highway") {
      // Usage autoroutier régulier -> B, C, D (exclut A et E, F)
      allowedSegments = new Set(["B", "C", "D"]);
    } else {
      // Usage urbain / mixte quotidien -> A, B, C (exclut les gros routiers D, E, F)
      allowedSegments = new Set(["A", "B", "C"]);
    }
  }

  if (!allowedSegments.has(segment)) {
    return null; // Exclu car segment incohérent avec le profil
  }

  // Pré-filtre additionnel sur caractéristiques spécifiques
  if (isPrimary) {
    // Les quadricycles ne peuvent pas être un véhicule principal du foyer (accès autoroute impossible, vitesse limitée)
    if (vehicle.bodyType === "Quadricycle") {
      return null;
    }

    if (answers.household === "large_family") {
      if (length < 4300 || trunk < 380) {
        return null; // Trop compact comme véhicule principal d'une grande famille
      }
    } else if (answers.household === "family") {
      if (length < 4150 || trunk < 320) {
        return null; // Trop compact comme véhicule principal d'une famille
      }
    }
  }

  // 1. Détermination de la meilleure configuration ou du tarif de base
  const hasConfigs = vehicle.configurations && vehicle.configurations.length > 0;
  
  // Si le véhicule n'a pas de configurations détaillées, on crée une configuration virtuelle basée sur ses finitions
  const virtualConfigs = !hasConfigs
    ? vehicle.trims.map((t, idx) => ({
        id: `virtual-${idx}`,
        label: t.name,
        battery: "standard" as const,
        trim: t.name,
        wheelSize_inches: 18,
        tyreType: "summer" as const,
        options: [],
        usableCapacity_kWh: vehicle.usableCapacity_kWh,
        price_EUR: t.price_EUR,
        monthlyLease_EUR: vehicle.leasingSocialEligible && vehicle.leasingSocial_EUR_per_month
          ? vehicle.leasingSocial_EUR_per_month
          : null,
        leasingSocialEligible: vehicle.leasingSocialEligible,
        wltp_km: vehicle.wltp_min_km,
        wltp_consumption_kWh_100km: vehicle.consumption_mixed_kWh_per_100km,
        realRange: vehicle.realRange,
        chargingDC_peak_kW: vehicle.chargingDC.peakPower_kW,
        chargingDC_10_80_min: vehicle.chargingDC.time_10_80_min,
        chargingDC_kWh_30min: vehicle.chargingDC.kWh_added_30min,
        chargingCurve: vehicle.chargingCurve,
        availability: "available" as const,
        notes: null,
      }))
    : vehicle.configurations;

  // Filtrer les configurations valides
  const validConfigs = virtualConfigs.filter(c => c.price_EUR !== null);
  if (validConfigs.length === 0) return null;

  const isUserLeasingSocial = answers.leasingSocialRfr && answers.leasingSocialUsage;

  // Trouver la configuration qui maximise le score
  let bestConfigMatch: typeof validConfigs[0] | null = null;
  let highestScore = -999;
  let finalReasons: string[] = [];
  let finalWarnings: string[] = [];

  for (const config of validConfigs) {
    let score = 50; // base score
    const reasons: string[] = [];
    const warnings: string[] = [];

    // --- CRITÈRE 1 : BUDGET (Éliminatoire ou pénalité) ---
    const rawPrice = config.price_EUR ?? 0;
    
    // Déduction des aides CEE 2026 dynamiques (coup de pouce CEE + surbonus batterie européenne)
    const householdSize = answers.household === "large_family" ? 5 : answers.household === "family" ? 3 : 1;
    // Si l'utilisateur est éligible au leasing social RFR (RFR/part <= 16300€), il est d'office dans la catégorie précarité.
    // Sinon, on estime conservateur en le mettant dans la catégorie "autres".
    const taxIncome = answers.leasingSocialRfr ? 12000 : 80000;

    const { amount: totalCeeAid, isEligible: isEligibleCEE } = calculateCeeAid({
      vehicle,
      price: rawPrice,
      profileType: "particular",
      householdSize,
      taxIncome,
    });
    const configPrice = rawPrice - totalCeeAid;
    
    // Calcul du loyer estimé ou réel
    let monthlyLease = config.monthlyLease_EUR;
    if (monthlyLease === null || monthlyLease === 0) {
      // Fallback LLD approximatif (environ 0.9 % du prix d'achat net par mois)
      monthlyLease = Math.round(configPrice * 0.009);
    }
    
    // Si l'utilisateur est éligible au leasing social et que le véhicule l'est aussi
    const isLeasingSocialApplied = isUserLeasingSocial && (config.leasingSocialEligible || vehicle.leasingSocialEligible);
    if (isLeasingSocialApplied) {
      monthlyLease = vehicle.leasingSocial_EUR_per_month ?? 100;
    }

    if (answers.budgetType === "buy") {
      if (configPrice > answers.budgetMax * 1.08) {
        continue; // Trop cher, éliminé
      } else if (configPrice > answers.budgetMax) {
        score -= 25;
        const priceLabel = isEligibleCEE ? `${configPrice.toLocaleString()} € après prime CEE` : `${configPrice.toLocaleString()} €`;
        warnings.push(`Prix (${priceLabel}) légèrement au-dessus de votre budget max`);
      } else {
        score += 10;
        const priceLabel = isEligibleCEE ? `${configPrice.toLocaleString()} € après prime CEE` : `${configPrice.toLocaleString()} €`;
        reasons.push(`Prix net (${priceLabel}) parfaitement en phase avec votre budget`);
      }
    } else {
      // leasing
      if (monthlyLease > answers.budgetMax * 1.08) {
        continue; // Trop cher, éliminé
      } else if (monthlyLease > answers.budgetMax) {
        score -= 25;
        warnings.push(`Loyer estimé (${monthlyLease} €/mois) légèrement au-dessus de votre budget`);
      } else {
        score += 10;
        if (isLeasingSocialApplied) {
          reasons.push(`Mensualité exceptionnelle de ${monthlyLease} €/mois grâce à votre éligibilité au Leasing Social`);
        } else {
          reasons.push(`Loyer mensuel (${monthlyLease} €/mois) dans votre budget`);
        }
      }
    }

    // --- CRITÈRE 2 : AUTONOMIE & USAGE (Max 35 points) ---
    // On extrait l'autonomie réelle selon la configuration
    const realRange = config.realRange ?? vehicle.realRange;
    const highwayRange = realRange?.highway_130_km ?? Math.round(vehicle.realRange.mixed_km * 0.7);
    const mixedRange = realRange?.mixed_km ?? vehicle.realRange.mixed_km;
    const winterRange = realRange?.winter_minus5_km ?? vehicle.realRange.winter_minus5_km;

    if (answers.usage === "highway") {
      // Grand voyageur : importance capitale de l'autonomie sur autoroute et de la vitesse de recharge
      if (highwayRange >= 320) {
        score += 15;
        reasons.push(`Excellente autonomie sur autoroute (${highwayRange} km réels)`);
      } else if (highwayRange >= 220) {
        score += 8;
        reasons.push(`Autonomie autoroute correcte (${highwayRange} km réels)`);
      } else {
        score -= 15;
        warnings.push(`Autonomie autoroute limitée (${highwayRange} km réels), arrêts fréquents à prévoir`);
      }

      // Vitesse de recharge
      const dcPeak = config.chargingDC_peak_kW ?? vehicle.chargingDC.peakPower_kW;
      const dcTime = config.chargingDC_10_80_min ?? vehicle.chargingDC.time_10_80_min;
      const is800V = vehicle.architecture_V === 800;

      if (is800V || dcTime <= 20) {
        score += 15;
        reasons.push("Recharge ultra-rapide (architecture 800V ou < 20 min pour 10-80%)");
      } else if (dcPeak >= 120 && dcTime <= 32) {
        score += 8;
        reasons.push(`Bonne vitesse de recharge DC (${dcPeak} kW, 10-80% en ${dcTime} min)`);
      } else if (dcTime > 35 || dcPeak < 80) {
        score -= 10;
        warnings.push(`Recharge rapide lente (10-80% en ${dcTime} min), trajets autoroutiers rallongés`);
      }
    } else if (answers.usage === "urban") {
      // Urbain : on valorise la compacité, les batteries légères, et la consommation
      const length = vehicle.length_mm;
      if (length < 4200) {
        score += 15;
        reasons.push("Gabarit compact idéal pour la ville et le stationnement");
      } else if (length > 4700) {
        score -= 10;
        warnings.push("Gabarit imposant, moins maniable en environnement urbain");
      }

      const isLfp = vehicle.chemistry === "LFP";
      if (isLfp) {
        score += 8;
        reasons.push("Batterie LFP durable, idéale pour des cycles de charge réguliers à 100%");
      }

      if (answers.charging === "home") {
        score += 5;
        reasons.push("Recharge à domicile très économique sur ce type de petit modèle");
      }
    } else {
      // Usage mixte
      if (mixedRange >= 380) {
        score += 15;
        reasons.push(`Autonomie mixte très confortable (${mixedRange} km réels)`);
      } else if (mixedRange >= 280) {
        score += 8;
        reasons.push(`Autonomie mixte rassurante (${mixedRange} km réels)`);
      } else {
        score -= 10;
        warnings.push(`Autonomie mixte un peu juste (${mixedRange} km réels) pour les weekends`);
      }
    }

    // Alerte hivernale si la perte est importante ou si la batterie est sensible
    const rangeLossPct = Math.round(((mixedRange - winterRange) / mixedRange) * 100);
    if (rangeLossPct > 35) {
      warnings.push(`Perte d'autonomie importante en hiver (-${rangeLossPct}% par grand froid)`);
    }

    // Interaction entre mode de recharge et autonomie
    if (answers.charging === "public_slow" || answers.charging === "public_fast") {
      if (mixedRange < 330) {
        score -= 15;
        warnings.push(`Batterie compacte exigeant des recharges publiques fréquentes (2 à 3 fois par semaine)`);
      } else if (mixedRange >= 480) {
        score += 10;
        reasons.push(`Grande autonomie limitant la contrainte des recharges publiques (1 fois par semaine ou moins)`);
      }
    }

    // --- CRITÈRE 2.5 : GRAND TRAJET DE L'ANNÉE (Simulation de trajet) ---
    const D = answers.longTripDistance || 500;
    const hasFastCharge = (config.chargingDC_peak_kW ?? vehicle.chargingDC.peakPower_kW ?? 0) > 0;
    
    if (!hasFastCharge && D > 150) {
      score -= 40;
      warnings.push("Pas de recharge rapide DC : inadapté pour les trajets de plus de 150 km");
    } else if (hasFastCharge) {
      const dcTime = config.chargingDC_10_80_min ?? vehicle.chargingDC.time_10_80_min ?? 30;
      const firstRelay = highwayRange;
      
      if (D <= firstRelay) {
        score += 15;
        reasons.push(`Grand trajet (${D} km) réalisable d'une seule traite (zéro arrêt charge)`);
      } else {
        const remainingD = D - firstRelay;
        const relaySize = highwayRange * 0.7; // relais suivants de 80% à 10% SoC
        const legSize = Math.max(50, relaySize); // évite division par 0
        const stops = Math.ceil(remainingD / legSize);
        const chargeTime = stops * dcTime;
        
        if (stops === 1) {
          score += 10;
          reasons.push(`Voyage efficace : 1 seul arrêt charge (${chargeTime} min) pour faire ${D} km`);
        } else if (stops === 2) {
          score += 5;
          reasons.push(`Voyage correct : 2 arrêts charge (${chargeTime} min au total) sur ${D} km`);
        } else if (stops >= 4) {
          score -= 15;
          warnings.push(`Grand trajet de ${D} km pénible : au moins ${stops} arrêts charge requis (${chargeTime} min)`);
        } else {
          if (chargeTime > 90) {
            score -= 10;
            warnings.push(`Trajet de ${D} km avec 3 arrêts charge et un temps d'attente important (${chargeTime} min)`);
          } else {
            reasons.push(`Trajet de ${D} km avec 3 arrêts charge (total : ${chargeTime} min)`);
          }
        }
      }
    }

    // --- CRITÈRE 3 : COMPOSITION FOYER & COFFRE (Max 25 points) ---
    const trunk = vehicle.trunkCapacity_L;
    const length = vehicle.length_mm;
    const isPrimary = answers.role === "primary";

    if (answers.household === "large_family") {
      if (isPrimary) {
        if (trunk >= 480 && length >= 4400) {
          score += 20;
          reasons.push(`Gabarit routier généreux (${trunk} L de coffre) adapté en véhicule principal`);
        } else if (trunk < 380 || length < 4300) {
          score -= 40;
          warnings.push(`Gabarit trop compact pour être le véhicule principal d'une grande famille`);
        } else {
          score += 5;
          warnings.push(`Coffre de ${trunk} L un peu restreint pour le véhicule principal d'une grande famille`);
        }
      } else {
        // Véhicule secondaire
        if (trunk >= 350) {
          score += 20;
          reasons.push("Volume de coffre pratique pour les trajets secondaires de la famille");
        } else {
          score += 10;
        }
      }
    } else if (answers.household === "family") {
      if (isPrimary) {
        if (trunk >= 380 && length >= 4250) {
          score += 20;
          reasons.push(`Coffre adapté (${trunk} L) et gabarit routier en véhicule principal`);
        } else if (trunk < 320 || length < 4150) {
          score -= 35;
          warnings.push(`Format citadine / petit coffre (${trunk} L), juste pour être le véhicule principal de la famille`);
        } else {
          score += 5;
          warnings.push(`Coffre de ${trunk} L un peu étroit pour le véhicule principal de la famille`);
        }
      } else {
        // Véhicule secondaire
        if (trunk >= 300) {
          score += 20;
          reasons.push("Idéal en second véhicule familial (agile avec coffre d'appoint)");
        } else {
          score += 15;
          reasons.push("Second véhicule très compact pour les trajets courts / école");
        }
      }
    } else {
      // Célibataire / couple
      if (length < 4350) {
        score += 15;
        if (trunk < 300) {
          reasons.push("Format compact et agile, coffre suffisant pour deux personnes");
        } else {
          reasons.push("Gabarit compact et polyvalent, adapté pour un célibataire ou couple");
        }
      } else {
        // Véhicule grand/SUV pour célibataire ou couple
        if (answers.usage === "highway") {
          score += 10;
          reasons.push("Gabarit routier confortable pour les longs trajets à deux");
        } else {
          // Pénalité pour véhicule surdimensionné par rapport aux besoins quotidiens (urbain / mixte)
          score -= 20;
          warnings.push("Gabarit important et surdimensionné pour l'usage quotidien d'un célibataire/couple");
        }
      }
    }

    // --- CRITÈRE 3.5 : BESOIN EXPRESS DE COFFRE ---
    if (answers.trunkNeed === "medium") {
      if (trunk >= 350) {
        score += 15;
        reasons.push(`Volume de coffre de ${trunk} L en adéquation avec votre besoin moyen (≥ 350 L)`);
      } else {
        score -= 25;
        warnings.push(`Volume de coffre (${trunk} L) inférieur à votre souhait de 350 L minimum`);
      }
    } else if (answers.trunkNeed === "large") {
      if (trunk >= 450) {
        score += 25;
        reasons.push(`Gros volume de coffre (${trunk} L) répondant parfaitement à votre besoin (≥ 450 L)`);
      } else {
        score -= 35;
        warnings.push(`Volume de coffre (${trunk} L) insuffisant par rapport à votre besoin de 450 L minimum`);
      }
    }

    // --- CRITÈRE 4 : SENSANTIBILITÉ EUROPÉENNE (Max 20 points) ---
    if (answers.preferEurope) {
      if (isEU) {
        score += 20;
        reasons.push(`Produit en Europe (${vehicle.productionCountry}) : éligible aux aides CEE`);
      } else {
        score -= 15;
        warnings.push(`Fabriqué hors Europe (${vehicle.productionCountry}) : pas d'aides CEE de l'État`);
      }
    } else {
      if (isEU) {
        score += 5;
        reasons.push(`Assemblé en Europe (${vehicle.productionCountry})`);
      } else {
        warnings.push(`Pas d'aides CEE de l'État (produit en ${vehicle.productionCountry})`);
      }
    }

    // --- CRITÈRE 5 : LEASING SOCIAL (AIDE CEE) ---
    if (isLeasingSocialApplied) {
      score += 20;
    }

    // --- CRITÈRE 6 : PRÉFÉRENCE DE SILHOUETTE (CARROSSERIE) ---
    if (answers.bodyType !== "any") {
      if (matchesBodyType(vehicle.bodyType, answers.bodyType)) {
        score += 15;
        reasons.push(`Silhouette correspondant à votre préférence (${vehicle.bodyType})`);
      } else {
        score -= 15;
        warnings.push(`Silhouette (${vehicle.bodyType}) différente de votre préférence`);
      }
    }

    // --- CRITÈRE 7 : VITESSE DE CHARGE CCS ---
    if (answers.chargingSpeed === "under_30") {
      const dcTime = config.chargingDC_10_80_min ?? vehicle.chargingDC.time_10_80_min;
      const dcPeak = config.chargingDC_peak_kW ?? vehicle.chargingDC.peakPower_kW;

      if (dcPeak > 0 && dcTime > 0 && dcTime <= 32) {
        score += 15;
        reasons.push(`Recharge rapide optimale de ${dcTime} min (10-80%)`);
      } else {
        score -= 25;
        if (dcPeak === 0 || dcTime === 0 || !dcTime) {
          warnings.push("Pas de recharge rapide DC disponible (connecteur CCS absent)");
        } else {
          warnings.push(`Recharge rapide supérieure à 30 min (${dcTime} min pour 10-80%)`);
        }
      }
    }

    // --- CRITÈRE 8 : QUALITÉ LOGICIEL ---
    const softwareRating = getSoftwareRating(vehicle.brand, vehicle.model);
    if (answers.softwareImportance === "good_software") {
      if (softwareRating >= 4) {
        score += 15;
        reasons.push(`Logiciel et planificateur très fluides et ergonomiques (${vehicle.brand})`);
      } else if (softwareRating <= 2) {
        score -= 25;
        warnings.push(`Ergonomie numérique et planificateur d'itinéraire jugés médiocres/lents`);
      }
    } else {
      if (softwareRating <= 2) {
        warnings.push(`Interface logicielle et planificateur d'itinéraire en retrait`);
      }
    }

    // --- COMPORTEMENT RÉEL STELLANTIS (Recharge) ---
    if (STELLANTIS_BRANDS.has(vehicle.brand)) {
      if (answers.chargingSpeed === "under_30") {
        score -= 10;
        warnings.push("Recharge rapide réelle sensible aux températures (Stellantis)");
      }
    }

    // Normalisation du score final entre 0 et 100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestConfigMatch = config;
      finalReasons = reasons;
      finalWarnings = warnings;
    }
  }

  if (bestConfigMatch === null || highestScore < 10) {
    return null; // Aucun match décent
  }

  // Filtrer les raisons / warnings redondants ou vides
  const uniqReasons = [...new Set(finalReasons)].slice(0, 4);
  const uniqWarnings = [...new Set(finalWarnings)].slice(0, 3);

  return {
    vehicle,
    bestConfig: bestConfigMatch,
    score: highestScore,
    reasons: uniqReasons,
    warnings: uniqWarnings,
  };
}
