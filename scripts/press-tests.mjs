/**
 * Essais presse sourcés (roadmap A16), appliqués aux fiches par scripts/sync-nyland-ranges.mjs.
 * Une entrée par version essayée : configurations de la fiche qui ont la même batterie et le même
 * moteur (suffixes d'id, comme la table Nyland), lien de l'article, mesures telles que publiées.
 *
 * derive : l'essai donne des vitesses stabilisées à 90 km/h et à 120 km/h (ou 110 et 130, dont on
 * tire 120 par la moyenne des consommations) : l'autonomie de la fiche en est tirée comme pour
 * Nyland (mixte = moyenne 90 / 120 km/h, 130 km/h mesuré, ville = 1,1 × 90 km/h, hiver par le
 * modèle unique) et passe en « tested ». Sinon (boucle mixte, autoroute seule, autre carrosserie)
 * l'essai est joint au tableau de la fiche et l'autonomie reste estimée.
 * capacity : capacité retenue pour ce calcul (celle mesurée par le média quand il la donne).
 * Ne jamais saisir une valeur qui n'est pas dans l'article.
 */

const AP = "automobile-propre";
const t = (o) => ({
  sourceId: o.source,
  testDate: o.date,
  speed_kmh: o.speed ?? null,
  range_km: o.range ?? null,
  consumption_kWh_100km: o.conso,
  temperature_C: o.temp ?? null,
  wheelSize_inches: o.wheel ?? null,
  tyreModel: o.tyre ?? null,
  protocol: "tested-other",
  videoUrl: null,
  url: o.url,
  notes: o.notes,
});

/** Supertest Automobile Propre : boucle mixte puis vitesses stabilisées */
function supertest({ url, date, wheel, tyre, loopTemp, loop, speeds, version, rangeNote = "" }) {
  const base = { source: AP, url, date, wheel, tyre };
  return [
    ...(loop ? [t({ ...base, conso: loop[0], range: loop[1], temp: loopTemp, notes: `Supertest Automobile Propre (${version}), parcours mixte.${rangeNote}` })] : []),
    ...speeds.map(([speed, conso, range]) =>
      t({ ...base, speed, conso, range, notes: `Supertest Automobile Propre (${version}), vitesse stabilisée.${rangeNote}` })
    ),
  ];
}

export const PRESS_TESTS = {
  "renault-4": [{
    configs: ["evolution-52", "techno-52", "iconic-52"],
    derive: true,
    capacity: 52,
    tests: supertest({
      url: "https://www.automobile-propre.com/articles/supertest-renault-4-e-tech-les-consommations-et-autonomies-mesurees-de-notre-essai/",
      date: "2026-03", wheel: 18, tyre: "Michelin e.Primacy 195/60 R18", version: "Techno 52 kWh",
      loopTemp: 14, loop: [16.3, 319],
      speeds: [[90, 14.7, 354], [110, 19.0, 274], [130, 24.1, 216]],
    }),
  }],
  "skoda-elroq": [{
    configs: ["85-77-kwh-210-kw-rwd--77", "85-sportline-77-kwh-210-kw-rwd--77"],
    derive: true,
    capacity: 77,
    tests: supertest({
      url: "https://www.automobile-propre.com/articles/supertest-skoda-elroq-iv-85-les-consommations-et-autonomies-mesurees-de-notre-essai/",
      date: "2025-09", wheel: 21, tyre: "Hankook Ventus S1 Evo3 235/45 R21 et 255/40 R21", version: "85, jantes 21 pouces",
      loopTemp: 14, loop: [16.9, 456],
      speeds: [[90, 16.2, 475], [110, 19.7, 391], [130, 24.0, 321]],
    }),
  }],
  "renault-twingo": [{
    configs: ["evolution", "techno"],
    derive: true,
    capacity: 27.5,
    tests: supertest({
      url: "https://www.automobile-propre.com/articles/supertest-renault-twingo-e-tech-les-consommations-et-autonomies-mesurees-de-notre-essai/",
      date: "2026-05", wheel: 18, tyre: "Continental EcoContact 7 205/45 R18", version: "jantes 18 pouces en option",
      loopTemp: 15, loop: [13.5, 204],
      // Autonomies aux vitesses stabilisées : capacité utile de 27,5 kWh / consommation publiée (14 °C)
      speeds: [[90, 12.3, 224], [110, 16.3, 169], [130, 20.6, 133]],
      rangeNote: " Autonomie calculée sur les 27,5 kWh utiles.",
    }),
  }],
  "ds-n8": [{
    configs: ["n8-97", "pallas-97", "etoile-97"],
    derive: true,
    // Automobile Propre a mesuré 91 kWh exploitables en moyenne (97,2 kWh annoncés)
    capacity: 91,
    tests: supertest({
      url: "https://www.automobile-propre.com/articles/supertest-ds-numero-8-les-consommations-et-autonomies-mesurees-de-notre-essai/",
      date: "2025-11", wheel: 19, tyre: "Goodyear Eagle F1 Asymmetric 6 235/55 R19", version: "FWD Long Range 97,2 kWh",
      loopTemp: 14, loop: [16.1, 604],
      speeds: [[90, 13.5, 720], [110, 17.2, 565], [130, 21.6, 450]],
      rangeNote: " Autonomies publiées sur 97,2 kWh annoncés ; capacité mesurée 91 kWh, retenue pour la fiche.",
    }),
  }],
  "alpine-a390": [{
    configs: ["alpine-a390-gt"],
    derive: true,
    capacity: 89,
    tests: supertest({
      url: "https://www.automobile-propre.com/articles/supertest-alpine-a390-gt-les-consommations-et-autonomies-mesurees-de-notre-essai/",
      date: "2026-02", wheel: 20, tyre: "Michelin Pilot Sport EV 245/45 R20", version: "GT",
      loopTemp: 12, loop: [20.3, 438],
      speeds: [[90, 18.6, 480], [110, 22.5, null], [130, 27.8, 320]],
    }),
  }],
  "mg-mg4-urban": [{
    configs: ["comfort-54", "premium-54"],
    derive: true,
    // Capacité utile mesurée par Automobile Propre
    capacity: 52.6,
    tests: supertest({
      url: "https://www.automobile-propre.com/articles/supertest-mg-4-urban-54-kwh-les-consommations-et-autonomies-mesurees-avec-quelques-records-battus/",
      date: "2026-09", wheel: 17, tyre: "Maxxis Waltz MS1 205/50 R17", version: "54 kWh",
      loopTemp: 14, loop: [13.4, 392],
      speeds: [[90, 13.3, 395], [110, 17.3, 304], [130, 21.5, 245]],
      rangeNote: " Autonomie calculée sur les 52,6 kWh utiles mesurés.",
    }),
  }],
  "peugeot-e-3008": [{
    // Pas de mesure à 90 km/h : essai joint, autonomie estimée
    configs: ["allure-210-ch-73", "gt-210-ch-73", "gt-exclusive-210-ch-73"],
    derive: false,
    tests: supertest({
      url: "https://www.automobile-propre.com/articles/essai-peugeot-e-3008-les-consommations-et-autonomies-mesurees-de-notre-supertest",
      date: "2024-04", wheel: 20, tyre: "Michelin e.Primacy 235/50 R20", version: "GT 73 kWh",
      loopTemp: 14, loop: [17.4, 420],
      speeds: [[110, 19.6, 372], [130, 24.4, 300]],
    }),
  }],
  "leapmotor-t03": [{
    configs: ["design"],
    derive: false,
    tests: supertest({
      url: "https://www.automobile-propre.com/essai-leapmotor-t03-les-consommations-et-autonomies-mesurees-de-notre-supertest/",
      date: "2023-10", wheel: 15, tyre: "Nexen N'Blue Eco 165/65 R15", version: "T03",
      loopTemp: 18, loop: [15.4, 240],
      speeds: [[110, 17.8, 208], [130, 23.6, 157]],
    }),
  }],
  "kia-pv5-cargo": [{
    // Essai d'un L2H1 (plus long que la version L1H1 de la fiche) : joint, autonomie estimée
    configs: ["essential-71"],
    derive: false,
    tests: supertest({
      url: "https://www.automobile-propre.com/articles/supertest-kia-pv5-cargo-les-autonomies-et-temps-de-recharge-mesures-de-notre-essai/",
      date: "2026-06", wheel: 16, tyre: "Nexen N Blue S 215/65 R16", version: "L2H1 71,2 kWh",
      loopTemp: 15, loop: [19.7, 345],
      speeds: [[90, 17.2, null], [110, 22.6, null], [130, 28.8, null]],
    }),
  }],
  "peugeot-e-2008": [{
    // ArenaEV roule à 60, 90 et 130 km/h : pas de 120 km/h, essai joint
    configs: ["style-54", "allure-54", "gt-54", "gt-exclusive-54"],
    derive: false,
    tests: [[60, 9.7, 524], [90, 14.6, 348], [130, 22.0, 231]].map(([speed, conso, range]) =>
      t({
        source: "arenaev", url: "https://www.arenaev.com/peugeot_e2008_real_world_range_test-news-3372.php",
        date: "2024-04", speed, conso, range, temp: 17, notes: "Essai ArenaEV (54 kWh, 156 ch), vitesse stabilisée.",
      })
    ),
  }],
  "toyota-c-hr-plus": [{
    configs: ["design-77"],
    derive: false,
    tests: [
      t({ source: "largus", url: "https://www.largus.fr/actualite-automobile/essai-toyota-c-hr-electrique-2026-quelle-est-lautonomie-reelle-de-la-version-77-kwh-2199510.html", date: "2026-06", conso: 14.8, range: 486, wheel: 18, tyre: "235/60 R18", notes: "Essai L'argus (Design 77 kWh), boucle routière de 141 km par 17 à 20 °C ; autonomie calculée sur les 72 kWh utiles." }),
      t({ source: "largus", url: "https://www.largus.fr/actualite-automobile/essai-toyota-c-hr-electrique-2026-quelle-est-lautonomie-reelle-de-la-version-77-kwh-2199510.html", date: "2026-06", speed: 130, conso: 21.5, range: 334, wheel: 18, tyre: "235/60 R18", notes: "Essai L'argus (Design 77 kWh), autoroute à 130 km/h réels par 22 à 24 °C." }),
    ],
  }],
  "citroen-e-c5-aircross": [
    {
      configs: ["max-73"],
      derive: false,
      tests: [
        t({ source: "largus", url: "https://www.largus.fr/actualite-automobile/essai-citroen-e-c5-aircross-2025-le-test-verite-sur-son-autonomie-electrique-30043734.html", date: "2025-10", conso: 18.1, range: 403, temp: 11, wheel: 19, notes: "Essai L'argus (Max 73 kWh), boucle routière de 141 km ; autonomie calculée sur les 73 kWh utiles." }),
        t({ source: "largus", url: "https://www.largus.fr/actualite-automobile/essai-citroen-e-c5-aircross-2025-le-test-verite-sur-son-autonomie-electrique-30043734.html", date: "2025-10", speed: 130, conso: 24.7, range: 295, wheel: 19, notes: "Essai L'argus (Max 73 kWh), autoroute à 130 km/h réels." }),
      ],
    },
    {
      configs: ["max-97"],
      derive: false,
      tests: [
        t({ source: "largus", url: "https://www.largus.fr/actualite-automobile/essai-citroen-e-c5-aircross-2025-le-test-verite-sur-son-autonomie-electrique-30043734.html", date: "2025-10", conso: 17.2, range: 564, temp: 22, wheel: 19, notes: "Essai L'argus (Max 97 kWh), boucle routière de 141 km ; autonomie calculée sur les 97,2 kWh utiles." }),
        t({ source: "largus", url: "https://www.largus.fr/actualite-automobile/essai-citroen-e-c5-aircross-2025-le-test-verite-sur-son-autonomie-electrique-30043734.html", date: "2025-10", speed: 130, conso: 22.2, range: 437, wheel: 19, notes: "Essai L'argus (Max 97 kWh), autoroute à 130 km/h réels." }),
      ],
    },
  ],
};

/** Toutes les URL d'articles de la table (reconnaître ces essais dans les fiches) */
export const PRESS_URLS = new Set(Object.values(PRESS_TESTS).flat().flatMap((e) => e.tests.map((x) => x.url)));

/**
 * Autonomie d'une version tirée d'un essai presse (même règle que Nyland), ou null si l'essai
 * ne donne pas 90 km/h et 120 km/h (direct, ou 110 + 130).
 */
export function deriveRange(tests, capacity) {
  const at = (s) => tests.find((x) => x.speed_kmh === s)?.consumption_kWh_100km;
  const c90 = at(90);
  const c120 = at(120) ?? (at(110) && at(130) ? (at(110) + at(130)) / 2 : undefined);
  if (!c90 || !c120) return null;
  const range = (c) => (capacity / c) * 100;
  const r90 = range(c90);
  const r120 = range(c120);
  const c130 = at(130);
  return {
    mixed_km: Math.round((r90 + r120) / 2),
    highway_130_km: Math.round(c130 ? range(c130) : r120 * 0.9),
    urban_km: Math.round(r90 * 1.1),
  };
}
