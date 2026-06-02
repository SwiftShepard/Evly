import { useState, useMemo } from "react";
import type { Vehicle, VehicleConfiguration } from "@/data/schemas";
import ConfigSelector from "./ConfigSelector";
import ChargingSparkline from "./ChargingSparkline";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import SohSlider from "@/components/vehicle/SohSlider";
import { url } from "@/lib/url";
import { calculateCeeAid } from "@/lib/cee";
import { useUserProfile } from "@/lib/userProfile";
import { X } from "lucide-react";

// Force rescan comment update 4
const imageModules = import.meta.glob<string>(
  "/src/assets/vehicles/*.{jpeg,jpg,png,webp,avif,svg}",
  { query: "?url", import: "default", eager: true }
);

function getLocalVehicleImageUrl(slug: string): string | null {
  for (const [path, url] of Object.entries(imageModules)) {
    const stem = path.split("/").at(-1)!.replace(/\.(jpeg|jpg|png|webp|avif|svg)$/i, "");
    if (stem === slug) {
      return url;
    }
  }
  return null;
}

interface Props {
  vehicle: Vehicle;
  config: VehicleConfiguration;
  soh: number;
  bestMetrics?: {
    mixedRange?: boolean;
    wltp?: boolean;
    highway?: boolean;
    chargingPeak?: boolean;
    charging1080?: boolean;
    charging30min?: boolean;
    netPrice?: boolean;
    acceleration?: boolean;
    trunk?: boolean;
  };
  onSohChange: (soh: number) => void;
  onConfigChange: (configId: string) => void;
  onRemove: () => void;
  isMobile: boolean;
}

export default function ComparatorCard({
  vehicle,
  config,
  soh,
  bestMetrics,
  onSohChange,
  onConfigChange,
  onRemove,
  isMobile,
}: Props) {
  const { profile } = useUserProfile();

  const [configCollapsed, setConfigCollapsed] = useState(isMobile);
  const [detailsExpanded, setDetailsExpanded] = useState(!isMobile);

  // Total aids (estimation personnalisée ou aides max)
  const totalAids = useMemo(() => {
    return calculateCeeAid({
      vehicle,
      price: config.price_EUR,
      profileType: profile.hasConfigured ? profile.profileType : "particular",
      householdSize: profile.hasConfigured ? profile.householdSize : 1,
      taxIncome: profile.hasConfigured ? profile.taxIncome : 10000, // force "precarite" pour afficher l'aide max par défaut
    }).amount;
  }, [vehicle, config.price_EUR, profile]);
  const netPrice = config.price_EUR !== null ? Math.max(0, config.price_EUR - totalAids) : 0;

  // Best range test (Nyland 90 preferred)
  const bestRangeTest = useMemo(() => {
    const nyland90 = config.rangeTests.find(
      (t) => t.sourceId === "nyland" && t.speed_kmh === 90
    );
    if (nyland90) return nyland90;
    return config.rangeTests[0] ?? null;
  }, [config.rangeTests]);

  // Nyland range estimate (capacity / consumption × 100)
  const nylandRangeEstimate = useMemo(() => {
    if (!bestRangeTest || bestRangeTest.sourceId !== "nyland") return null;
    if (config.usableCapacity_kWh != null) {
      return Math.round((config.usableCapacity_kWh / bestRangeTest.consumption_kWh_100km) * 100);
    }
    const parseKwh = (s: string) => {
      const m = s.match(/(\d+(?:[.,]\d+)?)/);
      return m ? Math.round(parseFloat(m[1].replace(",", "."))) : null;
    };
    const uniqueKwh = [
      ...new Set(
        vehicle.trims
          .map((t) => parseKwh(t.batteryUsed))
          .filter((v): v is number => v !== null)
      ),
    ].sort((a, b) => a - b);
    const lrKwh = vehicle.usableCapacity_kWh;
    const capacity =
      config.battery === "long-range"
        ? lrKwh
        : (uniqueKwh.find((k) => k < lrKwh) ?? uniqueKwh[0] ?? lrKwh);
    return Math.round(
      (capacity / bestRangeTest.consumption_kWh_100km) * 100
    );
  }, [bestRangeTest, config, vehicle]);

  // Scaled ranges based on battery SoH
  const scaledMixedRange = useMemo(() => {
    const base = bestRangeTest
      ? (nylandRangeEstimate ?? bestRangeTest.range_km ?? config.realRange?.mixed_km)
      : config.realRange?.mixed_km;
    return base ? Math.round(base * soh / 100) : null;
  }, [bestRangeTest, nylandRangeEstimate, config.realRange, soh]);

  const scaledWltp = useMemo(() => {
    return config.wltp_km ? Math.round(config.wltp_km * soh / 100) : null;
  }, [config.wltp_km, soh]);

  const scaledHighway = useMemo(() => {
    return config.realRange?.highway_130_km
      ? Math.round(config.realRange.highway_130_km * soh / 100)
      : null;
  }, [config.realRange?.highway_130_km, soh]);

  const fmtPrice = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  const imageUrl = getLocalVehicleImageUrl(vehicle.slug);

  const hasAnyBest = bestMetrics && (
    bestMetrics.mixedRange ||
    bestMetrics.charging30min ||
    bestMetrics.netPrice ||
    bestMetrics.trunk
  );

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "0.5px solid var(--color-border)",
        minWidth: isMobile ? "300px" : undefined,
        scrollSnapAlign: isMobile ? "center" : undefined,
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-3 p-4 pb-2"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          backgroundColor: "var(--color-surface)",
        }}
      >
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--color-text-faint)" }}
          >
            {vehicle.brand} · {vehicle.segment.split(", ")[0]}
          </span>
          <h3
            className="text-lg font-semibold tracking-tight leading-tight"
            style={{ color: "var(--color-text)" }}
          >
            {vehicle.model}
          </h3>
          <span
            className="font-mono text-[11px] truncate"
            style={{ color: "var(--color-text-muted)" }}
          >
            {config.label}
          </span>
        </div>

        {/* Vehicle Image */}
        <div className="w-24 h-12 flex-shrink-0 flex items-end justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <svg
              className="opacity-30 w-16 h-8"
              viewBox="0 0 290 115"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M24 34 C30 78 50 82 68 82"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <rect x="8" y="22" width="16" height="24" rx="3" fill="currentColor" />
              <path d="M21 23 L17 32 H21 L12 45 L16 36 H12 Z" fill="white" stroke="none" />
              <path
                d="M 68 82 L 68 55 C 72 26 90 8 112 4 L 190 4 C 214 4 236 22 248 44 L 258 44 C 264 44 268 54 268 64 L 268 82 C 254 82 240 66 214 66 C 188 66 174 82 160 82 L 144 82 C 130 82 116 66 94 66 C 72 66 68 82 68 82 Z"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx="94"  cy="97" r="17" stroke="currentColor" strokeWidth="6" />
              <circle cx="214" cy="97" r="17" stroke="currentColor" strokeWidth="6" />
            </svg>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 p-1.5 rounded-lg transition-colors duration-200"
          style={{
            color: "var(--color-text-faint)",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-bg-subtle)";
            e.currentTarget.style.color = "var(--color-danger)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--color-text-faint)";
          }}
          aria-label={`Retirer ${vehicle.model} du comparatif`}
        >
          <X size={16} strokeWidth={1.6} />
        </button>
      </div>

      {/* Config selector */}
      {vehicle.configurations.length > 1 && (
        <div className="px-4 pb-1">
          <ConfigSelector
            vehicle={vehicle}
            activeConfigId={config.id}
            onConfigChange={onConfigChange}
            collapsed={configCollapsed}
            onToggleCollapse={() => setConfigCollapsed((c) => !c)}
          />
        </div>
      )}

      {/* SoH Slider */}
      <div className="px-4 pb-2">
        <SohSlider initialSoh={soh} onChange={onSohChange} compact />
      </div>

      {/* Winner badges row */}
      {hasAnyBest && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {bestMetrics?.mixedRange && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-[var(--color-surface-accent)] text-[var(--color-accent)] border border-[rgba(58,92,18,0.15)]"
              title="Meilleure autonomie mixte de la sélection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className="mr-0.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Autonomie
            </span>
          )}
          {bestMetrics?.charging30min && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-[var(--color-surface-accent)] text-[var(--color-accent)] border border-[rgba(58,92,18,0.15)]"
              title="Meilleure recharge de la sélection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className="mr-0.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Recharge
            </span>
          )}
          {bestMetrics?.netPrice && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-[var(--color-surface-accent)] text-[var(--color-accent)] border border-[rgba(58,92,18,0.15)]"
              title="Prix après aides le plus bas de la sélection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className="mr-0.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Meilleur Prix
            </span>
          )}
          {bestMetrics?.trunk && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-[var(--color-surface-accent)] text-[var(--color-accent)] border border-[rgba(58,92,18,0.15)]"
              title="Meilleur volume de coffre de la sélection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className="mr-0.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Coffre
            </span>
          )}
        </div>
      )}

      {/* Separator */}
      <div className="mx-4" style={{ borderTop: "0.5px solid var(--color-border)" }} />

      {/* Autonomie réelle */}
      <DataBlock label="Autonomie réelle" best={bestMetrics?.mixedRange}>
        <div className="flex items-baseline gap-2">
          <span
            className="text-3xl font-semibold tabular-nums"
            style={{
              color: "var(--color-accent)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            <AnimatedNumber
              value={scaledMixedRange}
            />
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: "var(--color-text-faint)" }}
          >
            km
          </span>
          {bestMetrics?.mixedRange && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-surface-accent)] text-[var(--color-accent)] border border-[rgba(58,92,18,0.15)] ml-1"
              title="Meilleure autonomie mixte de la sélection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </span>
          )}
        </div>
        {bestRangeTest ? (
          <span
            className="font-mono text-[10px] leading-relaxed mt-1"
            style={{ color: "var(--color-text-faint)" }}
          >
            {bestRangeTest.sourceId === "nyland"
              ? `Nyland · ${bestRangeTest.speed_kmh} km/h · ${bestRangeTest.consumption_kWh_100km.toString().replace(".", ",")} kWh/100km`
              : `${bestRangeTest.sourceId} · ${bestRangeTest.consumption_kWh_100km.toString().replace(".", ",")} kWh/100km`}
          </span>
        ) : config.realRange ? (
          <span
            className="font-mono text-[10px] mt-1"
            style={{ color: "var(--color-text-faint)" }}
          >
            Mixte mesuré · {config.realRange.confidence}
          </span>
        ) : null}
      </DataBlock>

      {/* WLTP */}
      {config.wltp_km && (
        <DataBlock label="WLTP officiel" compact best={bestMetrics?.wltp}>
          <div className="flex items-baseline gap-2">
            <span
              className="text-xl font-semibold tabular-nums"
              style={{
                color: bestMetrics?.wltp ? "var(--color-accent)" : "var(--color-text)",
                letterSpacing: "-0.02em"
              }}
            >
              <AnimatedNumber value={scaledWltp} />
            </span>
            <span className="font-mono text-[10px]" style={{ color: "var(--color-text-faint)" }}>km</span>
            {bestMetrics?.wltp && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-surface-accent)] text-[var(--color-accent)] border border-[rgba(58,92,18,0.15)] ml-1"
                title="Meilleure autonomie WLTP de la sélection"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </span>
            )}
          </div>
        </DataBlock>
      )}

      {/* Autoroute 130 */}
      {config.realRange?.highway_130_km && (
        <DataBlock label="Autoroute 130 km/h" compact best={bestMetrics?.highway}>
          <div className="flex items-baseline gap-2">
            <span
              className="text-xl font-semibold tabular-nums"
              style={{
                color: bestMetrics?.highway ? "var(--color-accent)" : "var(--color-text)",
                letterSpacing: "-0.02em"
              }}
            >
              <AnimatedNumber value={scaledHighway} />
            </span>
            <span className="font-mono text-[10px]" style={{ color: "var(--color-text-faint)" }}>km</span>
            {bestMetrics?.highway && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-surface-accent)] text-[var(--color-accent)] border border-[rgba(58,92,18,0.15)] ml-1"
                title="Meilleure autonomie autoroute de la sélection"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </span>
            )}
          </div>
        </DataBlock>
      )}

      {/* Separator */}
      <div className="mx-4" style={{ borderTop: "0.5px solid var(--color-border)" }} />

      {/* Recharge */}
      <DataBlock label="Recharge DC">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Pic" value={<AnimatedNumber value={config.chargingDC_peak_kW} />} unit="kW" best={bestMetrics?.chargingPeak} />
          <MiniStat label="10→80 %" value={<AnimatedNumber value={config.chargingDC_10_80_min} />} unit="min" best={bestMetrics?.charging1080} />
          <MiniStat label="+30 min" value={<AnimatedNumber value={config.chargingDC_kWh_30min} />} unit="kWh" best={bestMetrics?.charging30min} />
        </div>
        {config.chargingCurve && config.chargingCurve.length > 2 && (
          <div className="mt-3">
            <ChargingSparkline curve={config.chargingCurve} />
          </div>
        )}
      </DataBlock>

      {/* Separator */}
      <div className="mx-4" style={{ borderTop: "0.5px solid var(--color-border)" }} />

      {/* Prix */}
      <DataBlock label="Prix" best={bestMetrics?.netPrice}>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-semibold tabular-nums"
              style={{
                color: (bestMetrics?.netPrice && totalAids === 0) ? "var(--color-accent)" : "var(--color-text)",
                letterSpacing: "-0.02em"
              }}
            >
              <AnimatedNumber value={config.price_EUR} format={fmtPrice} />
            </span>
            {(bestMetrics?.netPrice && totalAids === 0) && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-surface-accent)] text-[var(--color-accent)] border border-[rgba(58,92,18,0.15)] ml-1"
                title="Prix le plus bas de la sélection"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </span>
            )}
          </div>
          {totalAids > 0 && (
            <>
              <span className="font-mono text-[10px]" style={{ color: "var(--color-text-faint)" }}>
                CEE max.* : −<AnimatedNumber value={totalAids} format={fmtPrice} />
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold tabular-nums" style={{ color: bestMetrics?.netPrice ? "var(--color-accent)" : "var(--color-text)" }}>
                  <AnimatedNumber value={netPrice} format={fmtPrice} />
                </span>
                <span className="font-mono text-[10px]" style={{ color: "var(--color-text-faint)" }}>
                  apres coup de pouce CEE max.*
                </span>
                {bestMetrics?.netPrice && (
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-surface-accent)] text-[var(--color-accent)] border border-[rgba(58,92,18,0.15)] ml-1"
                    title="Prix le plus bas de la sélection"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </span>
                )}
              </div>
            </>
          )}
          {config.leasingSocialEligible && config.monthlyLease_EUR && (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 mt-1 rounded text-[10px] uppercase tracking-[0.12em] font-mono self-start"
              style={{
                backgroundColor: "var(--color-surface-accent)",
                color: "var(--color-accent)",
                border: "0.5px solid color-mix(in srgb, var(--color-accent) 35%, var(--color-border-strong))",
              }}
            >
              Leasing social · <AnimatedNumber value={config.monthlyLease_EUR} /> €/mois
            </div>
          )}
        </div>
      </DataBlock>

      {/* Expandable details */}
      {!detailsExpanded && (
        <button
          type="button"
          onClick={() => setDetailsExpanded(true)}
          className="mx-4 mb-3 py-2 text-xs font-medium rounded-lg transition-colors"
          style={{
            color: "var(--color-text-muted)",
            backgroundColor: "var(--color-bg-subtle)",
          }}
        >
          Voir plus de détails
        </button>
      )}

      <div
        style={{
          overflow: "hidden",
          maxHeight: detailsExpanded ? "500px" : "0px",
          opacity: detailsExpanded ? 1 : 0,
          transition: "max-height 400ms cubic-bezier(0.16,1,0.3,1), opacity 300ms ease",
        }}
      >
        {/* Performance */}
        <DataBlock label="Performance" compact>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="0-100" value={vehicle.acceleration_0_100_s.toString().replace(".", ",")} unit="s" best={bestMetrics?.acceleration} />
            <MiniStat label="V max" value={`${vehicle.topSpeed_kmh}`} unit="km/h" />
          </div>
        </DataBlock>

        {/* Pratique */}
        <DataBlock label="Pratique" compact>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Coffre" value={`${vehicle.trunkCapacity_L}`} unit="L" best={bestMetrics?.trunk} />
            <MiniStat label="Longueur" value={(vehicle.length_mm / 1000).toFixed(2).replace(".", ",")} unit="m" />
          </div>
        </DataBlock>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 mt-auto"
        style={{ borderTop: "0.5px solid var(--color-border)" }}
      >
        <a
          href={url(`/vehicules/${vehicle.slug}?config=${config.id}${soh !== 100 ? `&soh=${soh}` : ""}`)}
          className="flex items-center justify-between gap-2 text-xs font-medium transition-colors"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-text-muted)";
          }}
        >
          Voir la fiche complète
          <span className="arrow-animate">→</span>
        </a>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Sous-composants internes                                          */
/* ---------------------------------------------------------------- */

function DataBlock({
  label,
  children,
  compact = false,
  best = false,
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
  best?: boolean;
}) {
  return (
    <div
      className="transition-all duration-300"
      style={{
        margin: best ? "6px 16px" : "0px",
        padding: best ? "12px" : (compact ? "10px 16px" : "14px 16px"),
        backgroundColor: best ? "color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))" : "transparent",
        border: best ? "1.5px solid var(--color-accent)" : "1.5px solid transparent",
        borderRadius: best ? "12px" : "0px",
      }}
    >
      <span
        className="block font-mono text-[10px] uppercase tracking-[0.14em] mb-2"
        style={{ color: best ? "var(--color-accent)" : "var(--color-text-faint)" }}
      >
        {label} {best && "★"}
      </span>
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  unit,
  best = false,
}: {
  label: string;
  value: React.ReactNode;
  unit: string;
  best?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 transition-all duration-300"
      style={{
        padding: "6px 8px",
        backgroundColor: best
          ? "color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))"
          : "var(--color-bg-subtle)",
        border: best
          ? "1.5px solid var(--color-accent)"
          : "1.5px solid var(--color-border)",
        borderRadius: "8px",
      }}
    >
      <span
        className="font-mono text-[9px] uppercase tracking-[0.14em]"
        style={{ color: best ? "var(--color-accent)" : "var(--color-text-faint)" }}
      >
        {label} {best && "★"}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className="text-base font-semibold tabular-nums"
          style={{
            color: best ? "var(--color-accent)" : "var(--color-text)",
            letterSpacing: "-0.01em"
          }}
        >
          {value}
        </span>
        <span className="font-mono text-[10px]" style={{ color: best ? "var(--color-accent)" : "var(--color-text-faint)" }}>
          {unit}
        </span>
      </div>
    </div>
  );
}
