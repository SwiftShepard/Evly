import { useFavorites } from "@/lib/useFavorites";
import { url } from "@/lib/url";
import { Star, Trash2 } from "lucide-react";

interface VehicleSummary {
  slug: string;
  brand: string;
  model: string;
  variant: string;
  segment: string;
  realRangeMixed: number;
  dcPeak: number;
  price: number;
}

interface Props {
  vehicles: VehicleSummary[];
}

export default function FavoritesView({ vehicles }: Props) {
  const { favorites, toggle } = useFavorites();

  const vehicleMap = new Map(vehicles.map((v) => [v.slug, v]));
  const favVehicles = favorites
    .map((slug) => vehicleMap.get(slug))
    .filter((v): v is VehicleSummary => v !== undefined);

  if (favVehicles.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-2xl p-16 text-center"
        style={{ border: "1.5px dashed var(--color-border-strong)" }}
      >
        <Star size={32} style={{ color: "var(--color-text-faint)" }} />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Aucun favori pour l'instant.
        </p>
        <a
          href={url("/vehicules")}
          className="font-mono text-xs transition-colors"
          style={{ color: "var(--color-accent)" }}
        >
          Parcourir le catalogue →
        </a>
      </div>
    );
  }

  const fmtPrice = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="flex flex-col gap-3">
      <p
        className="font-mono text-xs mb-2"
        style={{ color: "var(--color-text-faint)" }}
      >
        {favVehicles.length} favori{favVehicles.length > 1 ? "s" : ""}
      </p>

      {favVehicles.map((v) => (
        <a
          key={v.slug}
          href={url(`/vehicules/${v.slug}`)}
          className="flex items-center gap-4 rounded-2xl p-4 md:p-5 transition-all duration-200 group"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "0.5px solid var(--color-border)",
            textDecoration: "none",
            color: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.boxShadow = "0 2px 8px -2px rgba(0,0,0,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div className="flex-1 min-w-0">
            <span
              className="font-mono text-[9px] uppercase tracking-[0.14em]"
              style={{ color: "var(--color-text-faint)" }}
            >
              {v.brand} · {v.segment.split(", ")[0]}
            </span>
            <h3
              className="text-lg font-semibold tracking-[-0.01em] truncate"
              style={{ color: "var(--color-text)" }}
            >
              {v.model}
            </h3>
            <span
              className="text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              {v.variant}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-6 shrink-0">
            <div className="flex flex-col items-end gap-0.5">
              <span
                className="font-mono text-[9px] uppercase tracking-[0.14em]"
                style={{ color: "var(--color-text-faint)" }}
              >
                Autonomie
              </span>
              <span
                className="text-lg font-semibold tabular-nums"
                style={{ color: "var(--color-accent)" }}
              >
                {v.realRangeMixed} km
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span
                className="font-mono text-[9px] uppercase tracking-[0.14em]"
                style={{ color: "var(--color-text-faint)" }}
              >
                DC
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {v.dcPeak} kW
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span
                className="font-mono text-[9px] uppercase tracking-[0.14em]"
                style={{ color: "var(--color-text-faint)" }}
              >
                Prix
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {fmtPrice(v.price)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(v.slug);
            }}
            className="p-2 rounded-lg transition-all shrink-0"
            style={{ color: "var(--color-text-faint)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-danger)";
              e.currentTarget.style.backgroundColor = "var(--color-bg-subtle)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-faint)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            aria-label={`Retirer ${v.model} des favoris`}
          >
            <Trash2 size={16} />
          </button>
        </a>
      ))}

      <div className="mt-4 flex gap-3">
        <a
          href={url("/vehicules")}
          className="font-mono text-xs transition-colors"
          style={{ color: "var(--color-accent)" }}
        >
          ← Catalogue
        </a>
        <a
          href={(() => {
            const param = favVehicles
              .slice(0, 4)
              .map((v) => v.slug)
              .join(",");
            return url(`/comparer/?v=${param}`);
          })()}
          className="font-mono text-xs transition-colors"
          style={{ color: "var(--color-accent)" }}
        >
          Comparer les favoris →
        </a>
      </div>
    </div>
  );
}
