/**
 * Grands trajets publiés sous /trajets/{slug}/ (roadmap M5) : un axe par page, calculé au build
 * pour tout le catalogue par src/lib/roadTrips.ts. Points de départ et d'arrivée au centre des
 * villes (ou au cœur de la station), comme le ferait quelqu'un qui tape la ville.
 */

export interface TripPlace {
  name: string;
  lat: number;
  lon: number;
}

export type TripGroup = "paris" | "villes" | "ski";

export interface TripAxis {
  slug: string;
  from: TripPlace;
  to: TripPlace;
  group: TripGroup;
}

export const TRIP_GROUPS: Record<TripGroup, string> = {
  paris: "Depuis Paris",
  villes: "Entre grandes villes",
  ski: "Vers les stations de ski",
};

const P = (name: string, lat: number, lon: number): TripPlace => ({ name, lat, lon });

const PARIS = P("Paris", 48.8566, 2.3522);
const LYON = P("Lyon", 45.764, 4.8357);
const MARSEILLE = P("Marseille", 43.2965, 5.3698);
const BORDEAUX = P("Bordeaux", 44.8378, -0.5792);
const TOULOUSE = P("Toulouse", 43.6047, 1.4442);
const LILLE = P("Lille", 50.6292, 3.0573);
const NANTES = P("Nantes", 47.2184, -1.5536);
const STRASBOURG = P("Strasbourg", 48.5734, 7.7521);
const NICE = P("Nice", 43.7102, 7.262);
const MONTPELLIER = P("Montpellier", 43.6108, 3.8767);
const RENNES = P("Rennes", 48.1173, -1.6778);

const VAL_THORENS = P("Val Thorens", 45.2979, 6.58);
const CHAMONIX = P("Chamonix", 45.9237, 6.8694);
const ALPE_HUEZ = P("L'Alpe d'Huez", 45.092, 6.069);

const axis = (from: TripPlace, to: TripPlace, group: TripGroup): TripAxis => ({
  slug: `${slugify(from.name)}-${slugify(to.name)}`,
  from,
  to,
  group,
});

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const TRIP_AXES: TripAxis[] = [
  // Depuis Paris : les départs en vacances et les week-ends
  axis(PARIS, LYON, "paris"),
  axis(PARIS, MARSEILLE, "paris"),
  axis(PARIS, BORDEAUX, "paris"),
  axis(PARIS, TOULOUSE, "paris"),
  axis(PARIS, NICE, "paris"),
  axis(PARIS, MONTPELLIER, "paris"),
  axis(PARIS, NANTES, "paris"),
  axis(PARIS, RENNES, "paris"),
  axis(PARIS, LILLE, "paris"),
  axis(PARIS, STRASBOURG, "paris"),
  axis(PARIS, P("Brest", 48.3904, -4.4861), "paris"),
  axis(PARIS, P("Caen", 49.1829, -0.3707), "paris"),
  axis(PARIS, P("La Rochelle", 46.1603, -1.1511), "paris"),
  axis(PARIS, P("Biarritz", 43.4832, -1.5586), "paris"),
  axis(PARIS, P("Arcachon", 44.6586, -1.1689), "paris"),
  axis(PARIS, P("Saint-Malo", 48.6493, -2.0257), "paris"),
  axis(PARIS, P("Dijon", 47.322, 5.0415), "paris"),
  axis(PARIS, P("Clermont-Ferrand", 45.7772, 3.087), "paris"),
  axis(PARIS, P("Annecy", 45.8992, 6.1294), "paris"),
  axis(PARIS, P("Grenoble", 45.1885, 5.7245), "paris"),
  // Entre grandes villes
  axis(LYON, MARSEILLE, "villes"),
  axis(LYON, MONTPELLIER, "villes"),
  axis(LYON, NICE, "villes"),
  axis(LYON, BORDEAUX, "villes"),
  axis(LYON, STRASBOURG, "villes"),
  axis(LILLE, LYON, "villes"),
  axis(MARSEILLE, NICE, "villes"),
  axis(BORDEAUX, TOULOUSE, "villes"),
  axis(TOULOUSE, MONTPELLIER, "villes"),
  axis(NANTES, BORDEAUX, "villes"),
  axis(RENNES, NANTES, "villes"),
  // Stations de ski
  axis(PARIS, VAL_THORENS, "ski"),
  axis(PARIS, P("Courchevel", 45.4154, 6.6343), "ski"),
  axis(PARIS, P("Tignes", 45.4683, 6.906), "ski"),
  axis(PARIS, P("Les Arcs", 45.572, 6.799), "ski"),
  axis(PARIS, P("La Plagne", 45.507, 6.677), "ski"),
  axis(PARIS, ALPE_HUEZ, "ski"),
  axis(PARIS, CHAMONIX, "ski"),
  axis(PARIS, P("Les Deux Alpes", 45.011, 6.124), "ski"),
  axis(LYON, VAL_THORENS, "ski"),
  axis(LYON, CHAMONIX, "ski"),
  axis(LYON, ALPE_HUEZ, "ski"),
  axis(LILLE, VAL_THORENS, "ski"),
  axis(MARSEILLE, P("Serre Chevalier", 44.9447, 6.5594), "ski"),
  axis(TOULOUSE, P("Font-Romeu", 42.505, 2.04), "ski"),
];

export function getTripAxis(slug: string): TripAxis | undefined {
  return TRIP_AXES.find((a) => a.slug === slug);
}
