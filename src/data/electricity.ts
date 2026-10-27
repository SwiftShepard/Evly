/**
 * Prix de l'électricité pour recharger (roadmap E11), datés et sourcés : à mettre à jour à chaque
 * évolution des tarifs réglementés (1er février et 1er août en général).
 */

/** Tarif Bleu réglementé d'EDF, TTC, compteur de 6 kVA */
export const TARIF_BLEU = {
  since: "2026-08-01",
  sourceUrl: "https://particulier.edf.fr/fr/accueil/electricite-gaz/tarif-bleu.html",
  base: 0.2001,
  hp: 0.2142,
  hc: 0.1589,
  tempo: {
    blueHc: 0.1356,
    blueHp: 0.1654,
    whiteHc: 0.1536,
    whiteHp: 0.1921,
    redHc: 0.1615,
    redHp: 0.7295,
  },
  /** Jours de chaque couleur sur une saison Tempo ; les rouges tombent entre le 1er novembre et le 31 mars */
  tempoDays: { blue: 300, white: 43, red: 22 },
};

/**
 * Recharge rapide sur borne publique : fourchette relevée en octobre 2026 selon le réseau et
 * l'abonnement (Tesla, Ionity, Electra, TotalEnergies…), sans moyenne nationale publiée.
 */
export const FAST_EUR_KWH: [number, number] = [0.4, 0.7];
