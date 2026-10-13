/**
 * Règle d'autonomie pour les îlots React (même balisage et mêmes styles .rail que
 * RangeRail.astro) : hiver, reste de l'autonomie réelle, kilomètres WLTP, et le
 * repère « votre semaine » quand `need` est donné.
 */
interface Props {
  real: number;
  wltp: number;
  winter: number;
  scale: number;
  /** Kilomètres d'une semaine de trajet */
  need?: number;
  size?: "sm" | "lg";
  className?: string;
}

export default function Rail({ real, wltp, winter, scale, need, size = "sm", className = "" }: Props) {
  const promise = Math.max(wltp, real);
  const style = {
    "--scale": scale,
    "--winter": Math.min(winter, real),
    "--real": real,
    "--wltp": promise,
    ...(need ? { "--need": need } : {}),
  } as React.CSSProperties;
  return (
    <div
      className={`rail ${className}`}
      data-size={size}
      data-winter={winter}
      data-real={real}
      data-wltp={promise}
      data-need={need || undefined}
      data-fit={need ? (winter >= need ? "1" : "0") : undefined}
      style={style}
    >
      <div className="rail-bar" aria-hidden="true">
        <span className="rail-seg rail-winter"></span>
        <span className="rail-seg rail-real"></span>
        <span className="rail-seg rail-promise"></span>
        <span className="rail-need"></span>
      </div>
    </div>
  );
}
