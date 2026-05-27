import json
import os

def create_vehicle(v):
    path = os.path.join(r"C:\Users\Valentin\Desktop\Evly\src\data\vehicles", f"{v['slug']}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(v, f, indent=2, ensure_ascii=False)
    print(f"Created {path}")

# Default template function
def base_vehicle(slug, brand, model):
    return {
        "slug": slug,
        "brand": brand,
        "model": model,
        "variant": "Standard",
        "bodyType": "SUV",
        "segment": "C",
        "productionCountry": "Corée",
        "assemblyPlant": "Ulsan",
        "releaseYear": 2024,
        "marketAvailability": "Disponible",
        "power_kW": 150,
        "power_hp": 204,
        "torque_Nm": 300,
        "drivetrain": "FWD",
        "motors": 1,
        "acceleration_0_100_s": 7.5,
        "topSpeed_kmh": 160,
        "usableCapacity_kWh": 60,
        "grossCapacity_kWh": 64,
        "chemistry": "NMC",
        "architecture_V": 400,
        "mass_kg": 1700,
        "wltp_max_km": 450,
        "wltp_min_km": 400,
        "realRange": {
            "mixed_km": 400,
            "highway_130_km": 280,
            "urban_km": 480,
            "winter_minus5_km": 320,
            "confidence": "estimated"
        },
        "consumption_mixed_kWh_per_100km": 15.0,
        "consumption_highway_kWh_per_100km": 21.0,
        "consumption_winter_kWh_per_100km": 19.0,
        "dragCoefficient_Cx": 0.28,
        "chargingDC": {
            "peakPower_kW": 130,
            "time_10_80_min": 30,
            "kWh_added_30min": 45,
            "confidence": "estimated"
        },
        "chargingAC": {
            "onboardCharger_kW": 11,
            "phases": 3,
            "time_0_100_h": 6.5
        },
        "plugAndCharge": False,
        "v2l": False,
        "v2g": False,
        "v2l_option_EUR": None,
        "chargingCurve": [
            { "soc": 0, "power": 100 },
            { "soc": 10, "power": 130 },
            { "soc": 50, "power": 100 },
            { "soc": 80, "power": 50 },
            { "soc": 100, "power": 10 }
        ],
        "rangeTests": [],
        "thousandKmChallenge": None,
        "length_mm": 4200,
        "width_mm": 1800,
        "height_mm": 1500,
        "wheelbase_mm": 2700,
        "trunkCapacity_L": 400,
        "trunkCapacityFolded_L": 1200,
        "frunkCapacity_L": None,
        "trims": [],
        "leasingSocialEligible": False,
        "leasingSocial_EUR_per_month": None,
        "availableAids": [{"label": "Prime CEE", "amount_EUR": 3500}, {"label": "Majoration Batterie Européenne", "amount_EUR": 1200}],
        "configurations": [],
        "warranty": {
            "vehicle_years": 5,
            "vehicle_km": 100000,
            "battery_years": 8,
            "battery_km": 160000,
            "battery_soh_minimum_percent": 70
        },
        "keyFeatures": [
            { "category": "confort", "label": "Sièges confort de haute qualité" },
            { "category": "technologie", "label": "Système d'infodivertissement avancé" },
            { "category": "securite", "label": "Freinage automatique d'urgence" },
            { "category": "design", "label": "Signature lumineuse LED distinctive" }
        ],
        "verdict": {
            "strengths": ["Bon compromis prix/autonomie", "Confort de suspension"],
            "weaknesses": ["Vitesse de charge rapide en retrait", "Info-divertissement perfectible"],
            "idealUserProfile": "Famille cherchant un véhicule principal polyvalent et confortable au quotidien.",
            "notIdealFor": "Gros rouleurs autoroutiers nécessitant des temps de charge ultra-rapides."
        },
        "lastUpdated": "2026-05-16",
        "sources": ["nyland", "la-chaine-ev"],
        "imageCredit": "Constructeur"
    }

def add_default_config(v):
    if len(v["configurations"]) == 0 and len(v["trims"]) > 0:
        v["configurations"] = []
        for trim in v["trims"]:
            trim_name = trim['name'].lower().replace(' ', '-').replace('"', '').replace('ë', 'e')
            config_id = f"{v['slug']}-{trim_name}"
            
            # Déduit le type de batterie (Zod enum)
            battery_raw = str(trim.get("batteryUsed", v.get("variant", "standard"))).lower()
            battery_enum = "long-range" if "long" in battery_raw else "standard"

            v["configurations"].append({
                "id": config_id,
                "label": f"{v['model']} {trim['name']}",
                "battery": battery_enum,
                "trim": trim["name"],
                "wheelSize_inches": 18,
                "tyreType": "summer",
                "options": [],
                "price_EUR": trim["price_EUR"],
                "monthlyLease_EUR": v.get("leasingSocial_EUR_per_month"),
                "leasingSocialEligible": v.get("leasingSocialEligible", False),
                "wltp_km": v.get("wltp_max_km", 0),
                "wltp_consumption_kWh_100km": v.get("consumption_mixed_kWh_per_100km", 15.0),
                "realRange": v.get("realRange", {}),
                "rangeTests": v.get("rangeTests", []),
                "chargingDC_peak_kW": v.get("chargingDC", {}).get("peakPower_kW", 0),
                "chargingDC_10_80_min": v.get("chargingDC", {}).get("time_10_80_min", 0),
                "chargingDC_kWh_30min": v.get("chargingDC", {}).get("kWh_added_30min", 0),
                "chargingCurve": v.get("chargingCurve", []),
                "availability": v.get("availability", "available"),
                "notes": None
            })
    return v

# 1. Renault 5 E-Tech
r5 = base_vehicle("renault-5", "Renault", "5 E-Tech")
r5.update({
    "variant": "52 kWh", "bodyType": "Hatchback 5 portes", "segment": "B",
    "productionCountry": "France", "assemblyPlant": "Douai",
    "power_kW": 110, "power_hp": 150, "torque_Nm": 245,
    "acceleration_0_100_s": 8.0, "topSpeed_kmh": 150,
    "usableCapacity_kWh": 52, "grossCapacity_kWh": 55, "mass_kg": 1450,
    "wltp_max_km": 410, "wltp_min_km": 400,
    "realRange": {"mixed_km": 360, "highway_130_km": 240, "urban_km": 450, "winter_minus5_km": 280, "confidence": "estimated"},
    "consumption_mixed_kWh_per_100km": 15.5, "consumption_highway_kWh_per_100km": 21.5, "consumption_winter_kWh_per_100km": 18.5,
    "dragCoefficient_Cx": 0.29,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 30, "kWh_added_30min": 35, "confidence": "tested"},
    "v2l": True, "v2g": True,
    "length_mm": 3920, "width_mm": 1770, "height_mm": 1500, "wheelbase_mm": 2540,
    "trunkCapacity_L": 326, "trunkCapacityFolded_L": 1106,
    "trims": [
        {"name": "Techno", "price_EUR": 33490, "batteryUsed": "52 kWh", "equipmentHighlights": ["Ecran 10 pouces", "V2L"]},
        {"name": "Iconic Cinq", "price_EUR": 35490, "batteryUsed": "52 kWh", "equipmentHighlights": ["Sièges chauffants", "Conduite semi-autonome"]}
    ],
    "rangeTests": [
        {"sourceId": "la-chaine-ev", "testDate": "2024-05", "speed_kmh": 120, "range_km": 240, "consumption_kWh_100km": 21.0, "temperature_C": 15, "wheelSize_inches": 18, "tyreModel": None, "protocol": "tested-other", "videoUrl": None, "notes": "Test autoroutier."}
    ],
    "leasingSocialEligible": True, "leasingSocial_EUR_per_month": 119
})

# 2. Renault Megane E-Tech
rm = base_vehicle("renault-megane", "Renault", "Megane E-Tech")
rm.update({
    "variant": "EV60", "bodyType": "Hatchback 5 portes", "segment": "C",
    "productionCountry": "France", "assemblyPlant": "Douai",
    "power_kW": 160, "power_hp": 220, "torque_Nm": 300,
    "acceleration_0_100_s": 7.4, "topSpeed_kmh": 160,
    "usableCapacity_kWh": 60, "grossCapacity_kWh": 65, "mass_kg": 1636,
    "wltp_max_km": 470, "wltp_min_km": 450,
    "realRange": {"mixed_km": 390, "highway_130_km": 250, "highway_120_km": 274, "urban_km": 480, "winter_minus5_km": 310, "confidence": "bjorn_nyland"},
    "consumption_mixed_kWh_per_100km": 15.5, "consumption_highway_kWh_per_100km": 22.0, "consumption_winter_kWh_per_100km": 19.5,
    "dragCoefficient_Cx": 0.29,
    "chargingDC": {"peakPower_kW": 130, "time_10_80_min": 30, "kWh_added_30min": 45, "confidence": "tested"},
    "chargingAC": {"onboardCharger_kW": 22, "phases": 3, "time_0_100_h": 3.1},
    "length_mm": 4199, "width_mm": 1768, "height_mm": 1505, "wheelbase_mm": 2685,
    "trunkCapacity_L": 440, "trunkCapacityFolded_L": 1332,
    "trims": [
        {"name": "Equilibre", "price_EUR": 38000, "batteryUsed": "60 kWh", "equipmentHighlights": ["Jantes 18\"", "Ecran 9\""]},
        {"name": "Techno", "price_EUR": 40000, "batteryUsed": "60 kWh", "equipmentHighlights": ["Jantes 20\"", "Ecran 12\""]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2022-08", "speed_kmh": 90, "range_km": 405, "consumption_kWh_100km": 14.8, "temperature_C": 21, "wheelSize_inches": 20, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "Test Nyland estival"},
        {"sourceId": "nyland", "testDate": "2022-08", "speed_kmh": 120, "range_km": 280, "consumption_kWh_100km": 21.4, "temperature_C": 21, "wheelSize_inches": 20, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "Test Nyland 120km/h"}
    ]
})

# 3. Kia EV3
ev3 = base_vehicle("kia-ev3", "Kia", "EV3")
ev3.update({
    "variant": "Long Range", "bodyType": "SUV compact", "segment": "C",
    "productionCountry": "Corée", "power_kW": 150, "power_hp": 204, "torque_Nm": 283,
    "acceleration_0_100_s": 7.7, "topSpeed_kmh": 170,
    "usableCapacity_kWh": 81.4, "grossCapacity_kWh": 84.6, "mass_kg": 1850,
    "wltp_max_km": 605, "wltp_min_km": 560,
    "realRange": {"mixed_km": 500, "highway_130_km": 360, "urban_km": 600, "winter_minus5_km": 400, "confidence": "tested"},
    "consumption_mixed_kWh_per_100km": 15.0, "consumption_highway_kWh_per_100km": 22.5, "consumption_winter_kWh_per_100km": 19.5,
    "dragCoefficient_Cx": 0.26,
    "chargingDC": {"peakPower_kW": 128, "time_10_80_min": 31, "kWh_added_30min": 57, "confidence": "tested"},
    "length_mm": 4300, "width_mm": 1850, "height_mm": 1560, "wheelbase_mm": 2680,
    "trunkCapacity_L": 460, "trunkCapacityFolded_L": 1250, "frunkCapacity_L": 25,
    "trims": [
        {"name": "Standard Range Air", "price_EUR": 35990, "batteryUsed": "Standard 58.3 kWh", "wltp_km": 436, "equipmentHighlights": ["Ecran panoramique", "Jantes 17\""]},
        {"name": "Long Range Air", "price_EUR": 39990, "batteryUsed": "Long Range 81.4 kWh", "wltp_km": 605, "equipmentHighlights": ["Batterie 81.4 kWh", "Jantes 17\""]},
        {"name": "Long Range Earth", "price_EUR": 40990, "batteryUsed": "Long Range 81.4 kWh", "wltp_km": 605, "equipmentHighlights": ["Confort ++", "Double écran 12.3\""]},
        {"name": "Long Range GT-Line", "price_EUR": 45990, "batteryUsed": "Long Range 81.4 kWh", "wltp_km": 580, "equipmentHighlights": ["Jantes 19\"", "Pompe à chaleur"]}
    ],
    "warranty": {"vehicle_years": 7, "vehicle_km": 150000, "battery_years": 7, "battery_km": 150000, "battery_soh_minimum_percent": 70},
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2024-09", "speed_kmh": 90, "range_km": 599, "consumption_kWh_100km": 13.5, "temperature_C": 20, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "Très efficient"},
        {"sourceId": "nyland", "testDate": "2024-09", "speed_kmh": 120, "range_km": 412, "consumption_kWh_100km": 19.5, "temperature_C": 20, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ],
    "thousandKmChallenge": {
        "sourceId": "nyland", "totalTime_minutes": 635, "averageSpeed_kmh": 94.5, "averageConsumption_Wh_km": 209, "chargingStops": 5, "averageTemperature_C": 15, "testDate": "2024-09", "videoUrl": None, "confidence": "tested"
    }
})

# 4. VW ID.3
id3 = base_vehicle("vw-id3", "Volkswagen", "ID.3")
id3.update({
    "variant": "Pro", "bodyType": "Hatchback 5 portes", "segment": "C",
    "productionCountry": "Allemagne", "assemblyPlant": "Zwickau",
    "drivetrain": "RWD", "power_kW": 150, "power_hp": 204, "torque_Nm": 310,
    "acceleration_0_100_s": 7.3, "topSpeed_kmh": 160,
    "usableCapacity_kWh": 58, "grossCapacity_kWh": 62, "mass_kg": 1812,
    "wltp_max_km": 434, "wltp_min_km": 420,
    "realRange": {"mixed_km": 360, "highway_130_km": 240, "highway_120_km": 261, "urban_km": 440, "winter_minus5_km": 280, "confidence": "bjorn_nyland"},
    "consumption_mixed_kWh_per_100km": 15.5, "consumption_highway_kWh_per_100km": 22.0, "consumption_winter_kWh_per_100km": 19.5,
    "dragCoefficient_Cx": 0.27,
    "chargingDC": {"peakPower_kW": 120, "time_10_80_min": 35, "kWh_added_30min": 35, "confidence": "tested"},
    "length_mm": 4261, "width_mm": 1809, "height_mm": 1562, "wheelbase_mm": 2770,
    "trunkCapacity_L": 385, "trunkCapacityFolded_L": 1267,
    "trims": [
        {"name": "Pro", "price_EUR": 39990, "batteryUsed": "58 kWh", "equipmentHighlights": ["Ecran 12\"", "Apple CarPlay sans fil"]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2021-08", "speed_kmh": 90, "range_km": 414, "consumption_kWh_100km": 13.9, "temperature_C": 18, "wheelSize_inches": 18, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""},
        {"sourceId": "nyland", "testDate": "2021-08", "speed_kmh": 120, "range_km": 274, "consumption_kWh_100km": 21.0, "temperature_C": 18, "wheelSize_inches": 18, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ],
    "thousandKmChallenge": {
        "sourceId": "nyland", "totalTime_minutes": 615, "averageSpeed_kmh": 97.6, "averageConsumption_Wh_km": 218, "chargingStops": 5, "averageTemperature_C": 15, "testDate": "2021-08", "videoUrl": None, "confidence": "tested"
    }
})

# 5. VW ID.4
id4 = base_vehicle("vw-id4", "Volkswagen", "ID.4")
id4.update({
    "variant": "Pro", "bodyType": "SUV familial", "segment": "D",
    "productionCountry": "Allemagne", "assemblyPlant": "Zwickau",
    "drivetrain": "RWD", "power_kW": 210, "power_hp": 286, "torque_Nm": 545,
    "acceleration_0_100_s": 6.7, "topSpeed_kmh": 180,
    "usableCapacity_kWh": 77, "grossCapacity_kWh": 82, "mass_kg": 2120,
    "wltp_max_km": 550, "wltp_min_km": 520,
    "realRange": {"mixed_km": 450, "highway_130_km": 315, "highway_120_km": 346, "urban_km": 530, "winter_minus5_km": 360, "confidence": "bjorn_nyland"},
    "consumption_mixed_kWh_per_100km": 16.0, "consumption_highway_kWh_per_100km": 23.5, "consumption_winter_kWh_per_100km": 21.0,
    "dragCoefficient_Cx": 0.28,
    "chargingDC": {"peakPower_kW": 175, "time_10_80_min": 28, "kWh_added_30min": 55, "confidence": "tested"},
    "length_mm": 4584, "width_mm": 1852, "height_mm": 1640, "wheelbase_mm": 2771,
    "trunkCapacity_L": 543, "trunkCapacityFolded_L": 1575,
    "trims": [
        {"name": "Pro", "price_EUR": 45000, "batteryUsed": "77 kWh", "equipmentHighlights": ["Moteur AP550", "Ecran 12.9\""]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2023-08", "speed_kmh": 90, "range_km": 498, "consumption_kWh_100km": 15.4, "temperature_C": 18, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""},
        {"sourceId": "nyland", "testDate": "2023-08", "speed_kmh": 120, "range_km": 334, "consumption_kWh_100km": 22.9, "temperature_C": 18, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ]
})

# 6. Hyundai Ioniq 5
ioniq5 = base_vehicle("hyundai-ioniq-5", "Hyundai", "Ioniq 5")
ioniq5.update({
    "variant": "84 kWh", "bodyType": "Crossover familial", "segment": "D",
    "productionCountry": "Corée", "assemblyPlant": "Ulsan",
    "drivetrain": "RWD", "power_kW": 168, "power_hp": 228, "torque_Nm": 350,
    "acceleration_0_100_s": 7.3, "topSpeed_kmh": 185,
    "usableCapacity_kWh": 84, "grossCapacity_kWh": 88, "mass_kg": 2000,
    "wltp_max_km": 570, "wltp_min_km": 530,
    "architecture_V": 800,
    "realRange": {"mixed_km": 410, "highway_130_km": 265, "highway_120_km": 289, "urban_km": 490, "winter_minus5_km": 340, "confidence": "bjorn_nyland"},
    "consumption_mixed_kWh_per_100km": 16.5, "consumption_highway_kWh_per_100km": 24.5, "consumption_winter_kWh_per_100km": 22.0,
    "dragCoefficient_Cx": 0.288,
    "chargingDC": {"peakPower_kW": 240, "time_10_80_min": 18, "kWh_added_30min": 70, "confidence": "tested"},
    "length_mm": 4655, "width_mm": 1890, "height_mm": 1605, "wheelbase_mm": 3000,
    "trunkCapacity_L": 527, "trunkCapacityFolded_L": 1587, "frunkCapacity_L": 57,
    "trims": [
        {"name": "Intuitive", "price_EUR": 47500, "batteryUsed": "84 kWh", "equipmentHighlights": ["Charge 800V", "Ecran 12.3\""]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2021-06", "speed_kmh": 90, "range_km": 488, "consumption_kWh_100km": 15.1, "temperature_C": 18, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "Test sur version 72.6 kWh, ajusté à 84 kWh estimé."},
        {"sourceId": "nyland", "testDate": "2021-06", "speed_kmh": 120, "range_km": 310, "consumption_kWh_100km": 22.8, "temperature_C": 18, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ],
    "thousandKmChallenge": {
        "sourceId": "nyland", "totalTime_minutes": 580, "averageSpeed_kmh": 103.4, "averageConsumption_Wh_km": 240, "chargingStops": 4, "averageTemperature_C": 18, "testDate": "2021-06", "videoUrl": None, "confidence": "tested"
    }
})

# 7. Hyundai Kona Electric
kona = base_vehicle("hyundai-kona", "Hyundai", "Kona Electric")
kona.update({
    "variant": "65 kWh", "bodyType": "SUV compact", "segment": "B",
    "productionCountry": "Rép. Tchèque", "assemblyPlant": "Nošovice",
    "power_kW": 160, "power_hp": 217, "torque_Nm": 255,
    "acceleration_0_100_s": 7.8, "topSpeed_kmh": 172,
    "usableCapacity_kWh": 65.4, "grossCapacity_kWh": 68.5, "mass_kg": 1773,
    "wltp_max_km": 514, "wltp_min_km": 454,
    "realRange": {"mixed_km": 440, "highway_130_km": 315, "highway_120_km": 345, "urban_km": 530, "winter_minus5_km": 350, "confidence": "bjorn_nyland"},
    "consumption_mixed_kWh_per_100km": 14.8, "consumption_highway_kWh_per_100km": 21.0, "consumption_winter_kWh_per_100km": 18.5,
    "dragCoefficient_Cx": 0.27,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 41, "kWh_added_30min": 32, "confidence": "tested"},
    "length_mm": 4355, "width_mm": 1825, "height_mm": 1575, "wheelbase_mm": 2660,
    "trunkCapacity_L": 466, "trunkCapacityFolded_L": 1300, "frunkCapacity_L": 27,
    "trims": [
        {"name": "Intuitive", "price_EUR": 40850, "batteryUsed": "65.4 kWh", "equipmentHighlights": ["Navigation", "Jantes 17\""]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2023-09", "speed_kmh": 90, "range_km": 482, "consumption_kWh_100km": 13.5, "temperature_C": 14, "wheelSize_inches": 17, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""},
        {"sourceId": "nyland", "testDate": "2023-09", "speed_kmh": 120, "range_km": 312, "consumption_kWh_100km": 20.8, "temperature_C": 14, "wheelSize_inches": 17, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ],
    "thousandKmChallenge": {
        "sourceId": "nyland", "totalTime_minutes": 660, "averageSpeed_kmh": 90.9, "averageConsumption_Wh_km": 215, "chargingStops": 5, "averageTemperature_C": 14, "testDate": "2023-09", "videoUrl": None, "confidence": "tested"
    }
})

# For missing ones we use realistic estimates (R4, EV2)
r4 = base_vehicle("renault-4", "Renault", "4 E-Tech")
r4.update({
    "variant": "52 kWh", "bodyType": "SUV compact", "segment": "B",
    "productionCountry": "France", "power_kW": 110, "usableCapacity_kWh": 52,
    "wltp_max_km": 400, "wltp_min_km": 380,
    "realRange": {"mixed_km": 350, "highway_130_km": 230, "urban_km": 440, "winter_minus5_km": 270, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.32,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 30, "kWh_added_30min": 35, "confidence": "estimated"},
    "length_mm": 4140, "width_mm": 1800, "height_mm": 1570, "trunkCapacity_L": 420,
    "trims": [{"name": "Equilibre", "price_EUR": 35000, "batteryUsed": "52 kWh", "equipmentHighlights": ["Barres de toit"]}]
})

ev2 = base_vehicle("kia-ev2", "Kia", "EV2")
ev2.update({
    "variant": "42 kWh", "bodyType": "Crossover", "segment": "B",
    "productionCountry": "Slovaquie", "power_kW": 100, "usableCapacity_kWh": 42,
    "wltp_max_km": 350, "wltp_min_km": 300,
    "realRange": {"mixed_km": 290, "highway_130_km": 180, "urban_km": 360, "winter_minus5_km": 220, "confidence": "estimated"},
    "chargingDC": {"peakPower_kW": 80, "time_10_80_min": 35, "kWh_added_30min": 25, "confidence": "estimated"},
    "length_mm": 4000, "width_mm": 1750, "height_mm": 1550, "trunkCapacity_L": 350,
    "trims": [{"name": "Active", "price_EUR": 28000, "batteryUsed": "42 kWh", "equipmentHighlights": ["Ecran tactile"]}]
})

# 10. Hyundai Inster
inster = base_vehicle("hyundai-inster", "Hyundai", "Inster")
inster.update({
    "variant": "49 kWh", "bodyType": "Crossover urbain", "segment": "A",
    "productionCountry": "Corée", "power_kW": 84, "power_hp": 115, "torque_Nm": 147,
    "usableCapacity_kWh": 49, "grossCapacity_kWh": 51,
    "wltp_max_km": 355, "wltp_min_km": 300,
    "realRange": {"mixed_km": 280, "highway_130_km": 190, "urban_km": 350, "winter_minus5_km": 230, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.32,
    "chargingDC": {"peakPower_kW": 85, "time_10_80_min": 30, "kWh_added_30min": 30, "confidence": "estimated"},
    "length_mm": 3825, "width_mm": 1610, "height_mm": 1575, "trunkCapacity_L": 280,
    "trims": [{"name": "Intuitive", "price_EUR": 25000, "batteryUsed": "49 kWh", "equipmentHighlights": ["V2L", "Sièges rabattables"]}]
})

# 11. Hyundai Ioniq 3 (Theoretical)
ioniq3 = base_vehicle("hyundai-ioniq-3", "Hyundai", "Ioniq 3")
ioniq3.update({
    "variant": "58 kWh", "bodyType": "Compacte", "segment": "C",
    "power_kW": 150, "usableCapacity_kWh": 58,
    "wltp_max_km": 450, "wltp_min_km": 400,
    "realRange": {"mixed_km": 380, "highway_130_km": 250, "urban_km": 450, "winter_minus5_km": 300, "confidence": "estimated"},
    "chargingDC": {"peakPower_kW": 130, "time_10_80_min": 30, "kWh_added_30min": 40, "confidence": "estimated"},
    "length_mm": 4350, "width_mm": 1850, "height_mm": 1580, "trunkCapacity_L": 400,
    "trims": [{"name": "Intuitive", "price_EUR": 38000, "batteryUsed": "58 kWh", "equipmentHighlights": ["Ecran 12\""]}]
})

# 12. Hyundai Ioniq 6
ioniq6 = base_vehicle("hyundai-ioniq-6", "Hyundai", "Ioniq 6")
ioniq6.update({
    "variant": "77 kWh", "bodyType": "Berline aérodynamique", "segment": "D",
    "drivetrain": "RWD", "power_kW": 168, "power_hp": 228, "torque_Nm": 350,
    "acceleration_0_100_s": 7.4, "topSpeed_kmh": 185,
    "usableCapacity_kWh": 77.4, "grossCapacity_kWh": 80,
    "wltp_max_km": 614, "wltp_min_km": 545,
    "architecture_V": 800,
    "realRange": {"mixed_km": 500, "highway_130_km": 365, "highway_120_km": 381, "urban_km": 580, "winter_minus5_km": 400, "confidence": "bjorn_nyland"},
    "consumption_mixed_kWh_per_100km": 14.0, "consumption_highway_kWh_per_100km": 18.0, "consumption_winter_kWh_per_100km": 17.5,
    "dragCoefficient_Cx": 0.21,
    "chargingDC": {"peakPower_kW": 240, "time_10_80_min": 18, "kWh_added_30min": 65, "confidence": "tested"},
    "length_mm": 4855, "width_mm": 1880, "height_mm": 1495, "trunkCapacity_L": 401, "frunkCapacity_L": 45,
    "trims": [{"name": "Intuitive", "price_EUR": 52000, "batteryUsed": "77.4 kWh", "equipmentHighlights": ["800V", "Cx 0.21"]}],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2023-04", "speed_kmh": 90, "range_km": 595, "consumption_kWh_100km": 12.3, "temperature_C": 15, "wheelSize_inches": 18, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""},
        {"sourceId": "nyland", "testDate": "2023-04", "speed_kmh": 120, "range_km": 400, "consumption_kWh_100km": 18.0, "temperature_C": 15, "wheelSize_inches": 18, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ],
    "thousandKmChallenge": {
        "sourceId": "nyland", "totalTime_minutes": 555, "averageSpeed_kmh": 108.1, "averageConsumption_Wh_km": 196, "chargingStops": 3, "averageTemperature_C": 15, "testDate": "2023-04", "videoUrl": None, "confidence": "tested"
    }
})

# 13. Hyundai Ioniq 9
ioniq9 = base_vehicle("hyundai-ioniq-9", "Hyundai", "Ioniq 9")
ioniq9.update({
    "variant": "110 kWh", "bodyType": "SUV 7 places", "segment": "E",
    "drivetrain": "RWD", "power_kW": 160, "power_hp": 217,
    "usableCapacity_kWh": 110.3, "grossCapacity_kWh": 115,
    "wltp_max_km": 620, "wltp_min_km": 500,
    "architecture_V": 800,
    "realRange": {"mixed_km": 480, "highway_130_km": 335, "highway_120_km": 365, "urban_km": 570, "winter_minus5_km": 380, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.26,
    "chargingDC": {"peakPower_kW": 350, "time_10_80_min": 24, "kWh_added_30min": 85, "confidence": "estimated"},
    "length_mm": 5060, "width_mm": 1980, "height_mm": 1790, "trunkCapacity_L": 620,
    "trims": [{"name": "Executive", "price_EUR": 75000, "batteryUsed": "110.3 kWh", "equipmentHighlights": ["7 places", "110 kWh"]}]
})

# 14. Hyundai Staria (Theoretical EV)
staria = base_vehicle("hyundai-staria", "Hyundai", "Staria")
staria.update({
    "variant": "84 kWh", "bodyType": "Monospace", "segment": "D",
    "usableCapacity_kWh": 84, "grossCapacity_kWh": 88,
    "wltp_max_km": 400, "wltp_min_km": 350,
    "realRange": {"mixed_km": 320, "highway_130_km": 220, "urban_km": 400, "winter_minus5_km": 250, "confidence": "estimated"},
    "chargingDC": {"peakPower_kW": 240, "time_10_80_min": 18, "kWh_added_30min": 60, "confidence": "estimated"},
    "length_mm": 5253, "width_mm": 1997, "height_mm": 1990, "trunkCapacity_L": 831,
    "trims": [{"name": "Lounge", "price_EUR": 65000, "batteryUsed": "84 kWh", "equipmentHighlights": ["9 places", "Portes coulissantes"]}]
})

# 15. Kia EV4 Fastback
ev4_fastback = base_vehicle("kia-ev4-fastback", "Kia", "EV4 Fastback")
ev4_fastback.update({
    "variant": "81.4 kWh", "bodyType": "Berline Fastback", "segment": "C",
    "power_kW": 150, "usableCapacity_kWh": 81.4,
    "wltp_max_km": 650, "wltp_min_km": 580,
    "realRange": {"mixed_km": 520, "highway_130_km": 390, "urban_km": 600, "winter_minus5_km": 410, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.22,
    "chargingDC": {"peakPower_kW": 128, "time_10_80_min": 31, "kWh_added_30min": 57, "confidence": "estimated"},
    "length_mm": 4450, "width_mm": 1850, "height_mm": 1500, "trunkCapacity_L": 450,
    "trims": [{"name": "Earth", "price_EUR": 43000, "batteryUsed": "81.4 kWh", "equipmentHighlights": ["Aérodynamisme optimisé"]}]
})

# 16. Kia EV5
ev5 = base_vehicle("kia-ev5", "Kia", "EV5")
ev5.update({
    "variant": "88 kWh", "bodyType": "SUV familial", "segment": "C",
    "power_kW": 160, "usableCapacity_kWh": 88,
    "wltp_max_km": 530, "wltp_min_km": 480,
    "realRange": {"mixed_km": 450, "highway_130_km": 320, "urban_km": 530, "winter_minus5_km": 350, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.28,
    "chargingDC": {"peakPower_kW": 140, "time_10_80_min": 35, "kWh_added_30min": 50, "confidence": "estimated"},
    "length_mm": 4615, "width_mm": 1875, "height_mm": 1715, "trunkCapacity_L": 513,
    "trims": [{"name": "Earth", "price_EUR": 48000, "batteryUsed": "88 kWh", "equipmentHighlights": ["Agencement intérieur"]}]
})

# 17. Kia EV6
ev6 = base_vehicle("kia-ev6", "Kia", "EV6")
ev6.update({
    "variant": "84 kWh", "bodyType": "Crossover", "segment": "D",
    "drivetrain": "RWD", "power_kW": 168, "power_hp": 228,
    "usableCapacity_kWh": 84, "grossCapacity_kWh": 88,
    "architecture_V": 800,
    "wltp_max_km": 582, "wltp_min_km": 505,
    "realRange": {"mixed_km": 480, "highway_130_km": 250, "highway_120_km": 274, "urban_km": 560, "winter_minus5_km": 370, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.28,
    "chargingDC": {"peakPower_kW": 258, "time_10_80_min": 18, "kWh_added_30min": 75, "confidence": "tested"},
    "length_mm": 4695, "width_mm": 1890, "height_mm": 1550, "trunkCapacity_L": 490, "frunkCapacity_L": 52,
    "trims": [
        {"name": "Standard Air", "price_EUR": 47000, "batteryUsed": "Standard 63 kWh", "wltp_km": 428, "equipmentHighlights": ["Charge 800V"]},
        {"name": "Long Range Air", "price_EUR": 51000, "batteryUsed": "Long Range 84 kWh", "wltp_km": 582, "equipmentHighlights": ["Batterie 84 kWh"]},
        {"name": "Long Range Earth", "price_EUR": 53000, "batteryUsed": "Long Range 84 kWh", "wltp_km": 582, "equipmentHighlights": ["Confort ++", "V2L"]},
        {"name": "Long Range GT-Line", "price_EUR": 58000, "batteryUsed": "Long Range 84 kWh", "wltp_km": 546, "equipmentHighlights": ["Design sportif", "Jantes 20\""]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2024-06", "speed_kmh": 90, "range_km": 520, "consumption_kWh_100km": 14.8, "temperature_C": 20, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "EV6 Facelift 84 kWh"},
        {"sourceId": "nyland", "testDate": "2024-06", "speed_kmh": 120, "range_km": 350, "consumption_kWh_100km": 21.5, "temperature_C": 20, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ],
    "thousandKmChallenge": {
        "sourceId": "nyland", "totalTime_minutes": 550, "averageSpeed_kmh": 109.1, "averageConsumption_Wh_km": 205, "chargingStops": 4, "averageTemperature_C": 20, "testDate": "2024-06", "videoUrl": None, "confidence": "tested"
    }
})

# 18. Kia EV9
ev9 = base_vehicle("kia-ev9", "Kia", "EV9")
ev9.update({
    "variant": "99.8 kWh", "bodyType": "SUV 7 places", "segment": "E",
    "drivetrain": "RWD", "power_kW": 150, "usableCapacity_kWh": 99.8,
    "architecture_V": 800,
    "wltp_max_km": 563, "wltp_min_km": 505,
    "realRange": {"mixed_km": 480, "highway_130_km": 350, "urban_km": 550, "winter_minus5_km": 380, "confidence": "tested"},
    "dragCoefficient_Cx": 0.28,
    "chargingDC": {"peakPower_kW": 210, "time_10_80_min": 24, "kWh_added_30min": 70, "confidence": "tested"},
    "length_mm": 5010, "width_mm": 1980, "height_mm": 1755, "trunkCapacity_L": 333,
    "trims": [{"name": "Earth", "price_EUR": 73000, "batteryUsed": "99.8 kWh", "equipmentHighlights": ["7 places", "Sièges ventilés"]}]
})

# 19. Kia PV5 Passenger
pv5 = base_vehicle("kia-pv5-passenger", "Kia", "PV5 Passenger")
pv5.update({
    "variant": "81 kWh", "bodyType": "Monospace", "segment": "D",
    "power_kW": 150, "usableCapacity_kWh": 81.4,
    "wltp_max_km": 450, "wltp_min_km": 400,
    "realRange": {"mixed_km": 350, "highway_130_km": 250, "urban_km": 420, "winter_minus5_km": 280, "confidence": "estimated"},
    "chargingDC": {"peakPower_kW": 128, "time_10_80_min": 31, "kWh_added_30min": 50, "confidence": "estimated"},
    "length_mm": 4700, "width_mm": 1900, "height_mm": 1900, "trunkCapacity_L": 700,
})

# 19b. Kia PV5 Cargo
pv5_cargo = base_vehicle("kia-pv5-cargo", "Kia", "PV5 Cargo")
pv5_cargo.update({
    "variant": "81 kWh", "bodyType": "Fourgon", "segment": "D",
    "power_kW": 150, "usableCapacity_kWh": 81.4, "grossCapacity_kWh": 84,
    "wltp_max_km": 430, "wltp_min_km": 380,
    "realRange": {"mixed_km": 320, "highway_130_km": 220, "urban_km": 390, "winter_minus5_km": 250, "confidence": "estimated"},
    "chargingDC": {"peakPower_kW": 128, "time_10_80_min": 31, "kWh_added_30min": 50, "confidence": "estimated"},
    "length_mm": 4700, "width_mm": 1900, "height_mm": 1900, "trunkCapacity_L": 4000, "trunkCapacityFolded_L": 4000,
    "trims": [{"name": "Active Cargo", "price_EUR": 40000, "batteryUsed": "81.4 kWh", "equipmentHighlights": ["Volume utile 4m3", "Cloison de séparation tôlée", "Portes arrière battantes 180°"]}],
    "v2l": True,
    "configurations": [
        {
            "id": "kia-pv5-cargo-active",
            "label": "PV5 Cargo Active",
            "battery": "standard",
            "trim": "Active Cargo",
            "wheelSize_inches": 17,
            "tyreType": "summer",
            "options": [],
            "price_EUR": 40000,
            "monthlyLease_EUR": None,
            "leasingSocialEligible": False,
            "wltp_km": 430,
            "wltp_consumption_kWh_100km": 16.5,
            "realRange": {
                "mixed_km": 320,
                "highway_130_km": 220,
                "urban_km": 390,
                "winter_minus5_km": 250,
                "confidence": "estimated"
            },
            "rangeTests": [],
            "chargingDC_peak_kW": 128,
            "chargingDC_10_80_min": 31,
            "chargingDC_kWh_30min": 50,
            "chargingCurve": [
                {"soc": 0, "power": 100},
                {"soc": 10, "power": 128},
                {"soc": 50, "power": 100},
                {"soc": 80, "power": 50},
                {"soc": 100, "power": 10}
            ],
            "availability": "available",
            "notes": None
        }
    ],
    "keyFeatures": [
        {"category": "confort", "label": "Cabine bureau connectée et ergonomique"},
        {"category": "technologie", "label": "Technologie V2L pour alimenter des outils pros"},
        {"category": "securite", "label": "Aides à la conduite avancées de dernière génération"},
        {"category": "design", "label": "Format rectangulaire optimisé pour le volume utile"}
    ],
    "verdict": {
        "strengths": ["Volume utile généreux (4m3)", "Hauteur de chargement optimisée", "Connectivité V2L pour outils pros"],
        "weaknesses": ["Vitesse de charge sur autoroute", "Réseau de recharge pro à structurer"],
        "idealUserProfile": "Artisans, livreurs urbains et flottes d'entreprises cherchant un utilitaire moderne et connecté.",
        "notIdealFor": "Longues distances quotidiennes nécessitant de multiples charges rapides."
    },
    "sources": ["constructeur", "automobile-propre"]
})

# 20. Renault Twingo E-Tech
twingo = base_vehicle("renault-twingo", "Renault", "Twingo E-Tech")
twingo.update({
    "productionCountry": "Slovénie",
    "variant": "40 kWh", "bodyType": "Citadine", "segment": "A",
    "power_kW": 65, "usableCapacity_kWh": 40,
    "wltp_max_km": 300, "wltp_min_km": 250,
    "realRange": {"mixed_km": 220, "highway_130_km": 140, "urban_km": 280, "winter_minus5_km": 180, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.30,
    "chargingDC": {"peakPower_kW": 80, "time_10_80_min": 30, "kWh_added_30min": 25, "confidence": "estimated"},
    "length_mm": 3600, "width_mm": 1650, "height_mm": 1540, "trunkCapacity_L": 220,
    "trims": [{"name": "Equilibre", "price_EUR": 19990, "batteryUsed": "40 kWh", "equipmentHighlights": ["Design rétro", "Ecran 10\""]}]
})

# 21. Renault Scenic E-Tech
scenic = base_vehicle("renault-scenic", "Renault", "Scenic E-Tech")
scenic.update({
    "productionCountry": "France",
    "variant": "Long Range 87 kWh", "bodyType": "SUV familial", "segment": "C",
    "power_kW": 160, "usableCapacity_kWh": 87, "grossCapacity_kWh": 92,
    "wltp_max_km": 625, "wltp_min_km": 600,
    "realRange": {"mixed_km": 490, "highway_130_km": 355, "highway_120_km": 390, "urban_km": 580, "winter_minus5_km": 380, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.28,
    "chargingDC": {"peakPower_kW": 150, "time_10_80_min": 37, "kWh_added_30min": 55, "confidence": "tested"},
    "length_mm": 4470, "width_mm": 1860, "height_mm": 1570, "trunkCapacity_L": 545,
    "trims": [{"name": "Techno", "price_EUR": 46990, "batteryUsed": "87 kWh", "equipmentHighlights": ["Toit Solarbay", "OpenR Link"]}],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2023-09", "speed_kmh": 90, "range_km": 562, "consumption_kWh_100km": 15.5, "temperature_C": 18, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "Scénic E-Tech 87 kWh. Très bon à 90."},
        {"sourceId": "nyland", "testDate": "2023-09", "speed_kmh": 120, "range_km": 390, "consumption_kWh_100km": 22.3, "temperature_C": 18, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "Consommation plus élevée à haute vitesse."}
    ]
})

# 22. Renault Kangoo E-Tech
kangoo = base_vehicle("renault-kangoo", "Renault", "Kangoo E-Tech")
kangoo.update({
    "productionCountry": "France",
    "variant": "45 kWh", "bodyType": "Ludospace", "segment": "C",
    "power_kW": 90, "usableCapacity_kWh": 45, "grossCapacity_kWh": 48,
    "wltp_max_km": 285, "wltp_min_km": 265,
    "realRange": {"mixed_km": 210, "highway_130_km": 140, "urban_km": 260, "winter_minus5_km": 170, "confidence": "tested"},
    "dragCoefficient_Cx": 0.35,
    "chargingDC": {"peakPower_kW": 80, "time_10_80_min": 37, "kWh_added_30min": 27, "confidence": "tested"},
    "length_mm": 4486, "width_mm": 1919, "height_mm": 1838, "trunkCapacity_L": 850,
    "trims": [{"name": "Equilibre", "price_EUR": 37500, "batteryUsed": "45 kWh", "equipmentHighlights": ["Portes coulissantes", "Charge AC 22kW"]}]
})

# 23. Renault Grand Kangoo E-Tech
grand_kangoo = base_vehicle("renault-grand-kangoo", "Renault", "Grand Kangoo E-Tech")
grand_kangoo.update({
    "productionCountry": "France",
    "variant": "45 kWh", "bodyType": "Ludospace 7 places", "segment": "D",
    "power_kW": 90, "usableCapacity_kWh": 45, "grossCapacity_kWh": 48,
    "wltp_max_km": 265, "wltp_min_km": 250,
    "realRange": {"mixed_km": 200, "highway_130_km": 130, "urban_km": 250, "winter_minus5_km": 160, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.36,
    "chargingDC": {"peakPower_kW": 80, "time_10_80_min": 37, "kWh_added_30min": 27, "confidence": "estimated"},
    "length_mm": 4910, "width_mm": 1919, "height_mm": 1838, "trunkCapacity_L": 500,
    "trims": [{"name": "Techno", "price_EUR": 40500, "batteryUsed": "45 kWh", "equipmentHighlights": ["7 places", "Sièges amovibles"]}]
})

# 25. Citroën Ami
ami = base_vehicle("citroen-ami", "Citroën", "Ami")
ami.update({
    "productionCountry": "Maroc",
    "variant": "5.5 kWh", "bodyType": "Quadricycle", "segment": "A",
    "power_kW": 6, "usableCapacity_kWh": 5.5, "grossCapacity_kWh": 5.5,
    "wltp_max_km": 75, "wltp_min_km": 75,
    "topSpeed_kmh": 45,
    "realRange": {"mixed_km": 70, "highway_130_km": 0, "urban_km": 75, "winter_minus5_km": 50, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.45,
    "chargingDC": {"peakPower_kW": 0, "time_10_80_min": 0, "kWh_added_30min": 0, "confidence": "estimated"},
    "chargingAC": {"onboardCharger_kW": 3.0, "phases": 1, "time_0_100_h": 3.0},
    "length_mm": 2410, "width_mm": 1390, "height_mm": 1520, "trunkCapacity_L": 63,
    "trims": [{"name": "Ami", "price_EUR": 7990, "batteryUsed": "5.5 kWh", "equipmentHighlights": ["Format ultra-compact", "Sans permis"]}]
})

# 26. Citroën ë-C3 / ë-C3 Aircross
c3 = base_vehicle("citroen-e-c3", "Citroën", "ë-C3 & Aircross")
c3.update({
    "productionCountry": "Slovaquie",
    "variant": "44 kWh LFP", "bodyType": "Citadine / SUV", "segment": "B",
    "power_kW": 83, "usableCapacity_kWh": 44, "grossCapacity_kWh": 44.2,
    "wltp_max_km": 320, "wltp_min_km": 300,
    "realRange": {"mixed_km": 240, "highway_130_km": 160, "urban_km": 300, "winter_minus5_km": 190, "confidence": "tested"},
    "dragCoefficient_Cx": 0.32,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 26, "kWh_added_30min": 35, "confidence": "tested"},
    "length_mm": 4015, "width_mm": 1755, "height_mm": 1577, "trunkCapacity_L": 310,
    "trims": [
        {"name": "ë-C3 You", "price_EUR": 23300, "batteryUsed": "44 kWh", "equipmentHighlights": ["Suspensions Advanced Comfort"]},
        {"name": "ë-C3 Aircross", "price_EUR": 27400, "batteryUsed": "44 kWh", "equipmentHighlights": ["Look SUV", "Espace à bord"]}
    ]
})

# 27. Citroën ë-C4 / ë-C4 X
c4 = base_vehicle("citroen-e-c4", "Citroën", "ë-C4 & ë-C4 X")
c4.update({
    "productionCountry": "Espagne",
    "variant": "54 kWh", "bodyType": "Berline compacte", "segment": "C",
    "power_kW": 115, "usableCapacity_kWh": 50.8, "grossCapacity_kWh": 54,
    "wltp_max_km": 420, "wltp_min_km": 415,
    "realRange": {"mixed_km": 330, "highway_130_km": 220, "urban_km": 400, "winter_minus5_km": 260, "confidence": "tested"},
    "dragCoefficient_Cx": 0.29,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 30, "kWh_added_30min": 38, "confidence": "tested"},
    "length_mm": 4360, "width_mm": 1800, "height_mm": 1525, "trunkCapacity_L": 380,
    "trims": [
        {"name": "ë-C4 Plus", "price_EUR": 35200, "batteryUsed": "54 kWh", "equipmentHighlights": ["Moteur 156 ch"]},
        {"name": "ë-C4 X Plus", "price_EUR": 35900, "batteryUsed": "54 kWh", "equipmentHighlights": ["Profil Fastback", "Coffre 510 L"]}
    ]
})

# 28. Citroën ë-C5 Aircross
c5 = base_vehicle("citroen-e-c5-aircross", "Citroën", "ë-C5 Aircross")
c5.update({
    "productionCountry": "France",
    "variant": "73 kWh", "bodyType": "SUV familial", "segment": "C",
    "power_kW": 157, "usableCapacity_kWh": 73, "grossCapacity_kWh": 73,
    "wltp_max_km": 520, "wltp_min_km": 500,
    "realRange": {"mixed_km": 400, "highway_130_km": 280, "urban_km": 480, "winter_minus5_km": 320, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.28,
    "chargingDC": {"peakPower_kW": 160, "time_10_80_min": 30, "kWh_added_30min": 50, "confidence": "estimated"},
    "length_mm": 4500, "width_mm": 1860, "height_mm": 1670, "trunkCapacity_L": 580,
    "trims": [{"name": "Max", "price_EUR": 46990, "batteryUsed": "73 kWh", "equipmentHighlights": ["Plateforme STLA Medium", "Suspensions Advanced Comfort"]}]
})

# 29. Citroën ë-Berlingo
berlingo = base_vehicle("citroen-e-berlingo", "Citroën", "ë-Berlingo")
berlingo.update({
    "productionCountry": "Espagne",
    "variant": "50 kWh LFP", "bodyType": "Ludospace", "segment": "C",
    "power_kW": 100, "usableCapacity_kWh": 50, "grossCapacity_kWh": 50,
    "wltp_max_km": 345, "wltp_min_km": 320,
    "realRange": {"mixed_km": 250, "highway_130_km": 160, "urban_km": 320, "winter_minus5_km": 200, "confidence": "tested"},
    "dragCoefficient_Cx": 0.35,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 30, "kWh_added_30min": 30, "confidence": "tested"},
    "length_mm": 4400, "width_mm": 1848, "height_mm": 1844, "trunkCapacity_L": 775,
    "trims": [{"name": "Plus", "price_EUR": 36900, "batteryUsed": "50 kWh", "equipmentHighlights": ["Portes coulissantes", "Nouvelle batterie LFP"]}]
})

# 30. Citroën ë-SpaceTourer
spacetourer = base_vehicle("citroen-e-spacetourer", "Citroën", "ë-SpaceTourer")
spacetourer.update({
    "productionCountry": "France",
    "variant": "75 kWh", "bodyType": "Monospace", "segment": "E",
    "power_kW": 100, "usableCapacity_kWh": 75, "grossCapacity_kWh": 75,
    "wltp_max_km": 350, "wltp_min_km": 330,
    "realRange": {"mixed_km": 280, "highway_130_km": 180, "urban_km": 340, "winter_minus5_km": 220, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.35,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 45, "kWh_added_30min": 40, "confidence": "tested"},
    "length_mm": 4959, "width_mm": 1920, "height_mm": 1905, "trunkCapacity_L": 798,
    "trims": [{"name": "Business", "price_EUR": 55000, "batteryUsed": "75 kWh", "equipmentHighlights": ["Jusqu'à 9 places", "Espace modulaire"]}]
})

# 31. Peugeot E-208
e208 = base_vehicle("peugeot-e-208", "Peugeot", "E-208")
e208.update({
    "productionCountry": "Espagne",
    "variant": "51 kWh", "bodyType": "Citadine", "segment": "B",
    "power_kW": 115, "usableCapacity_kWh": 48.1, "grossCapacity_kWh": 51,
    "wltp_max_km": 410, "wltp_min_km": 400,
    "realRange": {"mixed_km": 320, "highway_130_km": 210, "urban_km": 380, "winter_minus5_km": 250, "confidence": "tested"},
    "dragCoefficient_Cx": 0.30,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 30, "kWh_added_30min": 35, "confidence": "tested"},
    "length_mm": 4055, "width_mm": 1745, "height_mm": 1430, "trunkCapacity_L": 309,
    "trims": [{"name": "Allure", "price_EUR": 34100, "batteryUsed": "51 kWh", "equipmentHighlights": ["i-Cockpit", "Moteur 156 ch"]}]
})

# 32. Peugeot E-2008
e2008 = base_vehicle("peugeot-e-2008", "Peugeot", "E-2008")
e2008.update({
    "productionCountry": "Espagne",
    "variant": "51 kWh", "bodyType": "SUV urbain", "segment": "B",
    "power_kW": 115, "usableCapacity_kWh": 48.1, "grossCapacity_kWh": 51,
    "wltp_max_km": 406, "wltp_min_km": 390,
    "realRange": {"mixed_km": 300, "highway_130_km": 200, "urban_km": 360, "winter_minus5_km": 240, "confidence": "tested"},
    "dragCoefficient_Cx": 0.32,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 30, "kWh_added_30min": 35, "confidence": "tested"},
    "length_mm": 4304, "width_mm": 1770, "height_mm": 1550, "trunkCapacity_L": 434,
    "trims": [{"name": "Allure", "price_EUR": 40250, "batteryUsed": "51 kWh", "equipmentHighlights": ["Design affirmé", "i-Cockpit 3D"]}]
})

# 33. Peugeot E-308 & E-308 SW
e308 = base_vehicle("peugeot-e-308", "Peugeot", "E-308 & E-308 SW")
e308.update({
    "productionCountry": "France",
    "variant": "51 kWh", "bodyType": "Berline compacte", "segment": "C",
    "power_kW": 115, "usableCapacity_kWh": 50.8, "grossCapacity_kWh": 54,
    "wltp_max_km": 416, "wltp_min_km": 400,
    "realRange": {"mixed_km": 330, "highway_130_km": 220, "urban_km": 390, "winter_minus5_km": 260, "confidence": "tested"},
    "dragCoefficient_Cx": 0.28,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 30, "kWh_added_30min": 38, "confidence": "tested"},
    "length_mm": 4367, "width_mm": 1852, "height_mm": 1441, "trunkCapacity_L": 361,
    "trims": [
        {"name": "E-308 Allure", "price_EUR": 42500, "batteryUsed": "51 kWh", "equipmentHighlights": ["i-Connect Advanced"]},
        {"name": "E-308 SW Allure", "price_EUR": 43500, "batteryUsed": "51 kWh", "equipmentHighlights": ["Volume de coffre", "Ligne de toit rallongée"]}
    ]
})

# 34. Peugeot E-3008
e3008 = base_vehicle("peugeot-e-3008", "Peugeot", "E-3008")
e3008.update({
    "productionCountry": "France",
    "variant": "73 kWh", "bodyType": "SUV Fastback", "segment": "C",
    "power_kW": 157, "usableCapacity_kWh": 73, "grossCapacity_kWh": 73,
    "wltp_max_km": 527, "wltp_min_km": 500,
    "realRange": {"mixed_km": 420, "highway_130_km": 290, "urban_km": 500, "winter_minus5_km": 330, "confidence": "tested"},
    "dragCoefficient_Cx": 0.28,
    "chargingDC": {"peakPower_kW": 160, "time_10_80_min": 30, "kWh_added_30min": 50, "confidence": "tested"},
    "length_mm": 4542, "width_mm": 1895, "height_mm": 1641, "trunkCapacity_L": 520,
    "trims": [{"name": "Allure", "price_EUR": 44990, "batteryUsed": "73 kWh", "equipmentHighlights": ["Panoramic i-Cockpit", "Plateforme STLA Medium"]}]
})

# 35. Peugeot E-408
e408 = base_vehicle("peugeot-e-408", "Peugeot", "E-408")
e408.update({
    "productionCountry": "France",
    "variant": "58.2 kWh", "bodyType": "Crossover Fastback", "segment": "C",
    "power_kW": 157, "usableCapacity_kWh": 58.2, "grossCapacity_kWh": 61,
    "wltp_max_km": 453, "wltp_min_km": 440,
    "realRange": {"mixed_km": 360, "highway_130_km": 240, "urban_km": 430, "winter_minus5_km": 280, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.28,
    "chargingDC": {"peakPower_kW": 120, "time_10_80_min": 30, "kWh_added_30min": 40, "confidence": "estimated"},
    "length_mm": 4687, "width_mm": 1848, "height_mm": 1478, "trunkCapacity_L": 471,
    "trims": [{"name": "Allure", "price_EUR": 43900, "batteryUsed": "58.2 kWh", "equipmentHighlights": ["Batterie NMC", "Design disruptif"]}]
})

# 36. Peugeot E-5008
e5008 = base_vehicle("peugeot-e-5008", "Peugeot", "E-5008")
e5008.update({
    "productionCountry": "France",
    "variant": "73 kWh", "bodyType": "SUV 7 places", "segment": "D",
    "power_kW": 157, "usableCapacity_kWh": 73, "grossCapacity_kWh": 73,
    "wltp_max_km": 502, "wltp_min_km": 480,
    "realRange": {"mixed_km": 400, "highway_130_km": 270, "urban_km": 480, "winter_minus5_km": 310, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.29,
    "chargingDC": {"peakPower_kW": 160, "time_10_80_min": 30, "kWh_added_30min": 50, "confidence": "estimated"},
    "length_mm": 4791, "width_mm": 1895, "height_mm": 1694, "trunkCapacity_L": 259,
    "trims": [{"name": "Allure", "price_EUR": 46990, "batteryUsed": "73 kWh", "equipmentHighlights": ["7 places de série", "Habitabilité"]}]
})

# 37. Peugeot E-Rifter
erifter = base_vehicle("peugeot-e-rifter", "Peugeot", "E-Rifter")
erifter.update({
    "productionCountry": "Espagne",
    "variant": "50 kWh LFP", "bodyType": "Ludospace", "segment": "C",
    "power_kW": 100, "usableCapacity_kWh": 50, "grossCapacity_kWh": 50,
    "wltp_max_km": 340, "wltp_min_km": 320,
    "realRange": {"mixed_km": 240, "highway_130_km": 150, "urban_km": 310, "winter_minus5_km": 190, "confidence": "tested"},
    "dragCoefficient_Cx": 0.35,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 30, "kWh_added_30min": 30, "confidence": "tested"},
    "length_mm": 4403, "width_mm": 1848, "height_mm": 1837, "trunkCapacity_L": 775,
    "trims": [{"name": "Allure", "price_EUR": 37900, "batteryUsed": "50 kWh", "equipmentHighlights": ["Polyvalence", "Nouvelle face avant"]}]
})

# 38. Peugeot E-Traveller
etraveller = base_vehicle("peugeot-e-traveller", "Peugeot", "E-Traveller")
etraveller.update({
    "productionCountry": "France",
    "variant": "75 kWh", "bodyType": "Monospace", "segment": "E",
    "power_kW": 100, "usableCapacity_kWh": 75, "grossCapacity_kWh": 75,
    "wltp_max_km": 350, "wltp_min_km": 330,
    "realRange": {"mixed_km": 280, "highway_130_km": 180, "urban_km": 340, "winter_minus5_km": 220, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.35,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 45, "kWh_added_30min": 40, "confidence": "tested"},
    "length_mm": 4959, "width_mm": 1920, "height_mm": 1890, "trunkCapacity_L": 798,
    "trims": [{"name": "Business", "price_EUR": 56000, "batteryUsed": "75 kWh", "equipmentHighlights": ["Volume XXL", "Navette VIP"]}]
})

# 39. Leapmotor T03
t03 = base_vehicle("leapmotor-t03", "Leapmotor", "T03")
t03.update({
    "productionCountry": "Pologne",
    "variant": "37.3 kWh", "bodyType": "Citadine", "segment": "A",
    "power_kW": 70, "usableCapacity_kWh": 37.3, "grossCapacity_kWh": 37.3,
    "wltp_max_km": 265, "wltp_min_km": 265,
    "realRange": {"mixed_km": 200, "highway_130_km": 130, "urban_km": 250, "winter_minus5_km": 160, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.35,
    "chargingDC": {"peakPower_kW": 48, "time_10_80_min": 36, "kWh_added_30min": 20, "confidence": "estimated"},
    "length_mm": 3620, "width_mm": 1652, "height_mm": 1577, "trunkCapacity_L": 210,
    "trims": [{"name": "T03", "price_EUR": 18900, "batteryUsed": "37.3 kWh", "equipmentHighlights": ["Format mini", "Réseau Stellantis"]}]
})

# 40. Leapmotor C10
c10 = base_vehicle("leapmotor-c10", "Leapmotor", "C10")
c10.update({
    "productionCountry": "Chine",
    "variant": "69.9 kWh", "bodyType": "SUV familial", "segment": "D",
    "power_kW": 160, "usableCapacity_kWh": 69.9, "grossCapacity_kWh": 69.9,
    "wltp_max_km": 420, "wltp_min_km": 420,
    "realRange": {"mixed_km": 330, "highway_130_km": 220, "urban_km": 400, "winter_minus5_km": 260, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.32,
    "chargingDC": {"peakPower_kW": 84, "time_10_80_min": 30, "kWh_added_30min": 30, "confidence": "estimated"},
    "length_mm": 4739, "width_mm": 1900, "height_mm": 1680, "trunkCapacity_L": 435,
    "trims": [{"name": "Style", "price_EUR": 36400, "batteryUsed": "69.9 kWh", "equipmentHighlights": ["Habitabilité", "Rapport prix/prestation"]}]
})

# 41. Leapmotor B10 (Future)
b10 = base_vehicle("leapmotor-b10", "Leapmotor", "B10")
b10.update({
    "productionCountry": "Pologne",
    "variant": "69.9 kWh", "bodyType": "SUV compact", "segment": "C",
    "power_kW": 160, "usableCapacity_kWh": 69.9, "grossCapacity_kWh": 69.9,
    "wltp_max_km": 420, "wltp_min_km": 400,
    "realRange": {"mixed_km": 340, "highway_130_km": 230, "urban_km": 410, "winter_minus5_km": 270, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.30,
    "chargingDC": {"peakPower_kW": 100, "time_10_80_min": 30, "kWh_added_30min": 35, "confidence": "estimated"},
    "length_mm": 4500, "width_mm": 1900, "height_mm": 1600, "trunkCapacity_L": 450,
    "availability": "upcoming",
    "trims": [{"name": "Design", "price_EUR": 30000, "batteryUsed": "69.9 kWh", "equipmentHighlights": ["Nouveau best-seller", "Technologie avancée"]}]
})

# 42. Leapmotor B05 (Future)
b05 = base_vehicle("leapmotor-b05", "Leapmotor", "B05")
b05.update({
    "productionCountry": "Pologne",
    "variant": "50 kWh", "bodyType": "Compacte", "segment": "B",
    "power_kW": 100, "usableCapacity_kWh": 50, "grossCapacity_kWh": 50,
    "wltp_max_km": 400, "wltp_min_km": 380,
    "realRange": {"mixed_km": 310, "highway_130_km": 200, "urban_km": 380, "winter_minus5_km": 240, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.32,
    "chargingDC": {"peakPower_kW": 80, "time_10_80_min": 30, "kWh_added_30min": 30, "confidence": "estimated"},
    "length_mm": 4250, "width_mm": 1800, "height_mm": 1550, "trunkCapacity_L": 350,
    "availability": "upcoming",
    "trims": [{"name": "Design", "price_EUR": 25400, "batteryUsed": "50 kWh", "equipmentHighlights": ["Positionnement agressif", "Compacte électrique"]}]
})

# 43. Tesla Model 3
model3 = base_vehicle("tesla-model-3", "Tesla", "Model 3")
model3.update({
    "productionCountry": "Chine",
    "variant": "Propulsion", "bodyType": "Berline", "segment": "D",
    "power_kW": 208, "usableCapacity_kWh": 57.5, "grossCapacity_kWh": 60,
    "wltp_max_km": 554, "wltp_min_km": 513,
    "realRange": {"mixed_km": 420, "highway_130_km": 425, "highway_120_km": 466, "urban_km": 500, "winter_minus5_km": 260, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.219,
    "chargingDC": {"peakPower_kW": 170, "time_10_80_min": 25, "kWh_added_30min": 45, "confidence": "tested"},
    "length_mm": 4720, "width_mm": 1850, "height_mm": 1441, "trunkCapacity_L": 682,
    "trims": [
        {"name": "Propulsion", "price_EUR": 39990, "batteryUsed": "60 kWh LFP", "equipmentHighlights": ["Efficience record", "Écran arrière"]},
        {"name": "Grande Autonomie Prop", "price_EUR": 44990, "batteryUsed": "78 kWh NMC", "equipmentHighlights": ["Autonomie maximale (702 km WLTP)", "Audio Premium"]},
        {"name": "Grande Autonomie AWD", "price_EUR": 48990, "batteryUsed": "78 kWh NMC", "equipmentHighlights": ["Transmission Intégrale", "Performances"]},
        {"name": "Performance AWD", "price_EUR": 57490, "batteryUsed": "78 kWh NMC", "equipmentHighlights": ["0-100 en 3.1s", "Sièges Sport"]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2024-04", "speed_kmh": 90, "range_km": 573, "consumption_kWh_100km": 10.1, "temperature_C": 15, "wheelSize_inches": 18, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "Model 3 Highland LFP, jantes 18\"."},
        {"sourceId": "nyland", "testDate": "2024-04", "speed_kmh": 120, "range_km": 466, "consumption_kWh_100km": 16.0, "temperature_C": 15, "wheelSize_inches": 18, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "Meilleur score 120km/h de sa catégorie."}
    ],
    "thousandKmChallenge": {
        "sourceId": "nyland", "totalTime_minutes": 545, "averageSpeed_kmh": 110.1, "averageConsumption_Wh_km": 177, "chargingStops": 4, "averageTemperature_C": 15, "testDate": "2024-04", "videoUrl": None, "confidence": "tested"
    }
})

# 44. Tesla Model Y
modely = base_vehicle("tesla-model-y", "Tesla", "Model Y")
modely.update({
    "productionCountry": "Allemagne",
    "variant": "Propulsion", "bodyType": "SUV familial", "segment": "D",
    "power_kW": 220, "usableCapacity_kWh": 57.5, "grossCapacity_kWh": 60,
    "wltp_max_km": 455, "wltp_min_km": 430,
    "realRange": {"mixed_km": 350, "highway_130_km": 350, "highway_120_km": 384, "urban_km": 420, "winter_minus5_km": 220, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.23,
    "chargingDC": {"peakPower_kW": 170, "time_10_80_min": 25, "kWh_added_30min": 40, "confidence": "tested"},
    "length_mm": 4751, "width_mm": 1921, "height_mm": 1624, "trunkCapacity_L": 971,
    "trims": [
        {"name": "Propulsion", "price_EUR": 40990, "batteryUsed": "60 kWh BYD", "equipmentHighlights": ["Supercharge", "Espace à bord exceptionnel"]},
        {"name": "Grande Autonomie Prop", "price_EUR": 44990, "batteryUsed": "78 kWh NMC", "equipmentHighlights": ["600 km WLTP", "Meilleur compromis"]},
        {"name": "Grande Autonomie AWD", "price_EUR": 48990, "batteryUsed": "78 kWh NMC", "equipmentHighlights": ["Transmission Intégrale", "Antibrouillards"]},
        {"name": "Performance", "price_EUR": 57990, "batteryUsed": "78 kWh NMC", "equipmentHighlights": ["Jantes 21\"", "Freins Performance"]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2024-06", "speed_kmh": 90, "range_km": 479, "consumption_kWh_100km": 12.5, "temperature_C": 20, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "Model Y Propulsion (Juniper). Berlin."},
        {"sourceId": "nyland", "testDate": "2024-06", "speed_kmh": 120, "range_km": 384, "consumption_kWh_100km": 15.6, "temperature_C": 20, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ],
    "thousandKmChallenge": {
        "sourceId": "nyland", "totalTime_minutes": 570, "averageSpeed_kmh": 105.3, "averageConsumption_Wh_km": 185, "chargingStops": 4, "averageTemperature_C": 20, "testDate": "2024-06", "videoUrl": None, "confidence": "tested"
    }
})

# 45. BYD Dolphin
dolphin = base_vehicle("byd-dolphin", "BYD", "Dolphin")
dolphin.update({
    "productionCountry": "Chine",
    "variant": "60.4 kWh", "bodyType": "Citadine compacte", "segment": "C",
    "power_kW": 150, "usableCapacity_kWh": 60.4, "grossCapacity_kWh": 60.4,
    "wltp_max_km": 427, "wltp_min_km": 427,
    "realRange": {"mixed_km": 340, "highway_130_km": 255, "highway_120_km": 280, "urban_km": 400, "winter_minus5_km": 240, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.30,
    "chargingDC": {"peakPower_kW": 88, "time_10_80_min": 40, "kWh_added_30min": 35, "confidence": "tested"},
    "length_mm": 4290, "width_mm": 1770, "height_mm": 1570, "trunkCapacity_L": 345,
    "trims": [{"name": "Comfort", "price_EUR": 28990, "batteryUsed": "60.4 kWh LFP", "equipmentHighlights": ["V2L", "Sièges chauffants"]}],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2023-08", "speed_kmh": 90, "range_km": 390, "consumption_kWh_100km": 15.5, "temperature_C": 20, "wheelSize_inches": 17, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "BYD Dolphin standard range."},
        {"sourceId": "nyland", "testDate": "2023-08", "speed_kmh": 120, "range_km": 280, "consumption_kWh_100km": 21.6, "temperature_C": 20, "wheelSize_inches": 17, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ]
})

# 46. BYD Atto 3
atto3 = base_vehicle("byd-atto-3", "BYD", "Atto 3")
atto3.update({
    "productionCountry": "Chine",
    "variant": "60.4 kWh", "bodyType": "SUV compact", "segment": "C",
    "power_kW": 150, "usableCapacity_kWh": 60.4, "grossCapacity_kWh": 60.4,
    "wltp_max_km": 420, "wltp_min_km": 420,
    "realRange": {"mixed_km": 330, "highway_130_km": 245, "highway_120_km": 269, "urban_km": 380, "winter_minus5_km": 230, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.29,
    "chargingDC": {"peakPower_kW": 88, "time_10_80_min": 44, "kWh_added_30min": 35, "confidence": "tested"},
    "length_mm": 4455, "width_mm": 1875, "height_mm": 1615, "trunkCapacity_L": 440,
    "trims": [{"name": "Design", "price_EUR": 37990, "batteryUsed": "60.4 kWh LFP", "equipmentHighlights": ["Écran rotatif 15.6\"", "Toit panoramique"]}],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2023-06", "speed_kmh": 90, "range_km": 380, "consumption_kWh_100km": 15.9, "temperature_C": 18, "wheelSize_inches": 18, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "BYD Atto 3 60 kWh."},
        {"sourceId": "nyland", "testDate": "2023-06", "speed_kmh": 120, "range_km": 269, "consumption_kWh_100km": 22.5, "temperature_C": 18, "wheelSize_inches": 18, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ]
})

# 47. BYD Seal
seal = base_vehicle("byd-seal", "BYD", "Seal")
seal.update({
    "productionCountry": "Chine",
    "variant": "82.5 kWh RWD", "bodyType": "Berline", "segment": "D",
    "power_kW": 230, "usableCapacity_kWh": 82.5, "grossCapacity_kWh": 82.5,
    "wltp_max_km": 570, "wltp_min_km": 520,
    "realRange": {"mixed_km": 460, "highway_130_km": 345, "highway_120_km": 379, "urban_km": 550, "winter_minus5_km": 320, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.219,
    "chargingDC": {"peakPower_kW": 150, "time_10_80_min": 38, "kWh_added_30min": 50, "confidence": "tested"},
    "length_mm": 4800, "width_mm": 1890, "height_mm": 1460, "trunkCapacity_L": 400,
    "trims": [
        {"name": "Design RWD", "price_EUR": 46990, "batteryUsed": "82.5 kWh LFP", "equipmentHighlights": ["Cell-to-Body", "313 ch"]},
        {"name": "Excellence AWD", "price_EUR": 49990, "batteryUsed": "82.5 kWh LFP", "equipmentHighlights": ["530 ch", "Amortisseurs semi-actifs"]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2023-09", "speed_kmh": 90, "range_km": 498, "consumption_kWh_100km": 16.6, "temperature_C": 17, "wheelSize_inches": 18, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "BYD Seal RWD 82 kWh."},
        {"sourceId": "nyland", "testDate": "2023-09", "speed_kmh": 120, "range_km": 379, "consumption_kWh_100km": 21.8, "temperature_C": 17, "wheelSize_inches": 18, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ]
})

# 48. BYD Seal U
sealu = base_vehicle("byd-seal-u", "BYD", "Seal U")
sealu.update({
    "productionCountry": "Chine",
    "variant": "71.8 kWh", "bodyType": "SUV familial", "segment": "D",
    "power_kW": 160, "usableCapacity_kWh": 71.8, "grossCapacity_kWh": 71.8,
    "wltp_max_km": 420, "wltp_min_km": 420,
    "realRange": {"mixed_km": 340, "highway_130_km": 250, "urban_km": 400, "winter_minus5_km": 240, "confidence": "tested"},
    "dragCoefficient_Cx": 0.32,
    "chargingDC": {"peakPower_kW": 115, "time_10_80_min": 42, "kWh_added_30min": 40, "confidence": "tested"},
    "length_mm": 4785, "width_mm": 1890, "height_mm": 1668, "trunkCapacity_L": 552,
    "trims": [{"name": "Comfort", "price_EUR": 41890, "batteryUsed": "71.8 kWh LFP", "equipmentHighlights": ["Confort royal", "V2L"]}]
})

# 49. MG4
mg4 = base_vehicle("mg-mg4", "MG", "MG4")
mg4.update({
    "productionCountry": "Chine",
    "variant": "64 kWh Luxury", "bodyType": "Berline compacte", "segment": "C",
    "power_kW": 150, "usableCapacity_kWh": 61.7, "grossCapacity_kWh": 64,
    "wltp_max_km": 450, "wltp_min_km": 435,
    "realRange": {"mixed_km": 360, "highway_130_km": 282, "highway_120_km": 310, "urban_km": 430, "winter_minus5_km": 250, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.28,
    "chargingDC": {"peakPower_kW": 135, "time_10_80_min": 26, "kWh_added_30min": 45, "confidence": "tested"},
    "length_mm": 4287, "width_mm": 1836, "height_mm": 1504, "trunkCapacity_L": 363,
    "trims": [
        {"name": "Standard", "price_EUR": 29990, "batteryUsed": "51 kWh LFP", "equipmentHighlights": ["Rapport prix/prestation", "Propulsion"]},
        {"name": "Luxury", "price_EUR": 33990, "batteryUsed": "64 kWh NMC", "equipmentHighlights": ["Pompe à chaleur", "Sièges chauffants"]},
        {"name": "Autonomie Étendue", "price_EUR": 39490, "batteryUsed": "77 kWh NMC", "equipmentHighlights": ["520 km WLTP"]},
        {"name": "XPower", "price_EUR": 35490, "batteryUsed": "64 kWh NMC", "equipmentHighlights": ["435 ch AWD", "Launch control"]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2023-07", "speed_kmh": 90, "range_km": 432, "consumption_kWh_100km": 14.3, "temperature_C": 23, "wheelSize_inches": 17, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "MG4 Luxury 64 kWh, bon Cx à 90 km/h."},
        {"sourceId": "nyland", "testDate": "2023-07", "speed_kmh": 120, "range_km": 310, "consumption_kWh_100km": 19.9, "temperature_C": 23, "wheelSize_inches": 17, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ],
    "thousandKmChallenge": {
        "sourceId": "nyland", "totalTime_minutes": 665, "averageSpeed_kmh": 90.2, "averageConsumption_Wh_km": 199, "chargingStops": 5, "averageTemperature_C": 23, "testDate": "2023-07", "videoUrl": None, "confidence": "tested"
    }
})

# 50. MG ZS EV
zsev = base_vehicle("mg-zs-ev", "MG", "ZS EV")
zsev.update({
    "productionCountry": "Chine",
    "variant": "70 kWh Autonomie Étendue", "bodyType": "SUV urbain", "segment": "B",
    "power_kW": 115, "usableCapacity_kWh": 68.3, "grossCapacity_kWh": 70,
    "wltp_max_km": 440, "wltp_min_km": 440,
    "realRange": {"mixed_km": 340, "highway_130_km": 240, "urban_km": 400, "winter_minus5_km": 230, "confidence": "tested"},
    "dragCoefficient_Cx": 0.33,
    "chargingDC": {"peakPower_kW": 92, "time_10_80_min": 40, "kWh_added_30min": 35, "confidence": "tested"},
    "length_mm": 4323, "width_mm": 1809, "height_mm": 1649, "trunkCapacity_L": 448,
    "trims": [{"name": "Luxury Extended", "price_EUR": 37990, "batteryUsed": "70 kWh NMC", "equipmentHighlights": ["Toit ouvrant", "Caméra 360°"]}]
})

# 51. MG5
mg5 = base_vehicle("mg-mg5", "MG", "MG5")
mg5.update({
    "productionCountry": "Chine",
    "variant": "61 kWh Autonomie Étendue", "bodyType": "Break", "segment": "C",
    "power_kW": 115, "usableCapacity_kWh": 57.4, "grossCapacity_kWh": 61.1,
    "wltp_max_km": 400, "wltp_min_km": 400,
    "realRange": {"mixed_km": 320, "highway_130_km": 230, "urban_km": 380, "winter_minus5_km": 220, "confidence": "tested"},
    "dragCoefficient_Cx": 0.29,
    "chargingDC": {"peakPower_kW": 87, "time_10_80_min": 40, "kWh_added_30min": 35, "confidence": "tested"},
    "length_mm": 4600, "width_mm": 1818, "height_mm": 1543, "trunkCapacity_L": 479,
    "trims": [{"name": "Luxury Extended", "price_EUR": 35990, "batteryUsed": "61 kWh NMC", "equipmentHighlights": ["Volume de coffre", "Break familial"]}]
})

# 52. MG Marvel R
marvel = base_vehicle("mg-marvel-r", "MG", "Marvel R")
marvel.update({
    "productionCountry": "Chine",
    "variant": "70 kWh RWD", "bodyType": "SUV familial", "segment": "D",
    "power_kW": 132, "usableCapacity_kWh": 70, "grossCapacity_kWh": 70,
    "wltp_max_km": 402, "wltp_min_km": 370,
    "realRange": {"mixed_km": 320, "highway_130_km": 220, "urban_km": 380, "winter_minus5_km": 220, "confidence": "tested"},
    "dragCoefficient_Cx": 0.32,
    "chargingDC": {"peakPower_kW": 92, "time_10_80_min": 43, "kWh_added_30min": 35, "confidence": "tested"},
    "length_mm": 4674, "width_mm": 1919, "height_mm": 1618, "trunkCapacity_L": 357,
    "trims": [{"name": "Luxury RWD", "price_EUR": 44490, "batteryUsed": "70 kWh NMC", "equipmentHighlights": ["Finition Premium", "Écran central géant"]}]
})

# 53. MG Cyberster
cyberster = base_vehicle("mg-cyberster", "MG", "Cyberster")
cyberster.update({
    "productionCountry": "Chine",
    "variant": "77 kWh RWD", "bodyType": "Roadster", "segment": "Sport",
    "power_kW": 250, "usableCapacity_kWh": 74.4, "grossCapacity_kWh": 77,
    "wltp_max_km": 507, "wltp_min_km": 443,
    "realRange": {"mixed_km": 400, "highway_130_km": 280, "urban_km": 460, "winter_minus5_km": 270, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.28,
    "chargingDC": {"peakPower_kW": 144, "time_10_80_min": 38, "kWh_added_30min": 45, "confidence": "estimated"},
    "length_mm": 4535, "width_mm": 1913, "height_mm": 1329, "trunkCapacity_L": 249,
    "trims": [
        {"name": "Trophy RWD", "price_EUR": 67990, "batteryUsed": "77 kWh NMC", "equipmentHighlights": ["Portes en élytre", "340 ch"]},
        {"name": "GT AWD", "price_EUR": 71990, "batteryUsed": "77 kWh NMC", "equipmentHighlights": ["510 ch", "0-100 en 3.2s"]}
    ]
})

# 54. Volkswagen ID.5
id5 = base_vehicle("vw-id5", "Volkswagen", "ID.5")
id5.update({
    "productionCountry": "Allemagne",
    "assemblyPlant": "Zwickau",
    "variant": "Pro 77 kWh", "bodyType": "SUV Coupé", "segment": "D",
    "power_kW": 210, "usableCapacity_kWh": 77, "grossCapacity_kWh": 82,
    "wltp_max_km": 560, "wltp_min_km": 480,
    "realRange": {"mixed_km": 430, "highway_130_km": 320, "highway_120_km": 352, "urban_km": 510, "winter_minus5_km": 290, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.26,
    "chargingDC": {"peakPower_kW": 135, "time_10_80_min": 29, "kWh_added_30min": 48, "confidence": "tested"},
    "length_mm": 4599, "width_mm": 1852, "height_mm": 1612, "trunkCapacity_L": 549,
    "trims": [
        {"name": "Pro", "price_EUR": 51990, "batteryUsed": "77 kWh NMC", "equipmentHighlights": ["Ligne fastback", "Propulsion"]},
        {"name": "GTX", "price_EUR": 58990, "batteryUsed": "77 kWh NMC", "equipmentHighlights": ["AWD 300 ch", "0-100 en 6.3s"]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2022-10", "speed_kmh": 90, "range_km": 487, "consumption_kWh_100km": 15.8, "temperature_C": 14, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "ID.5 Pro (2022)."},
        {"sourceId": "nyland", "testDate": "2022-10", "speed_kmh": 120, "range_km": 352, "consumption_kWh_100km": 21.9, "temperature_C": 14, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": ""}
    ]
})

# 55. Volkswagen ID.7
id7 = base_vehicle("vw-id7", "Volkswagen", "ID.7")
id7.update({
    "productionCountry": "Allemagne",
    "assemblyPlant": "Emden",
    "variant": "Pro 77 kWh", "bodyType": "Berline", "segment": "E",
    "power_kW": 210, "usableCapacity_kWh": 77, "grossCapacity_kWh": 82,
    "wltp_max_km": 621, "wltp_min_km": 580,
    "realRange": {"mixed_km": 490, "highway_130_km": 410, "highway_120_km": 449, "urban_km": 580, "winter_minus5_km": 340, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.23,
    "chargingDC": {"peakPower_kW": 175, "time_10_80_min": 28, "kWh_added_30min": 55, "confidence": "tested"},
    "length_mm": 4961, "width_mm": 1862, "height_mm": 1536, "trunkCapacity_L": 532,
    "trims": [
        {"name": "Pro", "price_EUR": 54990, "batteryUsed": "77 kWh NMC", "equipmentHighlights": ["Cx 0.23 record", "Charge 175 kW"]},
        {"name": "Pro S 86 kWh", "price_EUR": 62990, "batteryUsed": "86 kWh NMC", "equipmentHighlights": ["700 km WLTP", "Autonomie maxi"]},
        {"name": "Tourer", "price_EUR": 57990, "batteryUsed": "77 kWh NMC", "equipmentHighlights": ["Break caisson", "Volume XXL"]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2024-01", "speed_kmh": 90, "range_km": 565, "consumption_kWh_100km": 13.6, "temperature_C": 10, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "ID.7 Pro. Test hivernal léger."},
        {"sourceId": "nyland", "testDate": "2024-01", "speed_kmh": 120, "range_km": 449, "consumption_kWh_100km": 17.2, "temperature_C": 10, "wheelSize_inches": 19, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "Très bon score malgré temp. basse."}
    ],
    "thousandKmChallenge": {
        "sourceId": "nyland", "totalTime_minutes": 530, "averageSpeed_kmh": 113.2, "averageConsumption_Wh_km": 185, "chargingStops": 3, "averageTemperature_C": 10, "testDate": "2024-01", "videoUrl": None, "confidence": "tested"
    }
})

# 56. Volkswagen ID.Buzz
idbuzz = base_vehicle("vw-id-buzz", "Volkswagen", "ID.Buzz")
idbuzz.update({
    "productionCountry": "Allemagne",
    "assemblyPlant": "Hanovre",
    "variant": "5 places 77 kWh", "bodyType": "Monospace", "segment": "D",
    "power_kW": 210, "usableCapacity_kWh": 77, "grossCapacity_kWh": 82,
    "wltp_max_km": 461, "wltp_min_km": 420,
    "realRange": {"mixed_km": 360, "highway_130_km": 285, "highway_120_km": 313, "urban_km": 430, "winter_minus5_km": 260, "confidence": "bjorn_nyland"},
    "dragCoefficient_Cx": 0.285,
    "chargingDC": {"peakPower_kW": 170, "time_10_80_min": 26, "kWh_added_30min": 55, "confidence": "tested"},
    "length_mm": 4712, "width_mm": 1985, "height_mm": 1937, "trunkCapacity_L": 1121,
    "trims": [
        {"name": "5 places", "price_EUR": 59995, "batteryUsed": "77 kWh NMC", "equipmentHighlights": ["Icône moderne", "Modulable"]},
        {"name": "GTX AWD", "price_EUR": 72495, "batteryUsed": "86 kWh NMC", "equipmentHighlights": ["AWD 340 ch", "Charge 200 kW"]},
        {"name": "7 places LWB", "price_EUR": 69995, "batteryUsed": "86 kWh NMC", "equipmentHighlights": ["3 rangées", "Empattement long"]}
    ],
    "rangeTests": [
        {"sourceId": "nyland", "testDate": "2023-10", "speed_kmh": 90, "range_km": 440, "consumption_kWh_100km": 17.5, "temperature_C": 15, "wheelSize_inches": 20, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "ID.Buzz 5 places, efficacité correcte vu la hauteur."},
        {"sourceId": "nyland", "testDate": "2023-10", "speed_kmh": 120, "range_km": 313, "consumption_kWh_100km": 24.6, "temperature_C": 15, "wheelSize_inches": 20, "tyreModel": None, "protocol": "nyland", "videoUrl": None, "notes": "Cx pénalisé à haute vitesse."}
    ]
})

# 57. Volkswagen ID.2 (Upcoming)
id2 = base_vehicle("vw-id2", "Volkswagen", "ID.2")
id2.update({
    "productionCountry": "Espagne",
    "assemblyPlant": "Pampelune",
    "variant": "38 kWh", "bodyType": "Citadine", "segment": "B",
    "power_kW": 166, "usableCapacity_kWh": 38, "grossCapacity_kWh": 38,
    "wltp_max_km": 450, "wltp_min_km": 400,
    "realRange": {"mixed_km": 330, "highway_130_km": 230, "urban_km": 400, "winter_minus5_km": 220, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.26,
    "chargingDC": {"peakPower_kW": 125, "time_10_80_min": 20, "kWh_added_30min": 40, "confidence": "estimated"},
    "length_mm": 4050, "width_mm": 1812, "height_mm": 1530, "trunkCapacity_L": 340,
    "availability": "upcoming",
    "trims": [
        {"name": "ID.2", "price_EUR": 25000, "batteryUsed": "38 kWh", "equipmentHighlights": ["<25 000 €", "Citadine abordable"]},
        {"name": "ID.2 GTX", "price_EUR": 30000, "batteryUsed": "50 kWh", "equipmentHighlights": ["AWD", "Version chaude"]}
    ]
})

# 58. Cupra Raval
raval = base_vehicle("cupra-raval", "Cupra", "Raval")
raval.update({
    "productionCountry": "Espagne",
    "assemblyPlant": "Martorell",
    "variant": "37 / 52 kWh", "bodyType": "Citadine", "segment": "B",
    "releaseYear": 2025, "marketAvailability": "À venir",
    "power_kW": 166, "power_hp": 226, "torque_Nm": 310,
    "usableCapacity_kWh": 52, "grossCapacity_kWh": 56,
    "mass_kg": 1550,
    "wltp_max_km": 440, "wltp_min_km": 340,
    "realRange": {"mixed_km": 320, "highway_130_km": 220, "urban_km": 390, "winter_minus5_km": 250, "confidence": "estimated"},
    "dragCoefficient_Cx": 0.27,
    "chargingDC": {"peakPower_kW": 105, "time_10_80_min": 25, "kWh_added_30min": 40, "confidence": "estimated"},
    "chargingCurve": [
        {"soc": 0, "power": 80},
        {"soc": 10, "power": 105},
        {"soc": 50, "power": 75},
        {"soc": 80, "power": 40},
        {"soc": 100, "power": 8}
    ],
    "length_mm": 4030, "width_mm": 1780, "height_mm": 1460, "trunkCapacity_L": 441,
    "trims": [
        {"name": "Raval", "price_EUR": 25995, "batteryUsed": "37 kWh", "equipmentHighlights": ["Jantes alliage 17\"", "Écran central tactile 10\""]},
        {"name": "Avnier", "price_EUR": 40460, "batteryUsed": "52 kWh", "equipmentHighlights": ["Grande batterie 52 kWh", "Projecteurs LED", "Écran central tactile 12.9\""]},
        {"name": "VZ", "price_EUR": 42000, "batteryUsed": "52 kWh", "equipmentHighlights": ["Moteur 226 ch (166 kW)", "Sièges baquets sport", "Suspension sport pilotée"]}
    ],
    "configurations": [
        {
            "id": "cupra-raval-raval",
            "label": "Raval · 37 kWh",
            "battery": "standard",
            "trim": "Raval",
            "wheelSize_inches": 17,
            "tyreType": "summer",
            "options": [],
            "price_EUR": 25995,
            "monthlyLease_EUR": None,
            "leasingSocialEligible": False,
            "wltp_km": 340,
            "wltp_consumption_kWh_100km": 14.5,
            "realRange": {"mixed_km": 240, "highway_130_km": 160, "urban_km": 290, "winter_minus5_km": 180, "confidence": "estimated"},
            "rangeTests": [],
            "chargingDC_peak_kW": 50,
            "chargingDC_10_80_min": 30,
            "chargingDC_kWh_30min": 25,
            "chargingCurve": [
                {"soc": 0, "power": 40},
                {"soc": 10, "power": 50},
                {"soc": 50, "power": 45},
                {"soc": 80, "power": 25},
                {"soc": 100, "power": 5}
            ],
            "availability": "upcoming",
            "notes": None
        },
        {
            "id": "cupra-raval-avnier",
            "label": "Avnier · 52 kWh",
            "battery": "long-range",
            "trim": "Avnier",
            "wheelSize_inches": 18,
            "tyreType": "summer",
            "options": [],
            "price_EUR": 40460,
            "monthlyLease_EUR": None,
            "leasingSocialEligible": False,
            "wltp_km": 440,
            "wltp_consumption_kWh_100km": 15.0,
            "realRange": {"mixed_km": 320, "highway_130_km": 220, "urban_km": 390, "winter_minus5_km": 250, "confidence": "estimated"},
            "rangeTests": [],
            "chargingDC_peak_kW": 105,
            "chargingDC_10_80_min": 25,
            "chargingDC_kWh_30min": 40,
            "chargingCurve": [
                {"soc": 0, "power": 80}, {"soc": 10, "power": 105}, {"soc": 50, "power": 75}, {"soc": 80, "power": 40}, {"soc": 100, "power": 8}
            ],
            "availability": "upcoming",
            "notes": None
        },
        {
            "id": "cupra-raval-vz",
            "label": "VZ · 52 kWh",
            "battery": "long-range",
            "trim": "VZ",
            "wheelSize_inches": 18,
            "tyreType": "summer",
            "options": [],
            "price_EUR": 42000,
            "monthlyLease_EUR": None,
            "leasingSocialEligible": False,
            "wltp_km": 420,
            "wltp_consumption_kWh_100km": 15.5,
            "realRange": {"mixed_km": 310, "highway_130_km": 210, "urban_km": 380, "winter_minus5_km": 240, "confidence": "estimated"},
            "rangeTests": [],
            "chargingDC_peak_kW": 105,
            "chargingDC_10_80_min": 25,
            "chargingDC_kWh_30min": 40,
            "chargingCurve": [
                {"soc": 0, "power": 80}, {"soc": 10, "power": 105}, {"soc": 50, "power": 75}, {"soc": 80, "power": 40}, {"soc": 100, "power": 8}
            ],
            "availability": "upcoming",
            "notes": None
        }
    ],
    "keyFeatures": [
        {"category": "design", "label": "Design sportif et affûté typique de Cupra"},
        {"category": "technologie", "label": "Plateforme MEB Entry avec écran tactile de 12.9 pouces"},
        {"category": "confort", "label": "Sièges baquets sport en matériaux recyclés"},
        {"category": "securite", "label": "Projecteurs Matrix LED et aides à la conduite avancées"}
    ],
    "verdict": {
        "strengths": ["Style extérieur et intérieur très dynamique", "Bonne capacité de coffre pour le gabarit (441 L)", "Autonomie confortable avec la batterie de 52 kWh"],
        "weaknesses": ["Tarifs supérieurs à la Volkswagen ID.2", "Confort de suspension ferme à basse vitesse"],
        "idealUserProfile": "Jeunes citadins dynamiques cherchant une citadine électrique performante et stylée.",
        "notIdealFor": "Familles nombreuses ou conducteurs privilégiant le confort feutré de suspension."
    },
    "sources": ["automobile-propre", "largus", "constructeur"]
})

vehicles = [add_default_config(v) for v in [r5, rm, ev3, id3, id4, ioniq5, kona, r4, ev2, inster, ioniq3, ioniq6, ioniq9, staria, ev4_fastback, ev5, ev6, ev9, pv5, pv5_cargo, twingo, scenic, kangoo, grand_kangoo, duo, ami, c3, c4, c5, berlingo, spacetourer, e208, e2008, e308, e3008, e408, e5008, erifter, etraveller, t03, c10, b10, b05, model3, modely, dolphin, atto3, seal, sealu, mg4, zsev, mg5, marvel, cyberster, id5, id7, idbuzz, id2, raval]]

for v in vehicles:
    create_vehicle(v)
