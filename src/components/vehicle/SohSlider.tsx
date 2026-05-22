import React, { useState, useEffect } from "react";

interface Props {
  initialSoh?: number;
  onChange?: (soh: number) => void;
  compact?: boolean;
}

export default function SohSlider({
  initialSoh = 100,
  onChange,
  compact = false,
}: Props) {
  const [soh, setSoh] = useState(initialSoh);

  useEffect(() => {
    if (initialSoh !== soh) {
      setSoh(initialSoh);
    }
  }, [initialSoh]);

  // Read initial SoH from URL search parameters on mount (if uncontrolled, i.e., on details page)
  useEffect(() => {
    if (onChange) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const sohParam = params.get("soh");
      if (sohParam) {
        const val = parseInt(sohParam, 10);
        if (!isNaN(val) && val >= 70 && val <= 100) {
          setSoh(val);
          // Dispatch immediately so the Astro script and other components pick it up
          window.dispatchEvent(
            new CustomEvent("soh-changed", { detail: { soh: val } })
          );
        }
      }
    } catch (e) {
      // Ignore SSR reference errors if run during build
    }
  }, [onChange]);

  // Sync state between multiple sliders on the same page (useful for mobile vs desktop on [slug].astro)
  useEffect(() => {
    if (onChange) return; // If onChange is provided, it's controlled externally (comparator card), no global sync needed

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.soh === "number" && detail.soh !== soh) {
        setSoh(detail.soh);
      }
    };
    window.addEventListener("soh-changed", handler);
    return () => window.removeEventListener("soh-changed", handler);
  }, [soh, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSoh(val);
    if (onChange) {
      onChange(val);
    } else {
      window.dispatchEvent(
        new CustomEvent("soh-changed", { detail: { soh: val } })
      );
    }
  };

  const getPresetLabel = (val: number) => {
    if (val === 100) return "Neuf";
    if (val >= 90) return "Excellent";
    if (val >= 82) return "Bon état";
    if (val >= 75) return "Usure moyenne";
    return "Fatigué";
  };

  // Helper for preset clicks
  const applyPreset = (val: number) => {
    setSoh(val);
    if (onChange) {
      onChange(val);
    } else {
      window.dispatchEvent(
        new CustomEvent("soh-changed", { detail: { soh: val } })
      );
    }
  };

  // Fill calculation for range track
  const percentFill = ((soh - 70) / 30) * 100;

  return (
    <div className={`flex flex-col gap-2 ${compact ? "p-1" : "py-2"}`}>
      <div className="flex justify-between items-baseline">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
          Santé batterie (SoH)
        </span>
        <span className="font-mono text-xs font-semibold text-[var(--color-accent)]">
          {soh}%{" "}
          <span className="text-[var(--color-text-faint)] font-normal text-[10px]">
            ({getPresetLabel(soh)})
          </span>
        </span>
      </div>

      <div className="relative flex items-center group py-1">
        <input
          type="range"
          min="70"
          max="100"
          value={soh}
          onChange={handleChange}
          className="w-full h-1 bg-[var(--color-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
          style={{
            background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${percentFill}%, var(--color-border) ${percentFill}%, var(--color-border) 100%)`,
          }}
        />
      </div>

      {!compact && (
        <div className="flex justify-between items-center mt-1">
          <div className="flex gap-1.5">
            {[100, 90, 80, 70].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`font-mono text-[9px] px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                  soh === preset
                    ? "bg-[var(--color-surface-accent)] text-[var(--color-accent)] border-[var(--color-accent)]"
                    : "bg-[var(--color-bg-subtle)] text-[var(--color-text-faint)] border-[var(--color-border)] hover:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                {preset === 100 ? "Neuf" : `${preset}%`}
              </button>
            ))}
          </div>
          <span className="font-mono text-[9px] text-[var(--color-text-faint)]">
            Min. 70%
          </span>
        </div>
      )}
    </div>
  );
}
