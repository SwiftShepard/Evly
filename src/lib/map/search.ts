/**
 * Recherche d'un lieu pour « Ma semaine » : on tape ce qu'on connaît (« Fitness Park »,
 * « Carrefour », « mairie de Pantin », une adresse) et on obtient d'abord ce qui est près de
 * chez soi. Deux sources publiques, interrogées depuis le navigateur :
 *  - Photon (komoot, données OpenStreetMap) : lieux par leur nom, classés autour d'un point ;
 *  - Géoplateforme de l'IGN : adresses et communes, la référence pour une adresse exacte.
 */
import { haversine } from "./roadGraph";

const PHOTON = "https://photon.komoot.io/api/";
const IGN = "https://data.geopf.fr/geocodage/search";
/** France métropolitaine */
const BBOX = "-5.3,41.3,9.7,51.2";
/** Au-delà, un lieu « près de chez soi » ne l'est plus */
const NEAR_KM = 80;

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
  const params = new URLSearchParams({ q, limit: "8", lang: "fr", bbox: BBOX });
  if (near) {
    params.set("lat", String(coarse(near.lat)));
    params.set("lon", String(coarse(near.lon)));
  }
  const res = await fetch(`${PHOTON}?${params}`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? [])
    .filter((f: any) => f.properties?.countrycode === "FR")
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

/**
 * Lieux correspondant à la saisie. Avec un point de référence (domicile, travail), seuls les
 * lieux à moins de 80 km restent, du plus proche au plus loin ; une saisie qui commence par
 * un numéro est une adresse, l'IGN passe alors en tête.
 */
export async function searchPlaces(q: string, near: { lat: number; lon: number } | null, signal?: AbortSignal): Promise<FoundPlace[]> {
  const [named, addresses] = await Promise.all([
    photon(q, near, signal).catch(() => [] as FoundPlace[]),
    ign(q, near, signal).catch(() => [] as FoundPlace[]),
  ]);
  const looksLikeAddress = /^\s*\d/.test(q);
  let all = looksLikeAddress ? [...addresses, ...named] : [...named, ...addresses];
  // Doublons (même lieu dans les deux sources, à 50 m près)
  all = all.filter((p, i) => all.findIndex((o) => haversine(o.lat, o.lon, p.lat, p.lon) < 50) === i);
  if (!near) return all.slice(0, 6);
  return all
    .map((p) => ({ ...p, d: haversine(near.lat, near.lon, p.lat, p.lon) }))
    .filter((p) => p.d! <= NEAR_KM * 1000)
    .sort((a, b) => (looksLikeAddress ? 0 : a.d! - b.d!))
    .slice(0, 6);
}
