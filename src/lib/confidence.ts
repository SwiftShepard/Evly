/**
 * Niveau de confiance d'un chiffre (autonomie, recharge) : une seule définition pour tout le site
 * (roadmap K2). Trois niveaux, toujours dits : mesurée sur route, annoncée par le constructeur,
 * estimée par Evly. Le badge (.conf dans global.css) a trois rendus au même balisage :
 * Confidence.astro, Confidence.tsx et confidenceHTML() pour les listes construites en JS.
 */

export type ConfidenceLevel = "measured" | "manufacturer" | "estimated";

export interface ConfidenceInfo {
  level: ConfidenceLevel;
  /** « mesurée » | « constructeur » | « estimée » (ou « en attente ») */
  label: string;
  /** D'où vient le chiffre, en une phrase (infobulle native et lecteurs d'écran) */
  source: string;
}

/** Ce que mesure le chiffre : la phrase de provenance en dépend */
export type ConfidenceSubject = "range" | "charge" | "challenge";

const LABELS: Record<ConfidenceLevel, string> = {
  measured: "mesurée",
  manufacturer: "constructeur",
  estimated: "estimée",
};

const SOURCES: Record<ConfidenceSubject, Record<string, string>> = {
  range: {
    bjorn_nyland: "Moyenne des essais de Bjørn Nyland à 90 et 120 km/h",
    tested: "Mesurée lors d'un essai sur route indépendant",
    manufacturer: "Chiffre annoncé par le constructeur, pas encore vérifié sur route",
    estimated: "Estimée d'après les essais de versions proches, en attendant un essai de celle-ci",
    pending: "Essai publié, valeurs en cours de vérification",
  },
  charge: {
    bjorn_nyland: "Courbe relevée sur borne rapide par Bjørn Nyland",
    tested: "Courbe relevée sur borne rapide lors d'un essai indépendant",
    manufacturer: "Temps et puissance annoncés par le constructeur",
    estimated: "Estimée d'après des modèles proches",
    pending: "Essai publié, valeurs en cours de vérification",
  },
  challenge: {
    bjorn_nyland: "Défi des 1 000 km roulé par Bjørn Nyland",
    tested: "Défi des 1 000 km roulé par Bjørn Nyland",
    estimated: "Pas encore roulé",
    pending: "Essai publié, valeurs en cours de vérification",
  },
};

export function confidenceLevel(code: string | null | undefined): ConfidenceLevel {
  if (code === "bjorn_nyland" || code === "tested") return "measured";
  if (code === "manufacturer") return "manufacturer";
  return "estimated";
}

export function isMeasured(code: string | null | undefined): boolean {
  return confidenceLevel(code) === "measured";
}

/** Niveau, libellé et provenance d'un code de confiance des fiches (realRange.confidence…) */
export function confidenceOf(code: string | null | undefined, subject: ConfidenceSubject = "range"): ConfidenceInfo {
  const level = confidenceLevel(code);
  return {
    level,
    label: code === "pending" ? "en attente" : LABELS[level],
    source: SOURCES[subject][code ?? "estimated"] ?? SOURCES[subject].estimated!,
  };
}

/** Code compact pour /recherche.json : 1 mesurée, 2 constructeur, 0 estimée */
export const LEVEL_CODE: Record<ConfidenceLevel, 0 | 1 | 2> = { measured: 1, manufacturer: 2, estimated: 0 };
const BY_CODE: ConfidenceLevel[] = ["estimated", "measured", "manufacturer"];

export function levelFromCode(n: number | null | undefined): ConfidenceLevel {
  return BY_CODE[n ?? 0] ?? "estimated";
}

/** Libellé et provenance génériques d'un niveau (quand le code d'origine n'est plus connu, index compact) */
export function infoOfLevel(level: ConfidenceLevel, subject: ConfidenceSubject = "range"): ConfidenceInfo {
  return confidenceOf(level === "measured" ? "tested" : level, subject);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Badge en chaîne HTML, pour les listes construites dans le navigateur (recherche, sélections) */
export function confidenceHTML(level: ConfidenceLevel, opts: { label?: string; subject?: ConfidenceSubject } = {}): string {
  const info = infoOfLevel(level, opts.subject);
  const label = opts.label ?? info.label;
  return `<span class="conf" data-level="${level}" title="${esc(info.source)}"><i aria-hidden="true"></i>${esc(label)}<span class="sr-only"> : ${esc(info.source)}</span></span>`;
}
