import React, { useState, useEffect } from "react";

interface Props {
  chemistry?: string;
  initialTemp?: number;
  initialPac?: boolean;
  compact?: boolean;
}

export default function TemperatureSlider({
  chemistry = "NMC",
  initialTemp = 20,
  initialPac = true,
  compact = false,
}: Props) {
  const [temp, setTemp] = useState(initialTemp);
  const [pac, setPac] = useState(initialPac);

  // Range multiplier calculation
  const getTempMultiplier = (t: number, chem: string, hasPac: boolean) => {
    if (t >= 20 && t <= 25) return 1.0;

    if (t < 20) {
      // Heating loss (from 20C down to -10C)
      const maxHeatingLoss = hasPac ? 0.12 : 0.25;
      const heatingLoss = maxHeatingLoss * ((20 - t) / 30);

      // Battery chemistry efficiency loss (from 20C down to -10C)
      const maxChemLoss = chem === "LFP" ? 0.15 : 0.08;
      const chemLoss = maxChemLoss * ((20 - t) / 30);

      return Math.max(0.4, 1.0 - heatingLoss - chemLoss);
    } else {
      // Air conditioning loss (from 25C up to 40C)
      const maxAcLoss = 0.08;
      const acLoss = maxAcLoss * ((t - 25) / 15);
      return Math.max(0.8, 1.0 - acLoss);
    }
  };

  const multiplier = getTempMultiplier(temp, chemistry, pac);

  // Sync state with URL search params on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tempParam = params.get("temp");
      const pacParam = params.get("pac");

      let resolvedTemp = temp;
      let resolvedPac = pac;

      if (tempParam) {
        const val = parseInt(tempParam, 10);
        if (!isNaN(val) && val >= -10 && val <= 40) {
          resolvedTemp = val;
          setTemp(val);
        }
      }
      if (pacParam) {
        resolvedPac = pacParam === "true";
        setPac(resolvedPac);
      }

      // Dispatch initial values
      const mult = getTempMultiplier(resolvedTemp, chemistry, resolvedPac);
      window.dispatchEvent(
        new CustomEvent("temperature-changed", {
          detail: { temperature: resolvedTemp, hasPac: resolvedPac, tempMultiplier: mult },
        })
      );
    } catch (e) {
      // Ignore SSR issues
    }
  }, []);

  // Broadcast state changes
  useEffect(() => {
    const mult = getTempMultiplier(temp, chemistry, pac);
    window.dispatchEvent(
      new CustomEvent("temperature-changed", {
        detail: { temperature: temp, hasPac: pac, tempMultiplier: mult },
      })
    );
  }, [temp, pac, chemistry]);

  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setTemp(val);
    updateUrl(val, pac);
  };

  const handlePacToggle = () => {
    const newVal = !pac;
    setPac(newVal);
    updateUrl(temp, newVal);
  };

  const applyPreset = (presetTemp: number) => {
    setTemp(presetTemp);
    updateUrl(presetTemp, pac);
  };

  const updateUrl = (t: number, p: boolean) => {
    try {
      const urlVal = new URL(window.location.href);
      if (t === 20) {
        urlVal.searchParams.delete("temp");
      } else {
        urlVal.searchParams.set("temp", t.toString());
      }
      if (p) {
        urlVal.searchParams.delete("pac");
      } else {
        urlVal.searchParams.set("pac", "false");
      }
      window.history.replaceState(null, "", urlVal.toString());
    } catch (e) {
      // Ignore
    }
  };

  // Temperature color styling
  const getTempColor = (t: number) => {
    if (t < 10) return "text-blue-500";
    if (t <= 25) return "text-emerald-600";
    return "text-red-500";
  };

  const getPercentFill = () => {
    return ((temp - -10) / 50) * 100;
  };

  const percentFill = getPercentFill();

  return (
    <div className={`flex flex-col gap-2.5 ${compact ? "p-1" : "py-2"}`}>
      <div className="flex justify-between items-baseline">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
          Température météo
        </span>
        <span className={`font-mono text-xs font-semibold ${getTempColor(temp)}`}>
          {temp > 0 ? `+${temp}` : temp}°C{" "}
          <span className="text-[var(--color-text-faint)] font-normal text-[9px] ml-1">
            (x{(multiplier).toFixed(2)})
          </span>
        </span>
      </div>

      <div className="relative flex items-center group py-1">
        <input
          type="range"
          min="-10"
          max="40"
          value={temp}
          onChange={handleTempChange}
          className="w-full h-1 bg-[var(--color-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
          style={{
            background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${percentFill}%, var(--color-border) ${percentFill}%, var(--color-border) 100%)`,
          }}
        />
      </div>

      {!compact && (
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)] border-dashed">
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
              Pompe à chaleur (PAC)
            </span>
            <button
              type="button"
              onClick={handlePacToggle}
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                pac ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"
              }`}
              aria-pressed={pac}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-[var(--color-surface)] shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                  pac ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
