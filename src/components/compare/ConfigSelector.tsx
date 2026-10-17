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
 * Sélecteur de configuration compact, en deux temps : batterie, puis finition (seulement celles
 * qui existent avec cette batterie), puis jantes. La batterie se lit dans la capacité de la
 * version, sinon dans son nom (« Evolution 40 kWh ») : une même finition déclinée en deux
 * batteries n'apparaît plus deux fois sous le même nom.
 */
const KWH = /\s*[·-]?\s*(\d+(?:[.,]\d+)?)\s*kWh/i;

/** Batterie de la version : celle de son nom (ce que lit l'acheteur), sinon sa capacité utile */
function batteryOf(c: VehicleConfiguration): string {
  const m = `${c.trim} ${c.label}`.match(KWH);
  if (m) return m[1]!.replace(",", ".");
  return c.usableCapacity_kWh ? String(c.usableCapacity_kWh) : c.battery;
}

/** Nom de la finition, sans la batterie (« Evolution 40 kWh » -> « Evolution », « City (59 kWh · 140 kW) » -> « City (140 kW) ») */
function finishOf(c: VehicleConfiguration): string {
  return (
    c.trim
      .replace(KWH, " ")
      .replace(/\s+EV\d+$/i, "")
      .replace(/\(\s*[·,-]?\s*/g, "(")
      .replace(/\s*[·,-]?\s*\)/g, ")")
      .replace(/\(\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim() || c.trim
  );
}

const batteryLabel = (key: string) => {
  const n = Number(key);
  if (!Number.isFinite(n)) return key === "long-range" ? "Grande Autonomie" : "Standard";
  return `${String(Math.round(n * 10) / 10).replace(".", ",")} kWh`;
};

export default function ConfigSelector({
  vehicle,
  activeConfigId,
  onConfigChange,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const configs = vehicle.configurations;
  const activeConfig = configs.find((c) => c.id === activeConfigId) ?? configs[0]!;

  // Batteries, de la plus petite à la plus grande
  const batteries = useMemo(
    () =>
      [...new Set(configs.map(batteryOf))].sort((a, b) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b)),
    [configs]
  );
  const activeBattery = batteryOf(activeConfig);

  // Finitions qui existent avec la batterie choisie, dans l'ordre de la gamme
  const finishesForBattery = useMemo(
    () => [...new Set(configs.filter((c) => batteryOf(c) === activeBattery).map(finishOf))],
    [configs, activeBattery]
  );
  const activeFinish = finishOf(activeConfig);

  const wheelsForActive = useMemo(
    () =>
      [...new Set(configs.filter((c) => batteryOf(c) === activeBattery && finishOf(c) === activeFinish).map((c) => c.wheelSize_inches))].sort(
        (a, b) => a - b
      ),
    [configs, activeBattery, activeFinish]
  );
  const activeWheels = activeConfig.wheelSize_inches;

  // Nouvelle batterie : on garde la finition si elle existe, sinon la première de cette batterie
  const handleBatteryChange = (b: string) => {
    const same = configs.filter((c) => batteryOf(c) === b);
    const cfg =
      same.find((c) => finishOf(c) === activeFinish && c.wheelSize_inches === activeWheels) ??
      same.find((c) => finishOf(c) === activeFinish) ??
      same[0];
    if (cfg) onConfigChange(cfg.id);
  };

  const handleFinishChange = (f: string) => {
    const same = configs.filter((c) => batteryOf(c) === activeBattery && finishOf(c) === f);
    const cfg = same.find((c) => c.wheelSize_inches === activeWheels) ?? same[0];
    if (cfg) onConfigChange(cfg.id);
  };

  const handleWheelsChange = (w: number) => {
    const cfg = configs.find((c) => batteryOf(c) === activeBattery && finishOf(c) === activeFinish && c.wheelSize_inches === w);
    if (cfg) onConfigChange(cfg.id);
  };

  const priced = (match: (c: VehicleConfiguration) => boolean) => configs.some((c) => match(c) && c.price_EUR !== null);

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
          <svg aria-hidden="true"
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
          {batteries.length > 1 && (
            <SegmentedControl
              label="Batterie"
              options={batteries.map((b) => ({
                value: b,
                label: batteryLabel(b),
                disabled: false,
                tooltip: priced((c) => batteryOf(c) === b) ? undefined : "Tarif à venir",
              }))}
              value={activeBattery}
              onChange={handleBatteryChange}
            />
          )}

          {finishesForBattery.length > 1 && (
            <SegmentedControl
              label={batteries.length > 1 ? "Finition avec cette batterie" : "Finition"}
              options={finishesForBattery.map((f) => ({
                value: f,
                label: f,
                disabled: false,
                tooltip: priced((c) => batteryOf(c) === activeBattery && finishOf(c) === f) ? undefined : "Tarif à venir",
              }))}
              value={activeFinish}
              onChange={handleFinishChange}
            />
          )}

          {/* Wheels */}
          {wheelsForActive.length > 1 && (
            <SegmentedControl
              label="Jantes"
              options={wheelsForActive.map((w) => ({
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
          aria-label={label}
          className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg py-1.5 px-2.5 text-xs font-medium text-[var(--color-text)] focus:border-[var(--color-accent)] transition-all cursor-pointer"
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
