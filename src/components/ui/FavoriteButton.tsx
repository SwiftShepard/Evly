import { useFavorites } from "@/lib/useFavorites";
import { Star } from "lucide-react";

interface Props {
  slug: string;
  size?: number;
  className?: string;
}

export default function FavoriteButton({ slug, size = 18, className = "" }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(slug);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      className={`inline-flex items-center justify-center rounded-lg transition-all duration-200 ${className}`}
      style={{
        color: active ? "var(--color-accent)" : "var(--color-text-faint)",
        backgroundColor: active ? "var(--color-surface-accent)" : "transparent",
        padding: 6,
      }}
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      title={active ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Star
        size={size}
        fill={active ? "var(--color-accent)" : "none"}
        strokeWidth={active ? 0 : 1.5}
      />
    </button>
  );
}
