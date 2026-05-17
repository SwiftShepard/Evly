import { useMemo, type ReactNode } from "react";
import type { Vehicle, VehicleConfiguration } from "@/data/schemas";

interface Props {
  vehicle: Vehicle;
  activeConfigId: string;
  onConfigChange: (configId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Sélecteur de configuration compact : batterie → finition → jantes.
 * Les options indisponibles sont désactivées.
 */
export default function ConfigSelector({
  vehicle,
  activeConfigId,
  onConfigChange,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const configs = vehicle.configurations;

  // Extract unique dimension values
  const batteries = useMemo(
    () => [...new Set(configs.map((c) => c.battery))],
    [configs]
  );
  const activeConfig = configs.find((c) => c.id === activeConfigId);
  const activeBattery = activeConfig?.battery ?? batteries[0]!;

  // Trims available for active battery
  const trimsForBattery = useMemo(
    () => [...new Set(configs.filter((c) => c.battery === activeBattery).map((c) => c.trim))],
    [configs, activeBattery]
  );
  const activeTrim = activeConfig?.trim ?? trimsForBattery[0]!;

  // Wheel sizes for active battery + trim
  const wheelsForTrimBattery = useMemo(
    () => [...new Set(
      configs
        .filter((c) => c.battery === activeBattery && c.trim === activeTrim)
        .map((c) => c.wheelSize_inches)
    )].sort((a, b) => a - b),
    [configs, activeBattery, activeTrim]
  );
  const activeWheels = activeConfig?.wheelSize_inches ?? wheelsForTrimBattery[0]!;

  // Find config matching current selections
  const findConfig = (battery: string, trim: string, wheels: number) =>
    configs.find(
      (c) => c.battery === battery && c.trim === trim && c.wheelSize_inches === wheels
    );

  // Check if a trim is available for a given battery
  const isTrimAvailable = (battery: string, trim: string) =>
    configs.some((c) => c.battery === battery && c.trim === trim);

  // Check if a battery/trim has a known price
  const isBatteryPriced = (battery: string) =>
    configs.some((c) => c.battery === battery && c.price_EUR !== null);
  const isTrimPriced = (battery: string, trim: string) =>
    configs.some((c) => c.battery === battery && c.trim === trim && c.price_EUR !== null);

  // Handle battery change — try to keep trim + wheels, fallback to first available
  const handleBatteryChange = (battery: string) => {
    let cfg = findConfig(battery, activeTrim, activeWheels);
    if (!cfg) {
      const availTrims = [...new Set(configs.filter((c) => c.battery === battery).map((c) => c.trim))];
      const fallbackTrim = availTrims.includes(activeTrim) ? activeTrim : availTrims[0]!;
      const availWheels = [...new Set(
        configs.filter((c) => c.battery === battery && c.trim === fallbackTrim).map((c) => c.wheelSize_inches)
      )];
      cfg = findConfig(battery, fallbackTrim, availWheels[0]!);
    }
    if (cfg) onConfigChange(cfg.id);
  };

  const handleTrimChange = (trim: string) => {
    let cfg = findConfig(activeBattery, trim, activeWheels);
    if (!cfg) {
      const availWheels = [...new Set(
        configs.filter((c) => c.battery === activeBattery && c.trim === trim).map((c) => c.wheelSize_inches)
      )];
      cfg = findConfig(activeBattery, trim, availWheels[0]!);
    }
    if (cfg) onConfigChange(cfg.id);
  };

  const handleWheelsChange = (wheels: number) => {
    const cfg = findConfig(activeBattery, activeTrim, wheels);
    if (cfg) onConfigChange(cfg.id);
  };

  const allTrims = useMemo(
    () => [...new Set(configs.map((c) => c.trim))],
    [configs]
  );

  // Build battery labels dynamically:
  //  - "long-range" → vehicle.usableCapacity_kWh (root = LR reference)
  //  - "standard"   → smallest unique kWh value found in trims.batteryUsed
  const batteryLabels = useMemo(() => {
    const result: Record<string, string> = {};
    const lrKwh = Math.round(vehicle.usableCapacity_kWh);

    // Parse all unique capacities from trims (handles "40 kWh", "58,3 kWh", "81,4 kWh"…)
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

    for (const battery of batteries) {
      if (battery === "long-range") {
        result[battery] = `Long Range ${lrKwh}`;
      } else {
        // Standard = smallest capacity strictly below LR, or fallback to smallest
        const stdKwh = uniqueKwh.find((k) => k < lrKwh) ?? uniqueKwh[0];
        result[battery] = stdKwh ? `Standard ${stdKwh}` : "Standard";
      }
    }
    return result;
  }, [batteries, vehicle.usableCapacity_kWh, vehicle.trims]);

  return (
    <div className="flex flex-col gap-2">
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center justify-between gap-2 py-1.5 text-left"
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--color-text-faint)" }}
          >
            Configuration
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              color: "var(--color-text-faint)",
              transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 300ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      <div
        style={{
          overflow: "hidden",
          maxHeight: collapsed ? "0px" : "300px",
          opacity: collapsed ? 0 : 1,
          transition:
            "max-height 400ms cubic-bezier(0.16,1,0.3,1), opacity 300ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div className="flex flex-col gap-3 pb-3">
          {/* Battery */}
          {batteries.length > 1 && (
            <SegmentedControl
              label="Batterie"
              options={batteries.map((b) => {
                const priced = isBatteryPriced(b);
                return {
                  value: b,
                  label: batteryLabels[b] ?? b,
                  disabled: !priced,
                  tooltip: !priced ? "Prix non communiqué" : undefined,
                };
              })}
              value={activeBattery}
              onChange={handleBatteryChange}
            />
          )}

          {/* Trim */}
          {allTrims.length > 1 && (
            <SegmentedControl
              label="Finition"
              options={allTrims.map((t) => {
                const available = isTrimAvailable(activeBattery, t);
                const priced = available && isTrimPriced(activeBattery, t);
                return {
                  value: t,
                  label: t,
                  disabled: !available || !priced,
                  tooltip: available && !priced ? "Prix non communiqué" : undefined,
                };
              })}
              value={activeTrim}
              onChange={handleTrimChange}
            />
          )}

          {/* Wheels */}
          {wheelsForTrimBattery.length > 1 && (
            <SegmentedControl
              label="Jantes"
              options={wheelsForTrimBattery.map((w) => ({
                value: String(w),
                label: `${w}"`,
                disabled: false,
              }))}
              value={String(activeWheels)}
              onChange={(v) => handleWheelsChange(Number(v))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Segmented control — composant interne                             */
/* ---------------------------------------------------------------- */

interface SegmentOption {
  value: string;
  label: string;
  disabled: boolean;
  tooltip?: string;
}

function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="font-mono text-[10px] uppercase tracking-[0.14em]"
        style={{ color: "var(--color-text-faint)" }}
      >
        {label}
      </span>
      <div
        className="flex gap-1 p-0.5 rounded-lg"
        style={{ backgroundColor: "var(--color-bg-subtle)" }}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={opt.disabled}
              onClick={() => !opt.disabled && onChange(opt.value)}
              className="flex-1 py-1.5 px-2 text-center text-xs font-medium rounded-md transition-all duration-200"
              title={opt.disabled ? (opt.tooltip ?? "Configuration non disponible au catalogue") : undefined}
              style={{
                backgroundColor: isActive ? "var(--color-surface-elevated)" : "transparent",
                color: opt.disabled
                  ? "var(--color-text-faint)"
                  : isActive
                    ? "var(--color-text)"
                    : "var(--color-text-muted)",
                boxShadow: isActive
                  ? "0 1px 3px rgba(0,0,0,0.1), 0 0 0 0.5px var(--color-border)"
                  : "none",
                opacity: opt.disabled ? 0.4 : 1,
                cursor: opt.disabled ? "not-allowed" : "pointer",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
