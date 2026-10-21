import { confidenceOf, infoOfLevel, type ConfidenceLevel, type ConfidenceSubject } from "@/lib/confidence";

/**
 * Badge de confiance pour les îlots React : même balisage et mêmes styles (.conf) que
 * Confidence.astro. Prend le code des fiches (`code`) ou, à défaut, un niveau déjà calculé.
 */
interface Props {
  code?: string | null;
  level?: ConfidenceLevel;
  subject?: ConfidenceSubject;
  label?: string;
  className?: string;
}

export default function Confidence({ code, level, subject = "range", label, className = "" }: Props) {
  const info = code === undefined && level ? infoOfLevel(level, subject) : confidenceOf(code, subject);
  return (
    <span className={`conf ${className}`} data-level={info.level} title={info.source}>
      <i aria-hidden="true" />
      {label ?? info.label}
      <span className="sr-only"> : {info.source}</span>
    </span>
  );
}
