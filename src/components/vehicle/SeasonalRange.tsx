import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Building2, Route, Gauge, Snowflake, type LucideIcon } from "lucide-react";
import { readTrip, onTripChange, weekNeed, TRIP_DAYS, type Trip } from "@/lib/trip";
import { tweenNumber } from "@/lib/tween";

/**
 * Autonomie par usage : une règle par usage (ville, mixte, autoroute, hiver) sur une échelle commune,
 * dans le vocabulaire de la règle d'autonomie : réel en plein, promesse WLTP non tenue en lime hachuré,
 * repères alignés « WLTP annoncée » et « votre semaine » (Mon trajet).
 * Suit la santé de la batterie et la température choisies dans la barre latérale.
 * Styles : .usage-chart dans global.css.
 */

interface Props {
  urban: number;
  mixed: number;
  highway: number;
  winter: number;
  /** Autonomie annoncée WLTP de la version */
  wltp: number;
  vehicleName: string;
}

type Kind = "urban" | "mixed" | "highway" | "winter";

const ROWS: { kind: Kind; label: string; hint: string; where: string; Icon: LucideIcon }[] = [
  { kind: "urban", label: "Ville", hint: "30 à 50 km/h", where: "en ville", Icon: Building2 },
  { kind: "mixed", label: "Mixte", hint: "ville et route, la référence", where: "en mixte", Icon: Route },
  { kind: "highway", label: "Autoroute", hint: "130 km/h stabilisés", where: "sur autoroute", Icon: Gauge },
  { kind: "winter", label: "Hiver", hint: "-5 °C, usage mixte", where: "en hiver", Icon: Snowflake },
];

/** « a », « a et b », « a, b et c » */
const joinFr = (parts: string[]) =>
  parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;

export default function SeasonalRange({ urban, mixed, highway, winter, wltp, vehicleName }: Props) {
  const [soh, setSoh] = useState(100);
  const [tempMultiplier, setTempMultiplier] = useState(1.0);
  // Lu après l'hydratation (localStorage) : le rendu serveur reste sans repère de trajet
  const [trip, setTrip] = useState<Trip | null>(null);
  const valueRefs = useRef<Record<Kind, HTMLElement | null>>({ urban: null, mixed: null, highway: null, winter: null });

  useEffect(() => {
    const sohHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.soh === "number") setSoh(detail.soh);
    };
    const tempHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.tempMultiplier === "number") setTempMultiplier(detail.tempMultiplier);
    };
    window.addEventListener("soh-changed", sohHandler);
    window.addEventListener("temperature-changed", tempHandler);
    setTrip(readTrip());
    const stopTrip = onTripChange(setTrip);
    return () => {
      window.removeEventListener("soh-changed", sohHandler);
      window.removeEventListener("temperature-changed", tempHandler);
      stopTrip();
    };
  }, []);

  // Santé et température s'appliquent à tout, sauf l'hiver (déjà mesuré à -5 °C)
  const factor = (soh / 100) * tempMultiplier;
  const values: Record<Kind, number> = {
    urban: Math.round(urban * factor),
    mixed: Math.round(mixed * factor),
    highway: Math.round(highway * factor),
    winter: Math.round(winter * (soh / 100)),
  };

  // Repère « votre semaine » : les usages où une charge ne couvre pas les trajets de la semaine
  const need = trip ? weekNeed(trip) : null;
  const short = need !== null ? ROWS.filter((r) => values[r.kind] < need) : [];

  // Échelle fixe pour la fiche (indépendante des curseurs) : les règles glissent, l'axe ne bouge pas
  const scale = Math.ceil((Math.max(wltp, urban, mixed, highway) * 1.08) / 100) * 100;
  const step = scale > 800 ? 200 : 100;
  const ticks = Array.from({ length: Math.floor(scale / step) + 1 }, (_, i) => i * step);

  // Les chiffres défilent quand la santé, la température ou la version changent
  useEffect(() => {
    (Object.keys(values) as Kind[]).forEach((k) => {
      const el = valueRefs.current[k];
      if (el) tweenNumber(el, values[k], { duration: 420 });
    });
  }, [values.urban, values.mixed, values.highway, values.winter]);

  const chartStyle = { "--scale": scale, "--wltp": wltp, "--need": need ?? 0 } as CSSProperties;

  return (
    <div
      className="usage-chart"
      style={chartStyle}
      data-need={need !== null ? "" : undefined}
      role="group"
      aria-label={`Autonomie réelle du ${vehicleName} par usage, pour ${wltp} km annoncés en WLTP`}
    >
      {ROWS.map(({ kind, label, hint, Icon }, i) => {
        const v = values[kind];
        const rowStyle = { "--v": v, "--i": i } as CSSProperties;
        return (
          <div
            key={kind}
            className="usage-row"
            data-kind={kind}
            data-short={v < wltp ? "" : undefined}
            data-fit={need !== null ? (v >= need ? "1" : "0") : undefined}
            style={rowStyle}
          >
            <div className="usage-label">
              <span className="usage-icon" aria-hidden="true"><Icon size={16} strokeWidth={2} /></span>
              <span className="min-w-0">
                <b>{label}</b>
                <small>{hint}</small>
              </span>
            </div>
            <div className="usage-track" aria-hidden="true">
              <span className="usage-fill" />
              <span className="usage-promise" />
              <span className="usage-mark usage-mark-wltp" />
              <span className="usage-mark usage-mark-need" />
            </div>
            <p className="usage-value">
              <b ref={(el) => { valueRefs.current[kind] = el; }}>{v}</b> km
            </p>
          </div>
        );
      })}

      <div className="usage-ticks-row" aria-hidden="true">
        <div className="usage-ticks">
          {ticks.map((t) => (
            <span key={t} className="usage-tick" style={{ left: `${(t / scale) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="usage-legend">
        <span><i className="rail-key rail-key-real" aria-hidden="true" />Autonomie réelle</span>
        <span><i className="rail-key rail-key-promise" aria-hidden="true" />Promis, jamais parcouru</span>
        <span><i className="usage-key-wltp" aria-hidden="true" />WLTP annoncée : {wltp} km</span>
        {trip && need !== null && (
          <span className="usage-legend-trip">
            <i className="usage-key-need" aria-hidden="true" />
            <span>
              Votre semaine ({TRIP_DAYS} × {trip.dailyKm} km) : {need} km,{" "}
              {short.length === 0 ? (
                "une charge suffit dans les quatre usages"
              ) : short.length === ROWS.length ? (
                <em>une charge ne suffit dans aucun usage</em>
              ) : (
                <em>une charge ne suffit pas {joinFr(short.map((r) => r.where))}</em>
              )}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
