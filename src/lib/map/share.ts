/**
 * Lien de partage de « Ma semaine ». Tout tient après le « # » du lien : cette partie
 * n'est jamais envoyée au serveur (ni à Evly, ni à l'hébergeur, ni à la mesure d'audience).
 * En partage public, le domicile et le travail sont déplacés de 150 à 500 m, toujours
 * du même décalage pour une même adresse : recouper plusieurs liens ne la retrouve pas.
 */

export interface SharedPlace {
  label: string;
  lat: number;
  lon: number;
}

export interface SharedWeek {
  home: SharedPlace;
  work: SharedPlace | null;
  vehicle: string | null;
  /** Version du modèle (slug -> identifiant) */
  versions: Record<string, string>;
  places: Record<string, SharedPlace>;
  /** Grands trajets de l'année (validés à la lecture) */
  holidays?: unknown;
  /** Briques de la semaine type (validées à la lecture) ; liens plus anciens : `on` */
  items?: unknown;
  on?: Record<string, boolean>;
  scenario: string | null;
  season: string;
  tab: string;
  workCharging: boolean;
}

const PREFIX = "#semaine=";

/** Petit hachage stable (FNV-1a) d'une chaîne, entre 0 et 1 */
function hash01(s: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** Position floutée : décalage fixe de 150 à 500 m, puis arrondi à la centaine de mètres */
export function blur(p: SharedPlace, label: string): SharedPlace {
  const key = `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;
  const angle = hash01(key, 1) * 2 * Math.PI;
  const dist = 150 + hash01(key, 2) * 350;
  const lat = p.lat + (dist * Math.cos(angle)) / 111_320;
  const lon = p.lon + (dist * Math.sin(angle)) / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  return { label, lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 };
}

const round = (p: SharedPlace): SharedPlace => ({ label: p.label, lat: Math.round(p.lat * 1e5) / 1e5, lon: Math.round(p.lon * 1e5) / 1e5 });

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function shareUrl(week: SharedWeek, exact: boolean) {
  const data: SharedWeek = {
    ...week,
    home: exact ? round(week.home) : blur(week.home, "Domicile (à 500 m près)"),
    work: week.work ? (exact ? round(week.work) : blur(week.work, "Travail (à 500 m près)")) : null,
    places: Object.fromEntries(Object.entries(week.places).map(([k, p]) => [k, round(p)])),
  };
  return `${location.origin}${location.pathname}${PREFIX}${toBase64Url(JSON.stringify(data))}`;
}

/** Semaine partagée contenue dans l'adresse de la page, ou null */
export function readShared(): SharedWeek | null {
  if (!location.hash.startsWith(PREFIX)) return null;
  try {
    const data = JSON.parse(fromBase64Url(location.hash.slice(PREFIX.length))) as SharedWeek;
    const ok = (p: unknown): p is SharedPlace =>
      !!p && typeof (p as SharedPlace).lat === "number" && typeof (p as SharedPlace).lon === "number" && typeof (p as SharedPlace).label === "string";
    if (!ok(data.home)) return null;
    return {
      home: data.home,
      work: ok(data.work) ? data.work : null,
      vehicle: typeof data.vehicle === "string" ? data.vehicle : null,
      versions: Object.fromEntries(Object.entries(data.versions ?? {}).filter(([, v]) => typeof v === "string")) as Record<string, string>,
      places: Object.fromEntries(Object.entries(data.places ?? {}).filter(([, p]) => ok(p))) as Record<string, SharedPlace>,
      items: data.items,
      holidays: data.holidays,
      on: typeof data.on === "object" && data.on ? data.on : {},
      scenario: typeof data.scenario === "string" ? data.scenario : null,
      season: data.season === "summer" ? "summer" : "winter",
      tab: data.tab === "reach" ? "reach" : "week",
      workCharging: data.workCharging === true,
    };
  } catch {
    return null;
  }
}

/* ── Lien « question » : lisible, avec des communes à la place des coordonnées ── */

/**
 * « Avec une Renault 5, Amiens → Abbeville tous les jours, ça passe ? » tient dans un lien qu'on
 * écrit à la main ou que l'on copie sous une question de forum :
 *   /ma-semaine/?v=renault-5&domicile=Amiens&travail=Abbeville&vers=Lyon&recharge=borne&saison=ete
 * Les lieux sont géocodés à l'ouverture (IGN) ; la semaine s'affiche sans écraser celle du visiteur.
 */
export interface WeekQuestion {
  home: string;
  work: string | null;
  /** Destination d'un grand trajet */
  to: string | null;
  vehicles: string[];
  configs: string[];
  recharge: "maison" | "borne" | null;
  season: "summer" | "winter" | null;
}

export function readQuestion(): WeekQuestion | null {
  const p = new URLSearchParams(location.search);
  const home = p.get("domicile")?.trim();
  if (!home) return null;
  const list = (key: string) => (p.get(key) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const saison = p.get("saison");
  const recharge = p.get("recharge");
  return {
    home,
    work: p.get("travail")?.trim() || null,
    to: p.get("vers")?.trim() || null,
    vehicles: list("v"),
    configs: list("config"),
    recharge: recharge === "maison" || recharge === "borne" ? recharge : null,
    season: saison === "ete" ? "summer" : saison === "hiver" ? "winter" : null,
  };
}

export function questionUrl(q: WeekQuestion): string {
  const p = new URLSearchParams();
  if (q.vehicles.length) p.set("v", q.vehicles.join(","));
  if (q.configs.length) p.set("config", q.configs.join(","));
  p.set("domicile", q.home);
  if (q.work) p.set("travail", q.work);
  if (q.to) p.set("vers", q.to);
  // Valeurs par défaut de la page (prise à la maison, hiver) : inutile de les écrire
  if (q.recharge === "borne") p.set("recharge", "borne");
  if (q.season === "summer") p.set("saison", "ete");
  return `${location.origin}${location.pathname}?${p.toString().replace(/%2C/g, ",")}`;
}

/** Commune d'un lieu (« 8 Rue du Port 80000 Amiens » → « Amiens »), jamais l'adresse ; null si on ne sait pas */
export function communeOf(label: string): string | null {
  if (/^Domicile|^Travail/.test(label)) return null;
  const postal = label.match(/\b\d{5}\s+([^,\d][^,]*)$/);
  if (postal) return postal[1]!.trim();
  if (label.includes(",")) return label.split(",").at(-1)!.trim() || null;
  return /\d/.test(label) ? null : label.trim();
}
