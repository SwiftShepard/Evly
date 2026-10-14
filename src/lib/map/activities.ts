/**
 * Recherche par activité (« basket », « padel », « piscine », « salle de muscu ») dans les
 * équipements sportifs d'OpenStreetMap, en tuiles statiques (public/carte/activites, générées
 * par scripts/map/build-places.py). Un nom de lieu ne dit pas qu'on y joue au basket ; le
 * sport de l'équipement, si. Rien ne part vers un service extérieur.
 */
import { url } from "@/lib/url";
import { haversine } from "./roadGraph";
import type { FoundPlace } from "./search";

const TILE = 0.2;

/** Mots tapés -> sports OpenStreetMap, et nom de l'activité pour les libellés */
const ACTIVITIES: { words: string[]; sports: string[]; label: string }[] = [
  { words: ["basket", "basketball", "basket ball"], sports: ["basketball"], label: "basket" },
  { words: ["foot", "football", "futsal", "five"], sports: ["soccer", "futsal"], label: "foot" },
  { words: ["rugby"], sports: ["rugby", "rugby_union", "rugby_league"], label: "rugby" },
  { words: ["hand", "handball"], sports: ["handball"], label: "hand" },
  { words: ["volley", "volleyball", "beach volley"], sports: ["volleyball", "beachvolleyball"], label: "volley" },
  { words: ["tennis"], sports: ["tennis"], label: "tennis" },
  { words: ["padel"], sports: ["padel"], label: "padel" },
  { words: ["badminton"], sports: ["badminton"], label: "badminton" },
  { words: ["squash"], sports: ["squash"], label: "squash" },
  { words: ["ping pong", "tennis de table"], sports: ["table_tennis"], label: "tennis de table" },
  { words: ["piscine", "natation", "nager", "nage", "aquagym"], sports: ["swimming"], label: "natation" },
  { words: ["muscu", "musculation", "fitness", "salle de sport", "crossfit", "cardio"], sports: ["fitness", "crossfit", "weightlifting"], label: "fitness" },
  { words: ["yoga", "pilates"], sports: ["yoga", "pilates"], label: "yoga" },
  { words: ["danse", "dance"], sports: ["dance"], label: "danse" },
  { words: ["judo"], sports: ["judo"], label: "judo" },
  { words: ["karate"], sports: ["karate"], label: "karaté" },
  { words: ["boxe"], sports: ["boxing", "kickboxing", "muay_thai"], label: "boxe" },
  { words: ["arts martiaux", "taekwondo", "aikido", "jujitsu", "jiu jitsu"], sports: ["martial_arts", "judo", "karate", "taekwondo", "aikido", "jiu-jitsu"], label: "arts martiaux" },
  { words: ["escrime"], sports: ["fencing"], label: "escrime" },
  { words: ["escalade", "grimpe", "bloc"], sports: ["climbing"], label: "escalade" },
  { words: ["golf"], sports: ["golf"], label: "golf" },
  { words: ["equitation", "cheval", "poney", "centre equestre"], sports: ["equestrian"], label: "équitation" },
  { words: ["petanque", "boules"], sports: ["boules", "petanque"], label: "pétanque" },
  { words: ["skate", "skatepark"], sports: ["skateboard"], label: "skate" },
  { words: ["athletisme", "running", "course a pied", "piste"], sports: ["athletics", "running"], label: "athlétisme" },
  { words: ["patinoire", "patin", "patinage"], sports: ["ice_skating", "skating"], label: "patinage" },
  { words: ["hockey"], sports: ["hockey", "ice_hockey", "field_hockey"], label: "hockey" },
  { words: ["bowling"], sports: ["bowling", "10pin"], label: "bowling" },
  { words: ["tir a l arc"], sports: ["archery"], label: "tir à l'arc" },
  { words: ["gym", "gymnastique"], sports: ["gymnastics"], label: "gymnastique" },
  { words: ["velo", "cyclisme", "bmx", "vtt"], sports: ["cycling", "bmx", "mtb"], label: "vélo" },
  { words: ["baseball"], sports: ["baseball", "softball"], label: "baseball" },
  { words: ["aviron"], sports: ["rowing"], label: "aviron" },
  { words: ["canoe", "kayak"], sports: ["canoe"], label: "canoë-kayak" },
  { words: ["voile"], sports: ["sailing"], label: "voile" },
  { words: ["surf"], sports: ["surfing"], label: "surf" },
];

/** Type d'équipement -> libellé (avec l'activité pour les lieux sans nom) */
const KIND_LABEL: Record<string, string> = {
  terrain: "Terrain",
  gymnase: "Gymnase",
  centre: "Centre sportif",
  stade: "Stade",
  piscine: "Piscine",
  salle: "Salle de sport",
  patinoire: "Patinoire",
  golf: "Golf",
  equitation: "Centre équestre",
  bowling: "Bowling",
  danse: "École de danse",
  piste: "Piste",
  escalade: "Salle d'escalade",
  club: "Club",
};

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Activité reconnue dans la saisie (« basket », « club de basket », « salle de muscu »), ou null */
export function matchActivity(q: string) {
  const text = ` ${norm(q)} `;
  let best: (typeof ACTIVITIES)[number] | null = null;
  let len = 0;
  for (const a of ACTIVITIES)
    for (const w of a.words)
      if (text.includes(` ${w} `) && w.length > len) {
        best = a;
        len = w.length;
      }
  return best;
}

/** La saisie n'est qu'une activité (« padel », « salle de muscu ») et pas un nom (« Fitness Park ») */
export function isPureActivity(q: string) {
  const text = norm(q).replace(/^(un |une |le |la |les |du |de la |des )/, "").replace(/^(club|terrain|salle|cours|centre) (de |d )?/, "");
  return ACTIVITIES.some((a) => a.words.includes(text));
}

const cache = new Map<string, Promise<unknown[]>>();
function tile(key: string): Promise<unknown[]> {
  let p = cache.get(key);
  if (!p) {
    p = fetch(url(`/carte/activites/${key}.json`))
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
    cache.set(key, p);
  }
  return p;
}

async function around(lat: number, lon: number, radiusKm: number, sports: string[]) {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const keys: string[] = [];
  for (let i = Math.floor((lat - dLat) / TILE); i <= Math.floor((lat + dLat) / TILE); i++)
    for (let j = Math.floor((lon - dLon) / TILE); j <= Math.floor((lon + dLon) / TILE); j++) keys.push(`${i}_${j}`);
  const tiles = await Promise.all(keys.map(tile));
  const out: { name: string; sports: string[]; kind: string; lat: number; lon: number; d: number }[] = [];
  for (const items of tiles)
    for (const [la, lo, name, sp, kind] of items as [number, number, string, string, string][]) {
      const list = sp.split(";");
      if (!list.some((x) => sports.includes(x))) continue;
      const d = haversine(lat, lon, la / 1e4, lo / 1e4);
      if (d <= radiusKm * 1000) out.push({ name, sports: list, kind, lat: la / 1e4, lon: lo / 1e4, d });
    }
  return out;
}

/**
 * Équipements où l'on pratique l'activité, autour du point : ceux qui ont un nom (gymnase,
 * club, complexe) passent un peu devant les terrains anonymes à distance comparable.
 */
export async function activityPlaces(q: string, near: { lat: number; lon: number }): Promise<FoundPlace[]> {
  const a = matchActivity(q);
  if (!a) return [];
  let found = await around(near.lat, near.lon, 20, a.sports);
  if (found.length < 3) found = await around(near.lat, near.lon, 50, a.sports);
  const score = (p: (typeof found)[number]) => p.d * (p.name ? 1 : 1.6);
  return found
    .sort((x, y) => score(x) - score(y))
    .slice(0, 8)
    .map((p) => {
      const kind = KIND_LABEL[p.kind] ?? "Équipement sportif";
      const generic = p.kind === "terrain" ? `Terrain de ${a.label}` : `${kind} (${a.label})`;
      return {
        label: p.name || generic,
        detail: p.name ? `${kind} · ${a.label}` : "Sans nom sur OpenStreetMap",
        lat: p.lat,
        lon: p.lon,
        d: p.d,
      };
    });
}
