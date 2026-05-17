import { useEffect, useState } from "react";

/**
 * Lit un ensemble de CSS variables sur `:root` et re-résoud à chaque
 * changement de `data-theme` (toggle utilisateur ou changement OS en mode
 * "system"). Permet aux îlots Chart.js de suivre le thème en temps réel.
 */
export function useThemeColors<K extends string>(
  variableNames: readonly K[]
): Record<K, string> {
  const read = (): Record<K, string> => {
    if (typeof window === "undefined") {
      return Object.fromEntries(variableNames.map((n) => [n, ""])) as Record<
        K,
        string
      >;
    }
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      variableNames.map((name) => [name, cs.getPropertyValue(name).trim()])
    ) as Record<K, string>;
  };

  const [colors, setColors] = useState<Record<K, string>>(() => read());

  useEffect(() => {
    setColors(read());

    const observer = new MutationObserver(() => {
      setColors(read());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
    // variableNames est traité comme stable (figé par appelant)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return colors;
}
