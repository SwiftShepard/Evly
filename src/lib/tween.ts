/**
 * Chiffres qui défilent au lieu de sauter (navigateur uniquement).
 * Interruptible : une nouvelle cible repart de la valeur affichée, sans à-coup.
 * « Réduire les animations » : la valeur s'affiche directement.
 */

const running = new WeakMap<HTMLElement, number>();
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Courbe « ease-out » forte, la même que --ease-out-expo
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

export interface TweenOptions {
  /** Durée en ms (UI : sous 300 ms) */
  duration?: number;
  /** Mise en forme de la valeur affichée */
  format?: (n: number) => string;
}

export function tweenNumber(el: HTMLElement, to: number, { duration = 260, format = (n) => String(Math.round(n)) }: TweenOptions = {}) {
  const from = Number(el.dataset.tweenValue ?? (Number.parseFloat((el.textContent ?? "").replace(/[^\d,.-]/g, "").replace(",", ".")) || 0));
  el.dataset.tweenValue = String(to);
  const prev = running.get(el);
  if (prev) cancelAnimationFrame(prev);
  if (reduced() || from === to || !Number.isFinite(from)) {
    el.textContent = format(to);
    return;
  }
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = format(from + (to - from) * easeOut(t));
    if (t < 1) running.set(el, requestAnimationFrame(step));
    else running.delete(el);
  };
  running.set(el, requestAnimationFrame(step));
}

/** Petite impulsion pour confirmer qu'une valeur a changé ailleurs sur la page */
export function pulse(el: Element | null) {
  if (!el || reduced()) return;
  (el as HTMLElement).animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }],
    { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
  );
}
