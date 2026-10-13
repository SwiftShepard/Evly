/**
 * Tracé routier précis des petits trajets de la semaine (domicile → courses…),
 * demandé au serveur Valhalla public de FOSSGIS (OpenStreetMap, Allemagne), sans clé.
 * Limité à 150 km par ce serveur : au-delà, ou s'il ne répond pas, on garde
 * le tracé approximatif des grands axes calculé localement.
 */

const ENDPOINT = "https://valhalla1.openstreetmap.de/route";

export interface RouteShape {
  km: number;
  /** Durée en minutes */
  minutes: number;
  coords: [number, number][];
}

const cache = new Map<string, Promise<RouteShape | null>>();

/** Polyligne encodée à 6 décimales (format Valhalla) */
function decode(str: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  while (i < str.length) {
    for (const axis of [0, 1]) {
      let shift = 0;
      let result = 0;
      let b: number;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lon += delta;
    }
    out.push([lon / 1e6, lat / 1e6]);
  }
  return out;
}

const departures = new Map<string, Promise<{ lat: number; lon: number }>>();

/**
 * Point de départ unique d'une adresse : le point de la route la plus proche, calculé une fois.
 * Sans lui, le serveur accroche une adresse vague (rue entière, commune) à des tronçons
 * différents selon la destination, et les trajets partent de deux bouts de la rue.
 */
export function departurePoint(home: { lat: number; lon: number }): Promise<{ lat: number; lon: number }> {
  const key = `${home.lat.toFixed(5)},${home.lon.toFixed(5)}`;
  let p = departures.get(key);
  if (!p) {
    p = fetch(ENDPOINT.replace("/route", "/locate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations: [{ lat: home.lat, lon: home.lon, radius: 120 }], costing: "auto", verbose: true }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        type Edge = {
          correlated_lat: number;
          correlated_lon: number;
          distance: number;
          edge_info?: { names?: string[] };
          edge?: { classification?: { classification?: string } };
        };
        const edges: Edge[] = [...(data?.[0]?.edges ?? [])].sort((a: Edge, b: Edge) => a.distance - b.distance);
        // La rue nommée la plus proche plutôt qu'une voie de service (accès de parking, cour)
        const street = edges.find((e) => e.edge_info?.names?.length && e.edge?.classification?.classification !== "service_other");
        const best = street ?? edges[0];
        return best ? { lat: best.correlated_lat, lon: best.correlated_lon } : home;
      })
      .catch(() => home);
    departures.set(key, p);
  }
  return p;
}

export function roadRoute(from: { lat: number; lon: number }, to: { lat: number; lon: number }): Promise<RouteShape | null> {
  const key = [from.lat, from.lon, to.lat, to.lon].map((v) => v.toFixed(5)).join(",");
  let p = cache.get(key);
  if (!p) {
    p = fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [
          { lat: from.lat, lon: from.lon },
          { lat: to.lat, lon: to.lon },
        ],
        costing: "auto",
        directions_type: "none",
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const leg = data?.trip?.legs?.[0];
        if (!leg) return null;
        return { km: leg.summary.length, minutes: leg.summary.time / 60, coords: decode(leg.shape) };
      })
      .catch(() => null);
    cache.set(key, p);
  }
  return p;
}
