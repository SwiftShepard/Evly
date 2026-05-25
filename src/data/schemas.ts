import { z } from "zod";

/**
 * Schéma véhicule électrique, exhaustif, configurable.
 * Ce schéma est la source de vérité de toute fiche : si une fiche
 * ne le valide pas, le build casse, garantissant la cohérence
 * éditoriale et l'absence de fiches squelettiques.
 *
 * Chaque véhicule expose un tableau `configurations` qui modélise
 * les combinaisons (batterie × finition × jantes × pneus) documentées
 * avec leurs données spécifiques. Le comparateur configurable s'appuie
 * sur ce tableau pour permettre la comparaison multi-véhicules.
 */

const ConfidenceSchema = z.enum([
  "manufacturer",
  "tested",
  "estimated",
  "pending",
  "bjorn_nyland", // données issues des tests officiels de Bjørn Nyland (120 km/h)
]);

const RealRangeSchema = z.object({
  mixed_km: z.number().int().positive(),
  highway_130_km: z.number().int().nonnegative(),
  highway_120_km: z.number().int().nonnegative().optional(), // valeur testée par Bjørn Nyland
  urban_km: z.number().int().positive(),
  winter_minus5_km: z.number().int().positive(),
  confidence: ConfidenceSchema.default("tested"),
});

const ChargingDcSchema = z.object({
  peakPower_kW: z.number().int().nonnegative(),
  time_10_80_min: z.number().int().nonnegative(),
  kWh_added_30min: z.number().int().nonnegative(),
  confidence: ConfidenceSchema.default("manufacturer"),
});

const ChargingAcSchema = z.object({
  onboardCharger_kW: z.number().positive(),
  phases: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  time_0_100_h: z.number().positive(),
});

const ChargingCurvePointSchema = z.object({
  soc: z.number().int().min(0).max(100),
  power: z.number().nonnegative(),
});

const TrimSchema = z.object({
  name: z.string().min(1),
  price_EUR: z.number().int().positive(),
  batteryUsed: z.string().min(1).refine(
    (val) => !/(?:standard|long\s*range)/i.test(val),
    { message: "batteryUsed ne doit pas contenir 'Standard' ou 'Long Range', juste la capacité (ex: '60 kWh')" }
  ),
  equipmentHighlights: z.array(z.string().min(1)).min(1),
});

const AidSchema = z.object({
  label: z.string().min(1),
  amount_EUR: z.number().int().nonnegative(),
  conditions: z.string().optional(),
});

const KeyFeatureCategory = z.enum([
  "securite",
  "confort",
  "technologie",
  "design",
]);

const KeyFeatureSchema = z.object({
  category: KeyFeatureCategory,
  label: z.string().min(1),
});

const VerdictSchema = z.object({
  strengths: z.array(z.string().min(1)).min(2),
  weaknesses: z.array(z.string().min(1)).min(2),
  idealUserProfile: z.string().min(20),
  notIdealFor: z.string().min(20),
});

/* ---------------------------------------------------------------- */
/* Tests terrain, autonomie/conso attribuée à une source unique     */
/* ---------------------------------------------------------------- */

const ProtocolSchema = z.enum([
  "nyland",
  "wltp",
  "epa",
  "manufacturer",
  "tested-other",
]);

const RangeTestSchema = z.object({
  sourceId: z.string().min(1),
  testDate: z.string().nullable(), // ISO date partielle acceptée (YYYY ou YYYY-MM)
  speed_kmh: z.number().positive().nullable(),
  range_km: z.number().positive().nullable(),
  consumption_kWh_100km: z.number().positive(),
  temperature_C: z.number().nullable(),
  wheelSize_inches: z.number().positive().nullable(),
  tyreModel: z.string().nullable(),
  protocol: ProtocolSchema,
  videoUrl: z.string().url().nullable(),
  notes: z.string().nullable(),
});

const ThousandKmChallengeSchema = z.object({
  sourceId: z.string().min(1),
  totalTime_minutes: z.number().positive().nullable(),
  averageSpeed_kmh: z.number().positive().nullable(),
  averageConsumption_Wh_km: z.number().positive().nullable(),
  chargingStops: z.number().int().nonnegative().nullable(),
  averageTemperature_C: z.number().nullable(),
  testDate: z.string().nullable(),
  videoUrl: z.string().url().nullable(),
  confidence: ConfidenceSchema.default("pending"),
});

/* ---------------------------------------------------------------- */
/* Configuration véhicule, combinaison documentée (comparateur)     */
/* ---------------------------------------------------------------- */

const VehicleConfigurationSchema = z.object({
  id: z.string().min(1),       // ex: "lr-gt-line-19"
  label: z.string().min(1),    // ex: "Long Range · GT-Line · 19\""

  // Paramètres définissant la configuration
  battery: z.enum(["standard", "long-range"]),
  trim: z.string().min(1),     // "Air", "Earth", "GT-Line"
  wheelSize_inches: z.number().int().positive(),
  tyreType: z.enum(["summer", "all-season", "winter"]).default("summer"),
  options: z.array(z.string()).default([]),

  // Données qui dépendent de la configuration
  usableCapacity_kWh: z.number().positive().optional(),
  price_EUR: z.number().int().positive().nullable(), // null = prix non encore communiqué
  monthlyLease_EUR: z.number().int().nonnegative().nullable(),
  leasingSocialEligible: z.boolean(),

  // Autonomie pour cette configuration spécifique
  wltp_km: z.number().int().positive().nullable(),
  wltp_consumption_kWh_100km: z.number().positive().nullable(),

  // Autonomie réelle mesurée pour cette config
  realRange: RealRangeSchema.nullable(),

  // Tests terrain pour cette configuration spécifique
  rangeTests: z.array(RangeTestSchema).default([]),

  // Recharge pour cette configuration
  chargingDC_peak_kW: z.number().int().nonnegative().nullable(),
  chargingDC_10_80_min: z.number().int().nonnegative().nullable(),
  chargingDC_kWh_30min: z.number().int().nonnegative().nullable(),
  chargingCurve: z.array(ChargingCurvePointSchema).nullable(),

  // Métadonnées
  availability: z.enum(["available", "discontinued", "upcoming"]).default("available"),
  notes: z.string().nullable(),
});

/* ---------------------------------------------------------------- */

export const VehicleSchema = z.object({
  // Identité
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug doit être en kebab-case"),
  brand: z.string().min(1),
  model: z.string().min(1),
  variant: z.string().min(1), // descripteur marketing court, ex: "EV4"
  bodyType: z.string().min(1),
  segment: z.string().min(1),
  productionCountry: z.string().min(1),
  assemblyPlant: z.string().min(1),
  releaseYear: z.number().int().min(2010).max(2030),
  marketAvailability: z.string().min(1),

  // Motorisation (invariant across configs)
  power_kW: z.number().int().positive(),
  power_hp: z.number().int().positive(),
  torque_Nm: z.number().int().positive(),
  drivetrain: z.enum(["FWD", "RWD", "AWD"]),
  motors: z.number().int().min(1).max(4),
  acceleration_0_100_s: z.number().positive(),
  topSpeed_kmh: z.number().int().positive(),

  // Batterie (données de la config par défaut / la plus courante)
  usableCapacity_kWh: z.number().positive(),
  grossCapacity_kWh: z.number().positive().nullable(),
  chemistry: z.enum(["NMC", "LFP", "NCM"]),
  architecture_V: z.union([z.literal(400), z.literal(800)]),
  mass_kg: z.number().positive().nullable(),

  // Autonomie (de la config par défaut, pour fiches existantes)
  wltp_max_km: z.number().int().positive(),
  wltp_min_km: z.number().int().positive(),
  realRange: RealRangeSchema,

  // Consommation (de la config par défaut)
  consumption_mixed_kWh_per_100km: z.number().positive(),
  consumption_highway_kWh_per_100km: z.number().positive(),
  consumption_winter_kWh_per_100km: z.number().positive(),
  dragCoefficient_Cx: z.number().positive(),

  // Recharge (de la config par défaut)
  chargingDC: ChargingDcSchema,
  chargingAC: ChargingAcSchema,
  plugAndCharge: z.boolean(),
  v2l: z.boolean(),
  v2g: z.boolean(),
  v2l_option_EUR: z.number().int().nonnegative().nullable(),
  chargingCurve: z.array(ChargingCurvePointSchema).min(2),

  // Tests terrain agrégés (Nyland, EVKX, ArenaEV, presse FR…)
  rangeTests: z.array(RangeTestSchema).default([]),
  thousandKmChallenge: ThousandKmChallengeSchema.nullable(),

  // Dimensions
  length_mm: z.number().int().positive(),
  width_mm: z.number().int().positive(),
  height_mm: z.number().int().positive(),
  wheelbase_mm: z.number().int().positive(),
  trunkCapacity_L: z.number().int().nonnegative(),
  trunkCapacityFolded_L: z.number().int().nonnegative(),
  frunkCapacity_L: z.number().int().nonnegative().nullable(),

  // Prix & gamme
  trims: z.array(TrimSchema).min(1),
  leasingSocialEligible: z.boolean(),
  leasingSocial_EUR_per_month: z.number().int().nonnegative().nullable(),
  availableAids: z.array(AidSchema),

  // Configurations comparateur (optionnel pour rétrocompatibilité)
  configurations: z.array(VehicleConfigurationSchema).default([]),

  // Garantie
  warranty: z.object({
    vehicle_years: z.number().int().positive(),
    vehicle_km: z.number().int().positive(),
    battery_years: z.number().int().positive(),
    battery_km: z.number().int().positive(),
    battery_soh_minimum_percent: z.number().int().min(50).max(100),
  }),

  // Équipements clés
  keyFeatures: z.array(KeyFeatureSchema).min(4),

  // Verdict éditorial
  verdict: VerdictSchema,

  // Méta
  lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sources: z.array(z.string().min(1)).min(1),
  imageCredit: z.string().min(1),
  imageUrl: z.string().url().optional(), // URL CDN de la photo constructeur
}).superRefine((v, ctx) => {
  // chargingCurve must not exceed the declared DC peak (vehicles with no DC charging are exempt)
  if (v.chargingDC.peakPower_kW > 0) {
    for (const pt of v.chargingCurve) {
      if (pt.power > v.chargingDC.peakPower_kW * 1.05) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["chargingCurve"],
          message: `Point SoC ${pt.soc}% affiche ${pt.power} kW mais le pic DC déclaré est ${v.chargingDC.peakPower_kW} kW, incohérence de données.`,
        });
      }
    }
  }

  // J5: Cohérence wltp_min/max vs configurations
  if (v.wltp_min_km > v.wltp_max_km) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["wltp_min_km"],
      message: `wltp_min_km (${v.wltp_min_km} km) ne peut pas être supérieur à wltp_max_km (${v.wltp_max_km} km).`,
    });
  }

  if (v.configurations && v.configurations.length > 0) {
    const validWltps = v.configurations
      .map((c) => c.wltp_km)
      .filter((w): w is number => w !== null);

    if (validWltps.length > 0) {
      const minConfigWltp = Math.min(...validWltps);
      const maxConfigWltp = Math.max(...validWltps);

      if (v.wltp_min_km > minConfigWltp) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["wltp_min_km"],
          message: `wltp_min_km (${v.wltp_min_km} km) doit être inférieur ou égal au minimum des configurations (${minConfigWltp} km).`,
        });
      }

      if (v.wltp_max_km < maxConfigWltp) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["wltp_max_km"],
          message: `wltp_max_km (${v.wltp_max_km} km) doit être supérieur ou égal au maximum des configurations (${maxConfigWltp} km).`,
        });
      }
    }
  }
});

export type Vehicle = z.infer<typeof VehicleSchema>;
export type VehicleConfiguration = z.infer<typeof VehicleConfigurationSchema>;
export type Trim = z.infer<typeof TrimSchema>;
export type ChargingCurvePoint = z.infer<typeof ChargingCurvePointSchema>;
export type Aid = z.infer<typeof AidSchema>;
export type Verdict = z.infer<typeof VerdictSchema>;
export type RangeTest = z.infer<typeof RangeTestSchema>;
export type ThousandKmChallenge = z.infer<typeof ThousandKmChallengeSchema>;
export type Protocol = z.infer<typeof ProtocolSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type RealRange = z.infer<typeof RealRangeSchema>;
