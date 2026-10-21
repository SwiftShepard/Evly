/**
 * Adéquation d'un modèle à un trajet, version par version (fonctions pures,
 * utilisables au build comme dans le navigateur).
 * Règle : une version « tient votre semaine » si son autonomie hiver (-5 °C)
 * couvre 5 jours de trajet sans recharger.
 */

/** Version compacte : [prix, autonomie hiver, autonomie réelle mixte, WLTP, libellé, confiance (lib/confidence, LEVEL_CODE)] */
export type IndexConfig = [price: number | null, winter: number, real: number, wltp: number, label: string, conf: 0 | 1 | 2];

export interface IndexRow {
  /** slug, marque, modèle */
  s: string;
  b: string;
  m: string;
  /** 1 = utilitaire strict */
  u: 0 | 1;
  /** Prix d'entrée, autonomies de la fiche (version de référence) */
  p: number | null;
  r: number;
  w: number;
  h: number;
  /** Confiance de l'autonomie de la fiche : 1 mesurée, 2 constructeur, 0 estimée (lib/confidence) */
  c: 0 | 1 | 2;
  /** Photo 240 px et 480 px */
  i: string | null;
  i2: string | null;
  /** Versions commercialisées */
  v: IndexConfig[];
}

/** Version la moins chère qui tient le besoin (km d'une semaine), ou null */
export function cheapestFitting(row: IndexRow, needKm: number): IndexConfig | null {
  let best: IndexConfig | null = null;
  for (const cfg of row.v) {
    if (cfg[0] === null || cfg[1] < needKm) continue;
    if (!best || cfg[0] < best[0]!) best = cfg;
  }
  return best;
}

/** Au moins une version tient le besoin */
export function anyFits(row: IndexRow, needKm: number): boolean {
  return row.v.some((cfg) => cfg[1] >= needKm);
}

/** Meilleure autonomie hiver parmi les versions */
export function bestWinter(row: IndexRow): number {
  return row.v.reduce((max, cfg) => Math.max(max, cfg[1]), row.h);
}

/** Les modèles particuliers les moins chers qui tiennent le besoin, avec la version retenue */
export function cheapestMatches(rows: IndexRow[], needKm: number, limit: number) {
  return rows
    .filter((row) => !row.u)
    .map((row) => ({ row, cfg: cheapestFitting(row, needKm) }))
    .filter((m): m is { row: IndexRow; cfg: IndexConfig } => m.cfg !== null)
    .sort((a, b) => a.cfg[0]! - b.cfg[0]!)
    .slice(0, limit);
}

export function countFitting(rows: IndexRow[], needKm: number) {
  const pool = rows.filter((row) => !row.u);
  return { fit: pool.filter((row) => anyFits(row, needKm)).length, total: pool.length };
}
