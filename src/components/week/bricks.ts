/**
 * Semaine type en briques : le travail d'office, puis les sorties qu'on ajoute et qu'on
 * empile (deux séances de sport, deux restaurants…), chacune avec ses jours et son lieu.
 */
import { DAYS } from "@/lib/map/week";

export interface Brick {
  /** « travail », « sport », puis « sport-2 »… : clé du lieu, du trajet et de la simulation */
  id: string;
  cat: string;
  /** Lundi = 0 … dimanche = 6 */
  days: number[];
  /** Allers-retours par jour (école : matin et soir) */
  perDay: number;
}

export interface BrickKind {
  cat: string;
  label: string;
  /** Jours proposés à l'ajout */
  days: number[];
  perDay: number;
  /** Précision affichée avec les jours */
  note?: string;
}

/** Briques disponibles, dans l'ordre de la palette */
export const BRICK_KINDS: BrickKind[] = [
  { cat: "travail", label: "Travail", days: [0, 1, 2, 3, 4], perDay: 1 },
  { cat: "ecole", label: "École", days: [0, 1, 3, 4], perDay: 2, note: "matin et soir" },
  { cat: "sport", label: "Sport", days: [2], perDay: 1 },
  { cat: "restaurant", label: "Restaurant", days: [4], perDay: 1 },
  { cat: "courses", label: "Courses", days: [5], perDay: 1 },
  { cat: "bricolage", label: "Bricolage", days: [5], perDay: 1 },
  { cat: "balade", label: "Sortie", days: [6], perDay: 1, note: "balade ou visite" },
];

export const kindOf = (cat: string) => BRICK_KINDS.find((k) => k.cat === cat) ?? BRICK_KINDS[0]!;

const brickOf = (cat: string, id = cat): Brick => {
  const k = kindOf(cat);
  return { id, cat, days: [...k.days], perDay: k.perDay };
};

/** Semaine proposée au premier passage */
export const DEFAULT_BRICKS: Brick[] = ["travail", "sport", "restaurant", "courses", "bricolage", "balade"].map((c) => brickOf(c));

/** Nouvelle brique d'une catégorie, avec un identifiant libre */
export function newBrick(cat: string, items: Brick[]): Brick {
  let id = cat;
  for (let n = 2; items.some((b) => b.id === id); n++) id = `${cat}-${n}`;
  return brickOf(cat, id);
}

/** Anciens réglages (liste fixe avec interrupteurs) -> briques */
export function fromLegacy(on: Record<string, boolean>): Brick[] {
  const legacyOn: Record<string, boolean> = { ecole: false };
  return BRICK_KINDS.filter((k) => k.cat === "travail" || (on[k.cat] ?? legacyOn[k.cat] ?? true)).map((k) => brickOf(k.cat));
}

/** Briques valides (lecture d'un lien partagé ou du stockage), travail en tête */
export function sanitizeBricks(raw: unknown): Brick[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Brick[] = [];
  for (const b of raw) {
    if (!b || typeof b.id !== "string" || !BRICK_KINDS.some((k) => k.cat === b.cat)) continue;
    const days = Array.isArray(b.days) ? [...new Set(b.days.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))].sort() as number[] : [];
    if (out.some((x) => x.id === b.id)) continue;
    out.push({ id: b.id, cat: b.cat, days, perDay: b.perDay === 2 ? 2 : 1 });
  }
  if (!out.some((b) => b.id === "travail")) out.unshift(brickOf("travail"));
  return [out.find((b) => b.id === "travail")!, ...out.filter((b) => b.id !== "travail")];
}

const lower = (d: number) => (DAYS[d] ?? "").toLowerCase();

/** « du lundi au vendredi », « mercredi », « lundi, mardi et jeudi », « aucun jour » */
export function daysLabel(days: number[]): string {
  if (!days.length) return "aucun jour";
  if (days.length === 7) return "tous les jours";
  const sorted = [...days].sort();
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1]! + 1);
  if (consecutive && sorted.length >= 3) return `du ${lower(sorted[0]!)} au ${lower(sorted.at(-1)!)}`;
  const names = sorted.map(lower);
  return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
}
