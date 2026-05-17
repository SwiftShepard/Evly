import { useState, useMemo } from "react";
import type { Vehicle, VehicleConfiguration } from "@/data/schemas";
import ConfigSelector from "./ConfigSelector";
import ChargingSparkline from "./ChargingSparkline";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { X } from "lucide-react";

interface Props {
  vehicle: Vehicle;
  config: VehicleConfiguration;
  onConfigChange: (configId: string) => void;
  onRemove: () => void;
  isMobile: boolean;
}

export default function ComparatorCard({
  vehicle,
  config,
  onConfigChange,
  onRemove,
  isMobile,
}: Props) {
  const [configCollapsed, setConfigCollapsed] = useState(isMobile);
  const [detailsExpanded, setDetailsExpanded] = useState(!isMobile);

  // Total aids
  const totalAids = useMemo(
    () => vehicle.availableAids.reduce((sum, a) => sum + a.amount_EUR, 0),
    [vehicle.availableAids]
  );
  const netPrice = Math.max(0, config.price_EUR - totalAids);

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
    const capacity =
      config.battery === "long-range"
        ? vehicle.usableCapacity_kWh
        : 58.3; // Standard
    return Math.round(
      (capacity / bestRangeTest.consumption_kWh_100km) * 100
    );
  }, [bestRangeTest, config.battery, vehicle.usableCapacity_kWh]);

  const fmtPrice = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

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
        <div className="flex flex-col gap-1 min-w-0">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--color-text-faint)" }}
          >
            {vehicle.brand} · {vehicle.segment.split(" — ")[0]}
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

      {/* Separator */}
      <div className="mx-4" style={{ borderTop: "0.5px solid var(--color-border)" }} />

      {/* Autonomie réelle */}
      <DataBlock label="Autonomie réelle">
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
              value={
                bestRangeTest
                  ? (nylandRangeEstimate ?? bestRangeTest.range_km ?? config.realRange?.mixed_km)
                  : config.realRange?.mixed_km
              }
            />
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: "var(--color-text-faint)" }}
          >
            km
          </span>
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
        <DataBlock label="WLTP officiel" compact>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tabular-nums" style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}>
              <AnimatedNumber value={config.wltp_km} />
            </span>
            <span className="font-mono text-[10px]" style={{ color: "var(--color-text-faint)" }}>km</span>
          </div>
        </DataBlock>
      )}

      {/* Autoroute 130 */}
      {config.realRange?.highway_130_km && (
        <DataBlock label="Autoroute 130 km/h" compact>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tabular-nums" style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}>
              <AnimatedNumber value={config.realRange.highway_130_km} />
            </span>
            <span className="font-mono text-[10px]" style={{ color: "var(--color-text-faint)" }}>km</span>
          </div>
        </DataBlock>
      )}

      {/* Separator */}
      <div className="mx-4" style={{ borderTop: "0.5px solid var(--color-border)" }} />

      {/* Recharge */}
      <DataBlock label="Recharge DC">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Pic" value={<AnimatedNumber value={config.chargingDC_peak_kW} />} unit="kW" />
          <MiniStat label="10→80 %" value={<AnimatedNumber value={config.chargingDC_10_80_min} />} unit="min" />
          <MiniStat label="+30 min" value={<AnimatedNumber value={config.chargingDC_kWh_30min} />} unit="kWh" />
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
      <DataBlock label="Prix">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums" style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}>
              <AnimatedNumber value={config.price_EUR} format={fmtPrice} />
            </span>
          </div>
          {totalAids > 0 && (
            <>
              <span className="font-mono text-[10px]" style={{ color: "var(--color-text-faint)" }}>
                Aides : −<AnimatedNumber value={totalAids} format={fmtPrice} />
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold tabular-nums" style={{ color: "var(--color-accent)" }}>
                  <AnimatedNumber value={netPrice} format={fmtPrice} />
                </span>
                <span className="font-mono text-[10px]" style={{ color: "var(--color-text-faint)" }}>
                  après aides
                </span>
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
            <MiniStat label="0-100" value={vehicle.acceleration_0_100_s.toString().replace(".", ",")} unit="s" />
            <MiniStat label="V max" value={`${vehicle.topSpeed_kmh}`} unit="km/h" />
          </div>
        </DataBlock>

        {/* Pratique */}
        <DataBlock label="Pratique" compact>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Coffre" value={`${vehicle.trunkCapacity_L}`} unit="L" />
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
          href={`/vehicules/${vehicle.slug}?config=${config.id}`}
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
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`px-4 ${compact ? "py-2.5" : "py-3.5"}`}>
      <span
        className="block font-mono text-[10px] uppercase tracking-[0.14em] mb-2"
        style={{ color: "var(--color-text-faint)" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: React.ReactNode;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="font-mono text-[9px] uppercase tracking-[0.14em]"
        style={{ color: "var(--color-text-faint)" }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className="text-base font-semibold tabular-nums"
          style={{ color: "var(--color-text)", letterSpacing: "-0.01em" }}
        >
          {value}
        </span>
        <span className="font-mono text-[10px]" style={{ color: "var(--color-text-faint)" }}>
          {unit}
        </span>
      </div>
    </div>
  );
}
