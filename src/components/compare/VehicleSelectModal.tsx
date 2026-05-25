import { useState, useRef, useEffect } from "react";
import { X, Search, Plus } from "lucide-react";
import type { Vehicle } from "@/data/schemas";

interface Props {
  vehicles: Vehicle[];
  excludeSlugs: string[];
  onSelect: (slug: string) => void;
  onClose: () => void;
}

export default function VehicleSelectModal({
  vehicles,
  excludeSlugs,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const [category, setCategory] = useState("Tous");

  const getCategory = (v: Vehicle) => {
    const body = v.bodyType.toLowerCase();
    const segment = v.segment.toLowerCase();
    if (body.includes("monospace") || body.includes("van") || v.variant.toLowerCase().includes("monospace")) return "Monospace";
    if (body.includes("quadricycle") || v.segment.includes("quadricycle")) return "Quadricycle";
    if (segment.includes("a") || (segment.includes("b") && (body.includes("suv") || body.includes("crossover"))) || body.includes("urbain")) return "Mini-SUV";
    if (body.includes("suv") || body.includes("crossover")) return "SUV";
    if (segment.includes("b") || body.includes("citadine")) return "Citadine";
    if (segment.includes("c") || body.includes("compacte")) return "Compacte";
    if (body.includes("berline") || body.includes("hatchback") || segment.includes("d")) return "Berline";
    return "SUV";
  };

  const categories = ["Tous", "Mini-SUV", "SUV", "Compacte", "Berline", "Citadine", "Monospace", "Quadricycle"];

  const filtered = vehicles.filter((v) => {
    const text = `${v.brand} ${v.model} ${v.variant}`.toLowerCase();
    const matchesSearch = text.includes(query.toLowerCase());
    const matchesCategory = category === "Tous" || getCategory(v) === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        animation: "modal-overlay-in 200ms ease forwards",
      }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="w-full max-w-xl flex flex-col rounded-2xl overflow-hidden max-h-[85vh]"
        style={{
          backgroundColor: "var(--color-bg-elevated)",
          border: "0.5px solid var(--color-border-strong)",
          boxShadow: "0 25px 60px -15px rgba(0,0,0,0.4)",
          animation: "modal-content-in 300ms cubic-bezier(0.16,1,0.3,1) forwards",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "0.5px solid var(--color-border)" }}
        >
          <h2
            className="text-base font-semibold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Ajouter un véhicule
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-text-faint)" }}
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={1.6} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3" style={{ borderBottom: "0.5px solid var(--color-border)" }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: "var(--color-bg-subtle)",
              border: "0.5px solid var(--color-border)",
            }}
          >
            <Search size={14} style={{ color: "var(--color-text-faint)" }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un véhicule…"
              className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{
                color: "var(--color-text)",
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: category === cat ? "var(--color-text)" : "var(--color-bg-subtle)",
                  color: category === cat ? "var(--color-bg)" : "var(--color-text-muted)",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {filtered.length === 0 ? (
            <p
              className="text-center py-8 text-sm"
              style={{ color: "var(--color-text-faint)" }}
            >
              Aucun véhicule trouvé.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filtered.map((v) => {
                const isExcluded = excludeSlugs.includes(v.slug);
                const defaultConfig = v.configurations[0];
                const rangeDisplay = defaultConfig?.realRange?.mixed_km
                  ?? v.realRange.mixed_km;

                return (
                  <button
                    key={v.slug}
                    type="button"
                    disabled={isExcluded}
                    onClick={() => !isExcluded && onSelect(v.slug)}
                    className="flex items-center gap-4 px-3 py-3 rounded-xl text-left transition-all duration-200 group"
                    style={{
                      backgroundColor: "transparent",
                      opacity: isExcluded ? 0.4 : 1,
                      cursor: isExcluded ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isExcluded)
                        e.currentTarget.style.backgroundColor = "var(--color-bg-subtle)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {/* Icon placeholder */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: "var(--color-bg-subtle)",
                        color: "var(--color-accent)",
                        border: "0.5px solid var(--color-border)",
                      }}
                    >
                      {v.brand.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--color-text)" }}
                        >
                          {v.brand} {v.model}
                        </span>
                        <span
                          className="font-mono text-[10px] flex-shrink-0"
                          style={{ color: "var(--color-text-faint)" }}
                        >
                          {v.architecture_V} V
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span
                          className="font-mono text-[11px]"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {rangeDisplay} km mixte
                        </span>
                        <span
                          className="font-mono text-[11px]"
                          style={{ color: "var(--color-text-faint)" }}
                        >
                          {v.configurations.length} config{v.configurations.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {isExcluded ? (
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded"
                        style={{
                          color: "var(--color-text-faint)",
                          backgroundColor: "var(--color-bg-subtle)",
                        }}
                      >
                        Déjà ajouté
                      </span>
                    ) : (
                      <Plus
                        size={16}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--color-accent)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex justify-end"
          style={{ borderTop: "0.5px solid var(--color-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg transition-colors"
            style={{
              color: "var(--color-text-muted)",
              backgroundColor: "var(--color-bg-subtle)",
            }}
          >
            Annuler
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modal-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-content-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
