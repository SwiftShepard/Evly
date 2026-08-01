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

  const activeConfig = configs.find((c) => c.id === activeConfigId) ?? configs[0]!;

  const allTrims = useMemo(
    () => [...new Set(configs.map((c) => c.trim))],
    [configs]
  );
  const hasMultipleTrims = allTrims.length > 1;

  const activeTrim = activeConfig.trim;

  // Batteries available for the active trim
  const batteriesForActiveTrim = useMemo(
    () => [...new Set(configs.filter((c) => c.trim === activeTrim).map((c) => c.battery))],
    [configs, activeTrim]
  );
  const activeBattery = activeConfig.battery;

  // All batteries
  const batteries = useMemo(
    () => [...new Set(configs.map((c) => c.battery))],
    [configs]
  );

  // Wheel sizes for active trim + battery
  const wheelsForActiveTrimBattery = useMemo(
    () => [...new Set(
      configs
        .filter((c) => c.trim === activeTrim && c.battery === activeBattery)
        .map((c) => c.wheelSize_inches)
    )].sort((a, b) => a - b),
    [configs, activeTrim, activeBattery]
  );
  const activeWheels = activeConfig.wheelSize_inches;

  // Handle trim / version change
  const handleTrimChange = (newTrim: string) => {
    let cfg = configs.find((c) => c.trim === newTrim && c.battery === activeBattery && c.wheelSize_inches === activeWheels);
    if (!cfg) cfg = configs.find((c) => c.trim === newTrim && c.battery === activeBattery);
    if (!cfg) cfg = configs.find((c) => c.trim === newTrim);
    if (cfg) onConfigChange(cfg.id);
  };

  // Handle battery change
  const handleBatteryChange = (newBattery: string) => {
    let cfg = configs.find((c) => c.trim === activeTrim && c.battery === newBattery && c.wheelSize_inches === activeWheels);
    if (!cfg) cfg = configs.find((c) => c.trim === activeTrim && c.battery === newBattery);
    if (!cfg) cfg = configs.find((c) => c.battery === newBattery);
    if (cfg) onConfigChange(cfg.id);
  };

  // Handle wheels change
  const handleWheelsChange = (newWheels: number) => {
    const cfg = configs.find((c) => c.trim === activeTrim && c.battery === activeBattery && c.wheelSize_inches === newWheels);
    if (cfg) onConfigChange(cfg.id);
  };

  const trimDisplayLabel = (trim: string) =>
    trim
      .replace(/\s+(?:EV)?\d+\s*kWh$/i, "")
      .replace(/\s+EV\d+$/i, "")
      .trim() || trim;

  const batteryLabels = useMemo(() => {
    const result: Record<string, string> = {};
    for (const battery of batteries) {
      const cfg = configs.find((c) => c.battery === battery);
      if (cfg && cfg.usableCapacity_kWh) {
        result[battery] = `${Math.round(cfg.usableCapacity_kWh)} kWh`;
      } else {
        result[battery] = battery === "long-range" ? "Grande Autonomie" : "Standard";
      }
    }
    return result;
  }, [batteries, configs]);

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
          {/* Version / Finition (Primary control when multiple trims exist) */}
          {hasMultipleTrims && (
            <SegmentedControl
              label="Version / Finition"
              options={allTrims.map((t) => {
                const cfg = configs.find((c) => c.trim === t);
                const priced = cfg ? cfg.price_EUR !== null : false;
                return {
                  value: t,
                  label: trimDisplayLabel(t),
                  disabled: false,
                  tooltip: !priced ? "Tarif à venir" : undefined,
                };
              })}
              value={activeTrim}
              onChange={handleTrimChange}
            />
          )}

          {/* Battery - show if batteries > 1 and not already distinguished by trims */}
          {(!hasMultipleTrims ? batteries.length > 1 : batteriesForActiveTrim.length > 1) && (
            <SegmentedControl
              label="Batterie"
              options={(hasMultipleTrims ? batteriesForActiveTrim : batteries).map((b) => {
                const cfg = configs.find((c) => c.battery === b && c.trim === activeTrim) ?? configs.find((c) => c.battery === b);
                const priced = cfg ? cfg.price_EUR !== null : false;
                return {
                  value: b,
                  label: batteryLabels[b] ?? b,
                  disabled: false,
                  tooltip: !priced ? "Tarif à venir" : undefined,
                };
              })}
              value={activeBattery}
              onChange={handleBatteryChange}
            />
          )}

          {/* Wheels */}
          {wheelsForActiveTrimBattery.length > 1 && (
            <SegmentedControl
              label="Jantes"
              options={wheelsForActiveTrimBattery.map((w) => ({
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
/* Segmented control, composant interne                             */
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
  const isDropdown = options.length > 4;

  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="font-mono text-[10px] uppercase tracking-[0.14em]"
        style={{ color: "var(--color-text-faint)" }}
      >
        {label}
      </span>
      {isDropdown ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg py-1.5 px-2.5 text-xs font-medium text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-all cursor-pointer"
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label} {opt.disabled ? " (Indisponible)" : ""}
            </option>
          ))}
        </select>
      ) : (
        <div
          className="flex flex-wrap gap-1 p-0.5 rounded-lg"
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
                className="flex-1 min-w-[60px] py-1.5 px-2 text-center text-xs font-medium rounded-md transition-all duration-200 truncate"
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
      )}
    </div>
  );
}
