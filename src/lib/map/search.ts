/**
 * Recherche d'un lieu pour « Ma semaine » : on tape ce qu'on connaît (« Fitness Park »,
 * « Carrefour », « mairie de Pantin », une adresse) et on obtient d'abord ce qui est près de
 * chez soi, à condition qu'il porte bien les mots tapés. Deux sources publiques, interrogées
 * depuis le navigateur :
 *  - Photon (komoot, données OpenStreetMap) : lieux par leur nom, classés autour d'un point ;
 *  - Géoplateforme de l'IGN : adresses et communes, la référence pour une adresse exacte.
 */
import { haversine } from "./roadGraph";
import { activityPlaces, isPureActivity, matchActivity } from "./activities";

const PHOTON = "https://photon.komoot.io/api/";
const IGN = "https://data.geopf.fr/geocodage/search";
/** France métropolitaine */
const BBOX = "-5.3,41.3,9.7,51.2";
/** Arrêts et quais de transport : ils doublent le lieu qu'ils desservent (« Isola 2000 - Station ») */
const NOISE = new Set(["highway:bus_stop", "highway:platform", "railway:platform", "railway:stop", "public_transport:platform", "public_transport:stop_position"]);

export interface FoundPlace {
  /** Libellé retenu pour le lieu (nom, ville) */
  label: string;
  /** Seconde ligne : type de lieu, adresse */
  detail: string;
  lat: number;
  lon: number;
  /** Distance au point de référence (m), si on en a un */
  d: number | null;
}

/** Types de lieux OpenStreetMap les plus courants, en français */
const KIND: Record<string, string> = {
  fitness_centre: "Salle de sport",
  sports_centre: "Centre sportif",
  swimming_pool: "Piscine",
  supermarket: "Supermarché",
  convenience: "Supérette",
  bakery: "Boulangerie",
  doityourself: "Bricolage",
  hardware: "Quincaillerie",
  garden_centre: "Jardinerie",
  restaurant: "Restaurant",
  fast_food: "Restauration rapide",
  cafe: "Café",
  school: "École",
  college: "Établissement scolaire",
  university: "Université",
  kindergarten: "Crèche, maternelle",
  hospital: "Hôpital",
  pharmacy: "Pharmacie",
  cinema: "Cinéma",
  townhall: "Mairie",
  station: "Gare",
  mall: "Centre commercial",
  department_store: "Grand magasin",
  office: "Bureaux",
  company: "Entreprise",
  industrial: "Zone d'activité",
  commercial: "Zone commerciale",
  retail: "Zone commerciale",
  park: "Parc",
  attraction: "Site touristique",
  museum: "Musée",
};

/** Position arrondie (environ 1 km) : assez pour classer les résultats, sans envoyer l'adresse */
const coarse = (v: number) => Math.round(v * 100) / 100;

async function photon(q: string, near: { lat: number; lon: number } | null, signal?: AbortSignal): Promise<FoundPlace[]> {
  const params = new URLSearchParams({ q, limit: "15", lang: "fr", bbox: BBOX });
  if (near) {
    params.set("lat", String(coarse(near.lat)));
    params.set("lon", String(coarse(near.lon)));
  }
  const res = await fetch(`${PHOTON}?${params}`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? [])
    .filter((f: any) => f.properties?.countrycode === "FR" && !NOISE.has(`${f.properties.osm_key}:${f.properties.osm_value}`))
    .map((f: any) => {
      const p = f.properties;
      const [lon, lat] = f.geometry.coordinates as [number, number];
      const street = [p.housenumber, p.street].filter(Boolean).join(" ");
      const place = p.city ?? p.district ?? p.county ?? "";
      const name = p.name ?? street;
      return {
        label: place && name !== place ? `${name}, ${place}` : name,
        detail: [KIND[p.osm_value], street !== name ? street : "", p.postcode && place ? `${p.postcode} ${place}` : ""].filter(Boolean).join(" · "),
        lat,
        lon,
        d: null,
      };
    });
}

async function ign(q: string, near: { lat: number; lon: number } | null, signal?: AbortSignal): Promise<FoundPlace[]> {
  const params = new URLSearchParams({ q, limit: "5", autocomplete: "1" });
  if (near) {
    params.set("lat", String(coarse(near.lat)));
    params.set("lon", String(coarse(near.lon)));
  }
  const res = await fetch(`${IGN}?${params}`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? []).map((f: any) => ({
    label: f.properties.label as string,
    detail: f.properties.type === "municipality" ? "Commune" : "Adresse",
    lon: f.geometry.coordinates[0] as number,
    lat: f.geometry.coordinates[1] as number,
    d: null,
  }));
}

/** Minuscules sans accents ni ponctuation, pour comparer ce qu'on tape à un nom */
const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Nom du lieu, sans la commune qui suit la virgule */
const nameOf = (p: FoundPlace) => norm(p.label.split(",")[0] ?? p.label);

/**
 * Correspondance avec la saisie : 0 = le nom commence par ce qu'on a tapé, 1 = le nom contient
 * tous les mots, 2 = le nom et son adresse les contiennent, 3 = résultat approché.
 */
function matchRank(q: string, p: FoundPlace) {
  const words = norm(q).split(" ").filter(Boolean);
  const name = nameOf(p);
  const all = norm(`${p.label} ${p.detail}`);
  if (name.startsWith(norm(q))) return 0;
  if (words.every((w) => name.split(" ").some((n) => n.startsWith(w)))) return 1;
  if (words.every((w) => all.includes(w))) return 2;
  return 3;
}

/**
 * Lieux correspondant à la saisie, sans limite de distance (une sortie peut être loin) :
 * d'abord ceux qui portent les mots tapés, puis, à correspondance égale, du plus proche au
 * plus loin du point de référence. Une saisie qui commence par un numéro est une adresse :
 * l'IGN passe alors en tête à égalité.
 * Une activité (« basket », « padel », « piscine ») cherche d'abord les équipements où on la
 * pratique, autour du point de référence (lib/map/activities) ; les lieux de ce nom suivent.
 */
export async function searchPlaces(q: string, near: { lat: number; lon: number } | null, signal?: AbortSignal): Promise<FoundPlace[]> {
  const [named, addresses, sports] = await Promise.all([
    photon(q, near, signal).catch(() => [] as FoundPlace[]),
    ign(q, near, signal).catch(() => [] as FoundPlace[]),
    near && matchActivity(q) ? activityPlaces(q, near).catch(() => [] as FoundPlace[]) : Promise.resolve([] as FoundPlace[]),
  ]);
  const looksLikeAddress = /^\s*\d/.test(q);
  let all = looksLikeAddress ? [...addresses, ...named] : [...named, ...addresses];
  // Doublons : même lieu dans les deux sources (50 m), ou même nom à moins de 2 km (station, hameau, poste…)
  all = all.filter(
    (p, i) =>
      all.findIndex(
        (o) => haversine(o.lat, o.lon, p.lat, p.lon) < 50 || (nameOf(o) === nameOf(p) && haversine(o.lat, o.lon, p.lat, p.lon) < 2000)
      ) === i
  );
  const ranked = all.map((p, order) => ({
    ...p,
    d: near ? haversine(near.lat, near.lon, p.lat, p.lon) : null,
    rank: matchRank(q, p),
    order,
  }));
  ranked.sort((a, b) => a.rank - b.rank || (a.d !== null && b.d !== null ? a.d - b.d : a.order - b.order));
  // Les résultats approchés ne viennent qu'à défaut de mieux
  const exact = ranked.filter((p) => p.rank < 3);
  const clean = ({ rank: _r, order: _o, ...p }: (typeof ranked)[number]): FoundPlace => p;
  const byName = exact.length ? exact : ranked;
  if (!sports.length) return byName.slice(0, 8).map(clean);
  // Activité : un lieu qui porte exactement ce nom tout près passe devant (« Fitness Park » n'est pas
  // n'importe quelle salle de fitness) ; puis les équipements ; puis les autres lieux de ce nom à
  // moins de 50 km (un « Basket » à 200 km n'aide pas)
  const close = byName.filter((p) => p.d === null || p.d <= 50_000);
  const exactNear = close.filter((p) => p.rank <= 1).map(clean);
  const rest = close.filter((p) => p.rank > 1).map(clean);
  const fresh = sports.filter((s) => !exactNear.some((p) => haversine(s.lat, s.lon, p.lat, p.lon) < 100));
  // Simple activité : équipements et lieux de ce nom mêlés, du plus proche au plus loin
  if (isPureActivity(q)) return [...exactNear, ...fresh].sort((a, b) => (a.d ?? 0) - (b.d ?? 0)).slice(0, 8);
  return [...exactNear, ...fresh.slice(0, 6), ...rest].slice(0, 8);
}
