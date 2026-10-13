/**
 * Carte MapLibre de « Ma semaine » : fond OpenFreeMap (sans clé ni cookie)
 * reteinté dans la palette Evly, zones atteignables, trajets de la semaine,
 * repères des lieux et petite voiture animée.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import maplibregl, { type GeoJSONSource, type Map as MlMap, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CategoryIcon } from "./icons";
import type { Place } from "./types";

export interface ZoneLayer {
  id: string;
  rings: [number, number][][];
  fill: string;
  fillOpacity: number;
  line: string;
  dashed?: boolean;
}

export interface RouteLine {
  id: string;
  coords: [number, number][];
  /** Trajet du jour sélectionné : mis en avant */
  active: boolean;
}

export interface Pin {
  id: string;
  cat: string;
  lat: number;
  lon: number;
  label: string;
  active?: boolean;
}

export interface MapHandle {
  /** Fait rouler la voiture le long d'un tracé ; se résout à l'arrivée */
  drive: (coords: [number, number][], ms: number) => Promise<void>;
  /** Cadre un trajet (ou des points) ; se résout quand la carte est posée */
  frame: (points: [number, number][]) => Promise<void>;
  parkCar: () => void;
}

interface Props {
  home: Place | null;
  /** Du plus grand au plus petit : dessinées dans cet ordre */
  zones: ZoneLayer[];
  routes: RouteLine[];
  pins: Pin[];
  /** Ce que la carte cadre quand les données changent */
  frame: "zones" | "week";
  /** Cadrage automatique sur le jour choisi (coupé pendant la lecture, qui cadre chaque trajet) */
  autoFrame?: boolean;
  /** Largeur couverte à gauche par le volet des réglages (px), à laisser libre en cadrant */
  leftInset?: () => number;
  className?: string;
}

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const FRANCE: [[number, number], [number, number]] = [[-5.2, 41.3], [9.6, 51.1]];
const EMPTY = { type: "FeatureCollection" as const, features: [] };

/** Fond de carte reteint dans la palette (terre olive pâle, eau gris-vert, libellés doux), avant affichage */
async function loadStyle(): Promise<StyleSpecification | string> {
  try {
    const style = (await (await fetch(STYLE)).json()) as StyleSpecification;
    for (const layer of style.layers) {
      const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {});
      const id = layer.id;
      if (layer.type === "background") paint["background-color"] = "#eef1e7";
      else if (layer.type === "fill") {
        if (id === "water") paint["fill-color"] = "#cdd8cf";
        else if (/park|wood/.test(id)) paint["fill-color"] = "#e3e8d7";
        else if (/residential/.test(id)) paint["fill-color"] = "#e7eadf";
        else if (id === "building") {
          paint["fill-color"] = "#e5e8dc";
          paint["fill-outline-color"] = "#dadfce";
        }
      } else if (layer.type === "line") {
        if (id === "waterway") paint["line-color"] = "#c3cfc4";
        else if (/boundary/.test(id)) paint["line-color"] = "#bcc5ab";
        else if (/casing/.test(id)) paint["line-color"] = "#d6dcc9";
        else if (/subtle/.test(id)) paint["line-color"] = "rgba(188, 197, 171, 0.6)";
        else if (/inner|highway_minor|highway_path/.test(id)) paint["line-color"] = "#fbfcf7";
        else if (/railway/.test(id) && !/dash/.test(id)) paint["line-color"] = "#d8dec9";
      } else if (layer.type === "symbol") {
        paint["text-color"] = /water/.test(id) ? "#5b7a77" : /city|town|country/.test(id) ? "#2b3524" : "#4a5442";
        paint["text-halo-color"] = "#f4f6ee";
      }
    }
    return style;
  } catch {
    return STYLE;
  }
}

const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Longueurs cumulées d'un tracé (en degrés « aplatis », suffisant pour interpoler) */
function cumulative(coords: [number, number][]) {
  const out = [0];
  for (let i = 1; i < coords.length; i++) {
    const [x1, y1] = coords[i - 1]!;
    const [x2, y2] = coords[i]!;
    const k = Math.cos((y2 * Math.PI) / 180);
    out.push(out[i - 1]! + Math.hypot((x2 - x1) * k, y2 - y1));
  }
  return out;
}

const MapView = forwardRef<MapHandle, Props>(function MapView({ home, zones, routes, pins, frame, autoFrame = true, leftInset, className = "" }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MlMap | null>(null);
  const homeMarker = useRef<maplibregl.Marker | null>(null);
  const pinMarkers = useRef<{ marker: maplibregl.Marker; root: Root }[]>([]);
  const car = useRef<maplibregl.Marker | null>(null);
  const frameRequest = useRef(0);
  const latest = useRef({ zones, routes });
  latest.current = { zones, routes };
  const inset = useRef(leftInset);
  inset.current = leftInset;
  const pad = (m: MlMap, timeline: boolean) => framePadding(m, timeline, inset.current?.() ?? 0);

  useEffect(() => {
    let m: MlMap | null = null;
    let cancelled = false;
    loadStyle().then((style) => {
      if (cancelled) return;
      m = new maplibregl.Map({
        container: box.current!,
        style,
        bounds: FRANCE,
        fitBoundsOptions: { padding: 20 },
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        cooperativeGestures: matchMedia("(pointer: coarse)").matches,
      });
      m.touchZoomRotate.disableRotation();
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      // Crédits repliés derrière le bouton « i » : dépliés, ils masquaient le bas de la carte sur mobile
      const fold = () => m!.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      m.once("load", fold);
      m.once("style.load", () => {
        fold();
        addLayers(m!);
        setZones(m!, latest.current.zones);
        setRoutes(m!, latest.current.routes);
        setMap(m);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRequest.current);
      m?.remove();
      setMap(null);
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      drive(coords, ms) {
        cancelAnimationFrame(frameRequest.current);
        if (!map || coords.length < 2) return Promise.resolve();
        if (!car.current) {
          const el = document.createElement("div");
          el.className = "week-car";
          car.current = new maplibregl.Marker({ element: el }).setLngLat(coords[0]!).addTo(map);
        }
        const marker = car.current;
        if (reducedMotion()) {
          marker.setLngLat(coords[coords.length - 1]!);
          return Promise.resolve();
        }
        const cum = cumulative(coords);
        const total = cum[cum.length - 1]! || 1;
        let lastCheck = 0;
        return new Promise<void>((resolve) => {
          const t0 = performance.now();
          let seg = 1;
          const step = (now: number) => {
            const t = Math.min(1, (now - t0) / ms);
            // Démarre et freine en douceur, comme une voiture
            const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
            const target = e * total;
            while (seg < cum.length - 1 && cum[seg]! < target) seg++;
            const span = cum[seg]! - cum[seg - 1]! || 1;
            const k = Math.min(1, Math.max(0, (target - cum[seg - 1]!) / span));
            const a = coords[seg - 1]!;
            const b = coords[seg]!;
            const pos: [number, number] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
            marker.setLngLat(pos);
            // Suivi : si la voiture s'approche du bord (ou passe sous la frise), la carte la recentre
            if (now - lastCheck > 250 && !map.isMoving()) {
              lastCheck = now;
              const px = map.project(pos);
              const { clientWidth: w, clientHeight: h } = map.getContainer();
              const margins = pad(map, true);
              if (px.x < margins.left || px.x > w - margins.right || px.y < margins.top || px.y > h - margins.bottom)
                map.easeTo({ center: pos, duration: 700, easing: (x) => 1 - (1 - x) ** 3 });
            }
            if (t < 1) frameRequest.current = requestAnimationFrame(step);
            else resolve();
          };
          frameRequest.current = requestAnimationFrame(step);
        });
      },
      frame(points) {
        if (!map || !points.length) return Promise.resolve();
        const bounds = new maplibregl.LngLatBounds();
        for (const p of points) bounds.extend(p);
        const cam = map.cameraForBounds(bounds, { padding: pad(map, true), maxZoom: 15 });
        if (!cam) return Promise.resolve();
        const center = maplibregl.LngLat.convert(cam.center!);
        // Déjà cadré (même trajet le matin et le soir) : on ne bouge pas
        if (Math.abs((cam.zoom ?? 0) - map.getZoom()) < 0.25 && map.project(center).dist(map.project(map.getCenter())) < 40) return Promise.resolve();
        if (reducedMotion()) {
          map.jumpTo(cam);
          return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
          map.once("moveend", () => resolve());
          // Filet de sécurité : un déplacement interrompu n'émet pas toujours « moveend »
          setTimeout(resolve, 1400);
          map.easeTo({ ...cam, duration: 1000, easing: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2) });
        });
      },
      parkCar() {
        cancelAnimationFrame(frameRequest.current);
        car.current?.remove();
        car.current = null;
      },
    }),
    [map]
  );

  // Repère du domicile
  useEffect(() => {
    homeMarker.current?.remove();
    homeMarker.current = null;
    if (!map || !home) return;
    const el = document.createElement("div");
    el.className = "week-home-pin";
    el.setAttribute("aria-label", "Domicile");
    homeMarker.current = new maplibregl.Marker({ element: el }).setLngLat([home.lon, home.lat]).addTo(map);
    if (!latest.current.zones.length && !latest.current.routes.length)
      map.flyTo({ center: [home.lon, home.lat], zoom: 10, duration: reducedMotion() ? 0 : 900 });
  }, [map, home]);

  // Repères des lieux de la semaine
  useEffect(() => {
    for (const { marker, root } of pinMarkers.current) {
      marker.remove();
      setTimeout(() => root.unmount());
    }
    pinMarkers.current = [];
    if (!map) return;
    for (const p of pins) {
      const el = document.createElement("div");
      el.className = "week-pin";
      if (p.active) el.dataset.active = "1";
      el.title = p.label;
      const root = createRoot(el);
      root.render(<CategoryIcon cat={p.cat} size={13} />);
      pinMarkers.current.push({ marker: new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(map), root });
    }
  }, [map, pins]);

  useEffect(() => {
    if (!map) return;
    setZones(map, zones);
    if (frame === "zones") fitTo(map, zones.flatMap((z) => z.rings.flat()), 11, pad(map, false));
  }, [map, zones, frame]);

  useEffect(() => {
    if (!map) return;
    setRoutes(map, routes);
  }, [map, routes]);

  // Cadrage de la semaine : domicile et lieux, ou seulement ceux du jour choisi
  const framed = pins.some((p) => p.active) ? pins.filter((p) => p.active) : pins;
  const pinKey = framed.map((p) => `${p.lat},${p.lon}`).join("|");
  useEffect(() => {
    if (!map || frame !== "week" || !home || !autoFrame) return;
    fitTo(map, [[home.lon, home.lat], ...framed.map((p) => [p.lon, p.lat] as [number, number])], 14, pad(map, true));
  }, [map, frame, home, pinKey]);

  return <div ref={box} className={`week-map ${className}`} />;
});

export default MapView;

/** Zones sous les libellés de villes, trajets au-dessus */
function addLayers(m: MlMap) {
  const firstSymbol = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
  m.addSource("zones", { type: "geojson", data: EMPTY });
  m.addSource("routes", { type: "geojson", data: EMPTY });
  m.addLayer(
    { id: "zones-fill", type: "fill", source: "zones", paint: { "fill-color": ["get", "fill"], "fill-opacity": ["get", "fillOpacity"] } },
    firstSymbol
  );
  m.addLayer(
    {
      id: "zones-line",
      type: "line",
      source: "zones",
      filter: ["!", ["get", "dashed"]],
      paint: { "line-color": ["get", "line"], "line-width": 1.5 },
    },
    firstSymbol
  );
  m.addLayer(
    {
      id: "zones-line-dashed",
      type: "line",
      source: "zones",
      filter: ["get", "dashed"],
      paint: { "line-color": ["get", "line"], "line-width": 1.5, "line-dasharray": [2, 2] },
    },
    firstSymbol
  );
  m.addLayer({
    id: "routes-casing",
    type: "line",
    source: "routes",
    layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["case", ["get", "active"], 1, 0] },
    paint: { "line-color": "#fafbf6", "line-width": ["case", ["get", "active"], 7, 4.5], "line-opacity": ["case", ["get", "active"], 1, 0.7] },
  });
  m.addLayer({
    id: "routes-line",
    type: "line",
    source: "routes",
    layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["case", ["get", "active"], 1, 0] },
    paint: {
      "line-color": ["case", ["get", "active"], "#3a5c12", "#9fb27a"],
      "line-width": ["case", ["get", "active"], 4, 2.5],
    },
  });
}

function setZones(m: MlMap, zones: ZoneLayer[]) {
  const features = zones.flatMap((z) =>
    z.rings.map((ring) => ({
      type: "Feature" as const,
      properties: { id: z.id, fill: z.fill, fillOpacity: z.fillOpacity, line: z.line, dashed: !!z.dashed },
      geometry: { type: "Polygon" as const, coordinates: [ring] },
    }))
  );
  (m.getSource("zones") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
}

function setRoutes(m: MlMap, routes: RouteLine[]) {
  const features = routes.map((r) => ({
    type: "Feature" as const,
    properties: { id: r.id, active: r.active },
    geometry: { type: "LineString" as const, coordinates: r.coords },
  }));
  (m.getSource("routes") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
}

/**
 * Marges de cadrage. Sur ordinateur, la carte occupe tout l'écran : le header flottant
 * couvre le haut, le volet des réglages la gauche, la frise de la semaine le bas.
 */
function framePadding(m: MlMap, timeline: boolean, left: number) {
  const wide = m.getContainer().clientWidth >= 640;
  if (!wide) return { top: 32, left: 32, right: 32, bottom: 32 };
  const desktop = matchMedia("(min-width: 1024px)").matches;
  return {
    top: desktop ? 104 : 56,
    left: Math.max(56, left + 48),
    right: 72,
    // Frise et coût de l'énergie en bas de la carte
    bottom: timeline && desktop ? 290 : 56,
  };
}

function fitTo(m: MlMap, points: [number, number][], maxZoom: number, padding: ReturnType<typeof framePadding>) {
  if (!points.length) return;
  const bounds = new maplibregl.LngLatBounds();
  for (const p of points) bounds.extend(p);
  m.fitBounds(bounds, { padding, duration: reducedMotion() ? 0 : 900, maxZoom });
}
