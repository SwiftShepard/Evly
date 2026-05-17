import { useState, useEffect, useRef } from "react";

interface Props {
  value: number | null | undefined;
  format?: (val: number) => string;
  durationMs?: number;
  fallback?: string;
}

/**
 * Composant qui anime de manière fluide les changements de valeur numérique.
 * Idéal pour rendre l'interface "juicy" lors des changements de configuration.
 */
export default function AnimatedNumber({
  value,
  format,
  durationMs = 500,
  fallback = "—",
}: Props) {
  const [displayValue, setDisplayValue] = useState(value);
  const targetValue = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === targetValue.current) return;

    if (typeof value !== "number" || typeof displayValue !== "number") {
      // Transition directe si on passe de/vers null ou undefined
      setDisplayValue(value);
      targetValue.current = value;
      return;
    }

    const startValue = displayValue;
    const distance = value - startValue;
    const startTime = performance.now();
    targetValue.current = value;

    // Easing "exponential out" pour un effet de ralentissement naturel et dynamique
    const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOutExpo(progress);

      setDisplayValue(startValue + distance * easedProgress);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  if (displayValue === null || displayValue === undefined || Number.isNaN(displayValue)) {
    return <>{fallback}</>;
  }

  return <>{format ? format(displayValue) : Math.round(displayValue)}</>;
}
