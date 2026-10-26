/**
 * Ce qui a changé dans les fiches, commit par commit, lu dans l'historique git au build :
 * nouveaux modèles et versions, autonomies mesurées, prix, courbes de recharge. Sert la page
 * /nouveautes/ et son flux RSS ; rien n'est tenu à la main, une fiche publiée suffit.
 *
 * Lecture en deux appels git (journal des fichiers modifiés, puis tous les contenus d'un coup
 * par `git cat-file --batch`) : moins d'une seconde pour tout l'historique. Sans git ou sur un
 * clone superficiel (CI sans `fetch-depth: 0`), renvoie une liste vide plutôt qu'un historique
 * faux où chaque fiche semblerait nouvelle.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { SOURCES } from "@/data/sources";
import { formatKm, formatNumber, formatPrice } from "@/lib/format";

const DIR = "src/data/vehicles";
const MEASURED = new Set(["bjorn_nyland", "tested"]);
/** Écart en deçà duquel une autonomie remesurée n'est pas une nouvelle */
const REMEASURE_MIN = 0.03;

export type ChangeKind = "model" | "version" | "measured" | "remeasured" | "price" | "curve";

export interface ChangeItem {
  kind: ChangeKind;
  /** Version concernée (libellé de la fiche) ; absente pour un nouveau modèle */
  version?: string;
  before?: number | null;
  after?: number | null;
  /** Qui a mesuré (autonomie mesurée) */
  source?: string;
}

export interface VehicleChange {
  slug: string;
  name: string;
  items: ChangeItem[];
}

export interface DataUpdate {
  sha: string;
  /** Date ISO du commit */
  date: string;
  vehicles: VehicleChange[];
  /** Nombre de versions (ou de modèles) concernées par type de changement */
  counts: Record<ChangeKind, number>;
}

/* Fiche telle qu'elle était dans un commit : seuls les champs lus ici */
interface RawConfig {
  id: string;
  label?: string;
  price_EUR?: number | null;
  realRange?: { mixed_km?: number; confidence?: string } | null;
  rangeTests?: { sourceId?: string; protocol?: string }[] | null;
  chargingCurve?: unknown[] | null;
  chargingDC_10_80_min?: number | null;
  chargingDC_confidence?: string | null;
}
interface RawVehicle {
  slug?: string;
  brand?: string;
  model?: string;
  configurations?: RawConfig[];
}

const isNull = (sha: string) => /^0+$/.test(sha);

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

/** Contenus de plusieurs blobs en un seul processus git */
function readBlobs(shas: string[]): Map<string, string> {
  const out = new Map<string, string>();
  if (!shas.length) return out;
  const res = spawnSync("git", ["cat-file", "--batch"], { input: shas.join("\n") + "\n", maxBuffer: 1 << 30 });
  if (res.status !== 0 || !res.stdout) return out;
  const buf = res.stdout as Buffer;
  let off = 0;
  while (off < buf.length) {
    const nl = buf.indexOf(10, off);
    if (nl < 0) break;
    const [sha, type, size] = buf.subarray(off, nl).toString().split(" ");
    if (type === "missing" || !size) { off = nl + 1; continue; }
    const start = nl + 1;
    const end = start + Number(size);
    out.set(sha!, buf.subarray(start, end).toString("utf8"));
    off = end + 1;
  }
  return out;
}

/** Qui a mesuré la version : Nyland, sinon le média de l'essai sur route */
function sourceOf(c: RawConfig): string | undefined {
  const tests = c.rangeTests ?? [];
  if (c.realRange?.confidence === "bjorn_nyland" || tests.some((t) => t.protocol === "nyland")) return SOURCES.nyland?.name;
  const id = tests.find((t) => t.protocol !== "wltp" && t.protocol !== "manufacturer" && t.sourceId)?.sourceId;
  return id ? SOURCES[id]?.name ?? id : undefined;
}

const hasCurve = (c: RawConfig) => Array.isArray(c.chargingCurve) && c.chargingCurve.length > 1 && c.chargingDC_confidence === "tested";

function diff(a: RawVehicle | null, b: RawVehicle): ChangeItem[] {
  if (!a) return [{ kind: "model", after: Math.min(...(b.configurations ?? []).map((c) => c.price_EUR ?? Infinity)) }];
  const before = new Map((a.configurations ?? []).map((c) => [c.id, c]));
  const items: ChangeItem[] = [];
  for (const c of b.configurations ?? []) {
    const version = c.label ?? c.id;
    const old = before.get(c.id);
    if (!old) {
      items.push({ kind: "version", version, after: c.price_EUR ?? null });
      continue;
    }
    if (c.price_EUR && old.price_EUR !== c.price_EUR) items.push({ kind: "price", version, before: old.price_EUR ?? null, after: c.price_EUR });
    const wasMeasured = MEASURED.has(old.realRange?.confidence ?? "");
    const isMeasured = MEASURED.has(c.realRange?.confidence ?? "");
    const km = c.realRange?.mixed_km ?? null;
    if (isMeasured && !wasMeasured) items.push({ kind: "measured", version, after: km, source: sourceOf(c) });
    else if (isMeasured && wasMeasured && km && old.realRange?.mixed_km && Math.abs(km / old.realRange.mixed_km - 1) >= REMEASURE_MIN)
      items.push({ kind: "remeasured", version, before: old.realRange.mixed_km, after: km, source: sourceOf(c) });
    if (hasCurve(c) && !hasCurve(old)) items.push({ kind: "curve", version, after: c.chargingDC_10_80_min ?? null });
  }
  return items;
}

const EMPTY_COUNTS = (): Record<ChangeKind, number> => ({ model: 0, version: 0, measured: 0, remeasured: 0, price: 0, curve: 0 });

let cache: DataUpdate[] | null = null;

/** Mises à jour des fiches, de la plus récente à la plus ancienne */
export function getDataUpdates(): DataUpdate[] {
  if (cache) return cache;
  cache = [];
  if (git(["rev-parse", "--is-shallow-repository"])?.trim() !== "false") {
    console.warn("[dataHistory] historique git absent ou superficiel : page des nouveautés vide (fetch-depth: 0 en CI)");
    return cache;
  }
  const log = git(["log", "--reverse", "--format=@@%H|%P|%cI", "--raw", "--no-abbrev", "--no-renames", "--", DIR]);
  if (!log) return cache;

  interface Commit { sha: string; root: boolean; date: string; files: { oldSha: string; newSha: string }[] }
  const commits: Commit[] = [];
  for (const line of log.split("\n")) {
    if (line.startsWith("@@")) {
      const [sha, parents, date] = line.slice(2).split("|");
      commits.push({ sha: sha!, root: !parents?.trim(), date: date!, files: [] });
    } else if (line.startsWith(":") && line.endsWith(".json")) {
      const [, , oldSha, newSha] = line.split("\t")[0]!.split(" ");
      commits.at(-1)?.files.push({ oldSha: oldSha!, newSha: newSha! });
    }
  }

  const shas = new Set<string>();
  for (const c of commits) for (const f of c.files) for (const s of [f.oldSha, f.newSha]) if (!isNull(s)) shas.add(s);
  const blobs = readBlobs([...shas]);
  const parse = (sha: string): RawVehicle | null => {
    if (isNull(sha)) return null;
    try {
      return JSON.parse(blobs.get(sha) ?? "null") as RawVehicle | null;
    } catch {
      return null;
    }
  };

  // Fiches déjà vues : un fichier renommé ou recréé n'est pas un nouveau modèle
  const known = new Set<string>();
  const updates: DataUpdate[] = [];
  for (const c of commits) {
    const vehicles: VehicleChange[] = [];
    for (const f of c.files) {
      const b = parse(f.newSha);
      if (!b?.slug) continue;
      const a = parse(f.oldSha);
      const isNew = !a && !known.has(b.slug);
      known.add(b.slug);
      if (c.root || (!a && !isNew)) continue;
      const items = diff(a, b);
      if (items.length) vehicles.push({ slug: b.slug, name: `${b.brand ?? ""} ${b.model ?? ""}`.trim(), items });
    }
    if (!vehicles.length) continue;
    const counts = EMPTY_COUNTS();
    for (const v of vehicles) for (const it of v.items) counts[it.kind]++;
    vehicles.sort((x, y) => weight(y) - weight(x) || x.name.localeCompare(y.name, "fr"));
    updates.push({ sha: c.sha, date: c.date, vehicles, counts });
  }
  cache = updates.reverse();
  return cache;
}

/** Ordre d'affichage : nouveaux modèles, puis mesures, puis le reste */
const RANK: Record<ChangeKind, number> = { model: 6, measured: 5, remeasured: 4, curve: 3, version: 2, price: 1 };
const weight = (v: VehicleChange) => Math.max(...v.items.map((i) => RANK[i.kind]));

/* ── Textes (page des nouveautés et flux RSS) ─────────────────── */

const and = (parts: string[]) => (parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} et ${parts.at(-1)}`);

/** Une ligne par changement d'une version */
export function itemText(it: ChangeItem): string {
  const v = it.version ?? "";
  switch (it.kind) {
    case "model":
      return it.after && Number.isFinite(it.after) ? `Entrée au catalogue, dès ${formatPrice(it.after)}` : "Entrée au catalogue";
    case "version":
      return `Nouvelle version : ${v}${it.after ? `, ${formatPrice(it.after)}` : ""}`;
    case "measured":
      return `${v} : autonomie mesurée, ${formatKm(it.after ?? 0)} en mixte${it.source ? ` (${it.source})` : ""}`;
    case "remeasured":
      return `${v} : autonomie revue, ${formatKm(it.before ?? 0)} → ${formatKm(it.after ?? 0)}${it.source ? ` (${it.source})` : ""}`;
    case "price":
      return it.before ? `${v} : ${formatPrice(it.before)} → ${formatPrice(it.after ?? 0)}` : `${v} : prix publié, ${formatPrice(it.after ?? 0)}`;
    case "curve":
      return `${v} : courbe de recharge mesurée${it.after ? `, 10 → 80 % en ${formatNumber(it.after)} min` : ""}`;
  }
}

/** Ce qui a changé pour un modèle, en une phrase (titre RSS, ligne de la page) */
export function changeSummary(v: VehicleChange): string {
  const n = (k: ChangeKind) => v.items.filter((i) => i.kind === k);
  if (n("model").length) return "Nouveau au catalogue";
  const parts: string[] = [];
  const measured = n("measured");
  if (measured.length === 1) parts.push(`autonomie mesurée (${formatKm(measured[0]!.after ?? 0)} en mixte)`);
  else if (measured.length > 1) {
    const kms = [...new Set(measured.map((m) => m.after ?? 0))].sort((x, y) => x - y);
    const span = kms.length === 1 ? formatKm(kms[0]!) : `de ${formatNumber(kms[0]!)} à ${formatKm(kms.at(-1)!)}`;
    parts.push(`autonomie mesurée sur ${measured.length} versions (${span} en mixte)`);
  }
  if (n("remeasured").length) parts.push("autonomie revue");
  if (n("curve").length) parts.push(n("curve").length > 1 ? `${n("curve").length} courbes de recharge mesurées` : "courbe de recharge mesurée");
  if (n("version").length) parts.push(n("version").length > 1 ? `${n("version").length} nouvelles versions` : "nouvelle version");
  if (n("price").length) parts.push(n("price").length > 1 ? `${n("price").length} prix mis à jour` : "prix mis à jour");
  const text = and(parts);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const COUNT_LABELS: Record<ChangeKind, [string, string]> = {
  model: ["nouveau modèle", "nouveaux modèles"],
  measured: ["autonomie mesurée", "autonomies mesurées"],
  remeasured: ["autonomie revue", "autonomies revues"],
  curve: ["courbe de recharge", "courbes de recharge"],
  version: ["nouvelle version", "nouvelles versions"],
  price: ["prix mis à jour", "prix mis à jour"],
};

/** « 4 nouveaux modèles · 16 autonomies mesurées » */
export function countsText(counts: Record<ChangeKind, number>): string[] {
  return (Object.keys(RANK) as ChangeKind[])
    .sort((a, b) => RANK[b] - RANK[a])
    .filter((k) => counts[k] > 0)
    .map((k) => `${formatNumber(counts[k])} ${COUNT_LABELS[k][counts[k] > 1 ? 1 : 0]}`);
}
