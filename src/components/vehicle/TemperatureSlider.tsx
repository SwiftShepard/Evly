import React, { useState, useEffect, useId } from "react";
import { heatPumpOf, tempFactor } from "@/lib/winter";
import { formatNumber } from "@/lib/format";

interface Props {
  chemistry?: string;
  /** Pompe à chaleur de la fiche ; absente = non renseignée */
  heatPump?: "standard" | "option" | "none";
  initialTemp?: number;
  compact?: boolean;
}

/**
 * Curseur de température de la fiche : même modèle de froid que l'autonomie « hiver »
 * (src/lib/winter.js). Pompe à chaleur d'après la fiche ; non renseignée, le calcul prend la
 * moyenne des deux cas, jusqu'à ce que le visiteur dise ce qu'il a.
 */
export default function TemperatureSlider({ chemistry = "NMC", heatPump, initialTemp = 20, compact = false }: Props) {
  const [temp, setTemp] = useState(initialTemp);
  const [pac, setPac] = useState<boolean | null>(heatPumpOf(heatPump));

  const getTempMultiplier = (t: number, chem: string, hasPac: boolean | null) => tempFactor(t, chem, hasPac);

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
        resolvedPac = pacParam === "true" ? true : pacParam === "false" ? false : null;
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
    const newVal = pac !== true;
    setPac(newVal);
    updateUrl(temp, newVal);
  };

  const applyPreset = (presetTemp: number) => {
    setTemp(presetTemp);
    updateUrl(presetTemp, pac);
  };

  const updateUrl = (t: number, p: boolean | null) => {
    try {
      const urlVal = new URL(window.location.href);
      if (t === 20) {
        urlVal.searchParams.delete("temp");
      } else {
        urlVal.searchParams.set("temp", t.toString());
      }
      if (p === heatPumpOf(heatPump)) {
        urlVal.searchParams.delete("pac");
      } else {
        urlVal.searchParams.set("pac", String(p));
      }
      window.history.replaceState(null, "", urlVal.toString());
    } catch (e) {
      // Ignore
    }
  };

  // Temperature color styling
  const getTempColor = (t: number) => {
    if (t < 10) return "text-blue-700";
    if (t <= 25) return "text-emerald-700";
    return "text-red-700";
  };

  const getPercentFill = () => {
    return ((temp - -10) / 50) * 100;
  };

  const percentFill = getPercentFill();
  const labelId = useId();
  const pacLabelId = useId();

  return (
    <div className={`flex flex-col gap-2.5 ${compact ? "p-1" : "py-2"}`}>
      <div className="flex justify-between items-baseline">
        <span id={labelId} className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
          Température météo
        </span>
        <span className={`font-mono text-xs font-semibold ${getTempColor(temp)}`}>
          {temp > 0 ? `+${temp}` : temp}°C{" "}
          <span className="text-[var(--color-text-faint)] font-normal text-[9px] ml-1">
            (×{formatNumber(multiplier, 2)})
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
          aria-labelledby={labelId}
          aria-valuetext={`${temp} °C`}
          className="w-full h-1 bg-[var(--color-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
          style={{
            background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${percentFill}%, var(--color-border) ${percentFill}%, var(--color-border) 100%)`,
          }}
        />
      </div>

      {!compact && (
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)] border-dashed">
            <span id={pacLabelId} className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
              Pompe à chaleur (PAC){pac === null && " · non renseignée"}
            </span>
            <button
              type="button"
              role="switch"
              onClick={handlePacToggle}
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-transparent transition-colors duration-200 ease-in-out ${
                pac ? "bg-[var(--color-accent)]" : "bg-[var(--color-text-faint)]"
              }`}
              aria-checked={pac === null ? "mixed" : pac}
              aria-labelledby={pacLabelId}
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
