import { useEffect, useState, useCallback } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Mode = "system" | "light" | "dark";

const STORAGE_KEY = "evly-theme";

function readStoredMode(): Mode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: Mode): void {
  const resolved =
    mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
  document.documentElement.dataset.theme = resolved;
}

const ORDER: Mode[] = ["system", "light", "dark"];

const META: Record<
  Mode,
  { Icon: typeof Monitor; label: string; aria: string }
> = {
  system: { Icon: Monitor, label: "Système", aria: "Thème : suivre le système" },
  light: { Icon: Sun, label: "Clair", aria: "Thème : clair" },
  dark: { Icon: Moon, label: "Sombre", aria: "Thème : sombre" },
};

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(readStoredMode());
    setMounted(true);
  }, []);

  // Suivre les changements OS en mode "system"
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((current) => {
      const idx = ORDER.indexOf(current);
      const next = ORDER[(idx + 1) % ORDER.length] ?? "system";
      try {
        if (next === "system") localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyTheme(next);
      return next;
    });
  }, []);

  // Évite l'hydratation mismatch : on rend les 3 états en grisé tant que pas monté
  const activeMode = mounted ? mode : "system";
  const { Icon, label, aria } = META[activeMode];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={aria}
      title={`${label} (cliquer pour changer)`}
      className="group inline-flex items-center gap-2 px-2.5 py-2 border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-[var(--radius-tile-sm)] focus-visible:outline-none min-h-[36px] min-w-[36px] justify-center active:scale-90"
    >
      <span className="inline-flex transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:rotate-180">
        <Icon size={15} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <span className="hidden lg:inline font-mono text-[10px] uppercase tracking-[0.14em]">
        {label}
      </span>
    </button>
  );
}
