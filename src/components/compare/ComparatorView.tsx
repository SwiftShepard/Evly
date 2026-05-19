import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { Vehicle, VehicleConfiguration } from "@/data/schemas";
import ComparatorCard from "./ComparatorCard";
import ComparisonTable from "./ComparisonTable";
import VehicleSelectModal from "./VehicleSelectModal";
import { generateInsights, type ConfiguredCard } from "@/lib/insights";
import { Plus, Share2, Check, LayoutGrid, Rows3, Table2 } from "lucide-react";

interface CardState {
  slug: string;
  configId: string;
}

interface Props {
  vehicles: Vehicle[];
}

const MAX_CARDS = 4;

/**
 * Composant principal du comparateur configurable.
 * Gère l'état des cartes, la synchro URL, et les insights.
 */
export default function ComparatorView({ vehicles }: Props) {
  const [cards, setCards] = useState<CardState[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [mobileLayout, setMobileLayout] = useState<"stacked" | "side-by-side">("stacked");
  const urlThrottle = useRef<number>(0);

  // Map slugs to vehicles for O(1) lookup
  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => map.set(v.slug, v));
    return map;
  }, [vehicles]);

  // Parse URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("v");
    if (!v) return;

    const parsed: CardState[] = [];
    for (const pair of v.split(",")) {
      const [slug, configId] = pair.split(":");
      if (!slug) continue;
      const vehicle = vehicleMap.get(slug);
      if (!vehicle) continue;

      const resolvedConfigId =
        configId && vehicle.configurations.find((c) => c.id === configId)
          ? configId
          : vehicle.configurations[0]?.id;

      if (resolvedConfigId) {
        parsed.push({ slug, configId: resolvedConfigId });
      }
    }

    if (parsed.length > 0) {
      setCards(parsed.slice(0, MAX_CARDS));
    }
  }, [vehicleMap]);

  // Sync URL on card changes (throttled)
  const syncUrl = useCallback(
    (newCards: CardState[]) => {
      if (urlThrottle.current) {
        clearTimeout(urlThrottle.current);
      }
      urlThrottle.current = window.setTimeout(() => {
        const url = new URL(window.location.href);
        if (newCards.length === 0) {
          url.searchParams.delete("v");
        } else {
          const param = newCards
            .map((c) => `${c.slug}:${c.configId}`)
            .join(",");
          url.searchParams.set("v", param);
        }
        window.history.replaceState(null, "", url.toString());
      }, 200);
    },
    []
  );

  // Update cards + sync URL
  const updateCards = useCallback(
    (fn: (prev: CardState[]) => CardState[]) => {
      setCards((prev) => {
        const next = fn(prev);
        syncUrl(next);
        return next;
      });
    },
    [syncUrl]
  );

  // Add vehicle
  const addVehicle = useCallback(
    (slug: string) => {
      const vehicle = vehicleMap.get(slug);
      if (!vehicle || !vehicle.configurations[0]) return;
      updateCards((prev) => {
        if (prev.length >= MAX_CARDS) return prev;
        if (prev.some((c) => c.slug === slug)) return prev;
        return [...prev, { slug, configId: vehicle.configurations[0]!.id }];
      });
      setShowModal(false);
    },
    [vehicleMap, updateCards]
  );

  // Remove vehicle
  const removeVehicle = useCallback(
    (index: number) => {
      updateCards((prev) => prev.filter((_, i) => i !== index));
    },
    [updateCards]
  );

  // Change config
  const changeConfig = useCallback(
    (index: number, configId: string) => {
      updateCards((prev) =>
        prev.map((c, i) => (i === index ? { ...c, configId } : c))
      );
    },
    [updateCards]
  );

  // Build configured cards for insights
  const configuredCards = useMemo<ConfiguredCard[]>(() => {
    return cards
      .map((c) => {
        const vehicle = vehicleMap.get(c.slug);
        if (!vehicle) return null;
        const config = vehicle.configurations.find((cfg) => cfg.id === c.configId);
        if (!config) return null;
        return { vehicle, config };
      })
      .filter((c): c is ConfiguredCard => c !== null);
  }, [cards, vehicleMap]);

  // Generate insights
  const insights = useMemo(
    () => generateInsights(configuredCards),
    [configuredCards]
  );

  // Share handler
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p
            className="font-mono text-xs"
            style={{ color: "var(--color-text-faint)" }}
          >
            {cards.length} / {MAX_CARDS} véhicule{cards.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          {cards.length >= 1 && (
            <div
              className="flex gap-0.5 p-0.5 rounded-lg"
              style={{ backgroundColor: "var(--color-bg-subtle)" }}
            >
              {(
                [
                  { mode: "cards" as const, icon: <LayoutGrid size={14} />, label: "Cartes" },
                  { mode: "table" as const, icon: <Table2 size={14} />, label: "Tableau" },
                ]
              ).map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className="p-1.5 rounded-md transition-all duration-200"
                  style={{
                    backgroundColor: viewMode === mode ? "var(--color-surface-elevated)" : "transparent",
                    color: viewMode === mode ? "var(--color-text)" : "var(--color-text-faint)",
                    boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                  aria-label={label}
                  title={label}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}

          {/* Mobile layout toggle (cards mode only) */}
          {viewMode === "cards" && isMobile && cards.length >= 2 && (
            <div
              className="flex gap-0.5 p-0.5 rounded-lg"
              style={{ backgroundColor: "var(--color-bg-subtle)" }}
            >
              <button
                type="button"
                onClick={() => setMobileLayout("stacked")}
                className="p-1.5 rounded-md transition-all duration-200"
                style={{
                  backgroundColor:
                    mobileLayout === "stacked"
                      ? "var(--color-surface-elevated)"
                      : "transparent",
                  color:
                    mobileLayout === "stacked"
                      ? "var(--color-text)"
                      : "var(--color-text-faint)",
                  boxShadow:
                    mobileLayout === "stacked"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                }}
                aria-label="Empilées"
              >
                <Rows3 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setMobileLayout("side-by-side")}
                className="p-1.5 rounded-md transition-all duration-200"
                style={{
                  backgroundColor:
                    mobileLayout === "side-by-side"
                      ? "var(--color-surface-elevated)"
                      : "transparent",
                  color:
                    mobileLayout === "side-by-side"
                      ? "var(--color-text)"
                      : "var(--color-text-faint)",
                  boxShadow:
                    mobileLayout === "side-by-side"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                }}
                aria-label="Côte-à-côte"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          )}

          {/* Share button */}
          {cards.length >= 2 && (
            <button
              type="button"
              onClick={handleShare}
              className="btn-interactive inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-300"
              style={{
                backgroundColor: copied
                  ? "var(--color-surface-accent)"
                  : "var(--color-bg-subtle)",
                color: copied ? "var(--color-accent)" : "var(--color-text-muted)",
                border: `0.5px solid ${copied ? "var(--color-accent)" : "var(--color-border)"}`,
              }}
            >
              {copied ? (
                <>
                  <Check size={13} />
                  Lien copié
                </>
              ) : (
                <>
                  <Share2 size={13} />
                  Partager
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Table view */}
      {viewMode === "table" && (
        <ComparisonTable
          cards={configuredCards}
          onRemove={removeVehicle}
          onConfigChange={changeConfig}
          onAdd={() => setShowModal(true)}
          maxCards={MAX_CARDS}
        />
      )}

      {/* Cards Grid */}
      {viewMode === "cards" && (
        <div
          className={
            isMobile && mobileLayout === "side-by-side"
              ? "flex gap-4 overflow-x-auto pb-4 -mx-4 px-4"
              : "grid gap-4"
          }
          style={
            isMobile && mobileLayout === "side-by-side"
              ? {
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                }
              : {
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : `repeat(${Math.min(cards.length + (cards.length < MAX_CARDS ? 1 : 0), MAX_CARDS)}, 1fr)`,
                }
          }
        >
          {configuredCards.map((cc, index) => (
            <ComparatorCard
              key={`${cc.vehicle.slug}-${index}`}
              vehicle={cc.vehicle}
              config={cc.config}
              onConfigChange={(configId) => changeConfig(index, configId)}
              onRemove={() => removeVehicle(index)}
              isMobile={isMobile}
            />
          ))}

          {/* Add card placeholder */}
          {cards.length < MAX_CARDS && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl transition-all duration-300 group min-h-[200px]"
              style={{
                border: "1.5px dashed var(--color-border-strong)",
                backgroundColor: "transparent",
                cursor: "pointer",
                minWidth: isMobile && mobileLayout === "side-by-side" ? "300px" : undefined,
                scrollSnapAlign:
                  isMobile && mobileLayout === "side-by-side" ? "center" : undefined,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.backgroundColor = "var(--color-bg-subtle)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-strong)";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              aria-label="Ajouter un véhicule au comparatif"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                style={{
                  backgroundColor: "var(--color-bg-subtle)",
                  border: "0.5px solid var(--color-border)",
                }}
              >
                <Plus
                  size={24}
                  style={{ color: "var(--color-accent)" }}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                Ajouter un véhicule
              </span>
              <span
                className="font-mono text-[10px]"
                style={{ color: "var(--color-text-faint)" }}
              >
                {MAX_CARDS - cards.length} emplacement{MAX_CARDS - cards.length > 1 ? "s" : ""} disponible{MAX_CARDS - cards.length > 1 ? "s" : ""}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Insights Banner */}
      {insights.length > 0 && (
        <div
          className="rounded-2xl p-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "0.5px solid var(--color-border)",
          }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--color-text-faint)" }}
          >
            Analyse comparative
          </span>
          <div className="flex flex-col gap-2">
            {insights.map((insight, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-muted)" }}
              >
                {insight}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <VehicleSelectModal
          vehicles={vehicles}
          excludeSlugs={cards.map((c) => c.slug)}
          onSelect={addVehicle}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
