/**
 * Images à partager (1080 × 1080), dessinées dans le navigateur avec les polices du site :
 * une semaine de Ma semaine, un grand trajet, un duel. Rien ne part vers un serveur, l'image
 * naît sur l'appareil et repart par le partage du téléphone, le presse-papiers ou un fichier.
 * Jamais d'adresse : au plus la commune de départ d'un grand trajet.
 * Module navigateur : à n'importer que dans des composants côté client.
 */

export const CARD = 1080;

const C = {
  bg: "#eef1e7",
  panel: "#fafbf6",
  text: "#17200f",
  muted: "#4a5442",
  faint: "#5d6754",
  accent: "#3a5c12",
  accentDim: "#243a0a",
  on: "#f2f7e6",
  lime: "#d4ea7f",
  soft: "#c3dc6a",
  track: "#e4e9d8",
  surfaceAccent: "#e7f1c4",
  border: "#d8dec9",
  danger: "#b42d1d",
};
const DISPLAY = '"Bricolage Grotesque Variable", system-ui, sans-serif';
const SANS = '"Geist Variable", system-ui, sans-serif';
const MONO = '"Geist Mono Variable", ui-monospace, monospace';

const X0 = 96;
const X1 = CARD - 96;
const W = X1 - X0;

type Ctx = CanvasRenderingContext2D;

async function loadFonts() {
  if (!("fonts" in document)) return;
  await Promise.all([
    document.fonts.load(`800 80px ${DISPLAY}`),
    document.fonts.load(`700 54px ${DISPLAY}`),
    document.fonts.load(`400 30px ${SANS}`),
    document.fonts.load(`600 30px ${SANS}`),
    document.fonts.load(`500 24px ${MONO}`),
  ]).catch(() => undefined);
}

function font(ctx: Ctx, f: string, spacing = 0) {
  ctx.font = f;
  if ("letterSpacing" in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${spacing}px`;
}

/** Coupe un texte en lignes qui tiennent dans `max` px, au plus `lines` lignes (… à la fin) */
function wrap(ctx: Ctx, text: string, max: number, lines = 2): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= max || !cur) cur = next;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  if (out.length <= lines) return out;
  const kept = out.slice(0, lines);
  let last = kept[lines - 1]!;
  while (ctx.measureText(`${last}…`).width > max && last.length > 1) last = last.slice(0, -1);
  kept[lines - 1] = `${last.trimEnd()}…`;
  return kept;
}

/** Texte sur une ligne, raccourci avec … s'il dépasse */
function fit(ctx: Ctx, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function pill(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Fond, panneau, logo et bandeau de pied : commun aux trois images */
function frame(ctx: Ctx, eyebrow: string, path: string) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CARD, CARD);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(40, 40, CARD - 80, CARD - 80, 48);
  ctx.clip();
  ctx.fillStyle = C.panel;
  ctx.fillRect(40, 40, CARD - 80, CARD - 80);
  // Bandeau olive : d'où vient l'image
  ctx.fillStyle = C.accent;
  ctx.fillRect(40, 904, CARD - 80, 136);
  ctx.restore();

  // ev·ly
  font(ctx, `700 54px ${DISPLAY}`, -1.5);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.text;
  ctx.fillText("ev", X0, 140);
  const ev = ctx.measureText("ev").width;
  ctx.fillStyle = C.accent;
  ctx.fillText("·", X0 + ev, 140);
  const dot = ctx.measureText("·").width;
  ctx.fillStyle = C.text;
  ctx.fillText("ly", X0 + ev + dot, 140);

  font(ctx, `500 24px ${MONO}`, 0);
  ctx.fillStyle = C.faint;
  ctx.textAlign = "right";
  ctx.fillText("ev-ly.com", X1, 134);
  ctx.textAlign = "left";

  font(ctx, `600 24px ${MONO}`, 2.5);
  ctx.fillStyle = C.accent;
  ctx.fillText(eyebrow.toUpperCase(), X0, 222);

  font(ctx, `600 28px ${SANS}`, 0);
  ctx.fillStyle = C.lime;
  ctx.fillText("Calculé sur ev-ly.com", X0, 964);
  font(ctx, `500 22px ${MONO}`, 0);
  ctx.fillStyle = C.on;
  ctx.fillText(fit(ctx, path, 520), X0, 1002);
  font(ctx, `400 22px ${SANS}`, 0);
  ctx.textAlign = "right";
  ctx.fillText("Autonomie réelle,", X1, 964);
  ctx.fillText("chaque chiffre sourcé", X1, 1000);
  ctx.textAlign = "left";
}

/** Titre (une ou deux lignes) puis sous-titre ; renvoie le bas du bloc */
function heading(ctx: Ctx, title: string, subtitle: string | null, preferred = 80): number {
  // Un titre court qui déborde d'un rien tient sur une ligne en plus petit
  let size = preferred;
  font(ctx, `800 ${size}px ${DISPLAY}`, -size * 0.035);
  if (wrap(ctx, title, W, 2).length > 1) {
    const smaller = Math.round(preferred * 0.84);
    font(ctx, `800 ${smaller}px ${DISPLAY}`, -smaller * 0.035);
    if (wrap(ctx, title, W, 2).length === 1) size = smaller;
    else font(ctx, `800 ${size}px ${DISPLAY}`, -size * 0.035);
  }
  ctx.fillStyle = C.text;
  const lines = wrap(ctx, title, W, 2);
  let y = 222 + size * 1.15;
  for (const l of lines) {
    ctx.fillText(l, X0, y);
    y += size * 1.02;
  }
  if (!subtitle) return y - size * 0.45;
  font(ctx, `400 30px ${SANS}`, 0);
  ctx.fillStyle = C.muted;
  const sub = wrap(ctx, subtitle, W, 2);
  y += 2;
  for (const l of sub) {
    ctx.fillText(l, X0, y);
    y += 40;
  }
  return y - 30;
}

interface Stat {
  label: string;
  value: string;
  note?: string;
}

/** Rangée de chiffres en colonnes, en bas de l'image */
function stats(ctx: Ctx, list: Stat[], y = 788) {
  const col = W / list.length;
  list.forEach((s, i) => {
    const x = X0 + i * col;
    font(ctx, `600 22px ${SANS}`, 0);
    ctx.fillStyle = C.faint;
    ctx.fillText(fit(ctx, s.label, col - 24), x, y);
    font(ctx, `800 52px ${DISPLAY}`, -1.6);
    ctx.fillStyle = C.text;
    ctx.fillText(fit(ctx, s.value, col - 24), x, y + 58);
    if (s.note) {
      font(ctx, `400 21px ${SANS}`, 0);
      ctx.fillStyle = C.muted;
      ctx.fillText(fit(ctx, s.note, col - 24), x, y + 92);
    }
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("image"))), "image/png"));
}

async function canvasCard(draw: (ctx: Ctx) => void | Promise<void>): Promise<Blob> {
  await loadFonts();
  const canvas = document.createElement("canvas");
  canvas.width = CARD;
  canvas.height = CARD;
  const ctx = canvas.getContext("2d")!;
  await draw(ctx);
  return toBlob(canvas);
}

/* ── Ma semaine ─────────────────────────────────────────────────── */

export interface WeekCardDay {
  /** Lun, Mar… */
  name: string;
  start: number;
  end: number;
  /** Part de batterie ajoutée ce jour-là (0 à 1) */
  added: number;
  low: boolean;
}

export interface WeekCard {
  verdict: string;
  vehicle: string;
  season: "summer" | "winter";
  days: WeekCardDay[];
  km: number;
  lowest: number;
  /** Énergie sur un an (€), électrique et essence */
  elecYear: number | null;
  petrolYear: number | null;
  /** Comparaison de 2 ou 3 modèles : une ligne chacun, à la place de la frise */
  compare?: { name: string; verdict: string; elecYear: number | null }[];
}

const nf = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ");
const pct = (x: number) => `${Math.round(Math.max(0, x) * 100)} %`;

export function drawWeekCard(d: WeekCard): Promise<Blob> {
  return canvasCard((ctx) => {
    frame(ctx, "Ma semaine en électrique", "ev-ly.com/ma-semaine");
    const seasonLabel = d.season === "winter" ? "en hiver (-5 °C)" : "en été";
    if (d.compare?.length) {
      heading(ctx, `${d.compare.length} modèles sur la même semaine`, `${nf(d.km)} km par semaine, ${seasonLabel}`, 66);
      let y = 470;
      for (const row of d.compare.slice(0, 3)) {
        pill(ctx, X0, y, W, 104, 28, C.surfaceAccent);
        font(ctx, `700 32px ${DISPLAY}`, -0.6);
        ctx.fillStyle = C.text;
        ctx.fillText(fit(ctx, row.name, W - 300), X0 + 30, y + 46);
        font(ctx, `400 25px ${SANS}`, 0);
        ctx.fillStyle = C.muted;
        ctx.fillText(fit(ctx, row.verdict, W - 300), X0 + 30, y + 82);
        if (row.elecYear !== null) {
          font(ctx, `800 40px ${DISPLAY}`, -1);
          ctx.fillStyle = C.accentDim;
          ctx.textAlign = "right";
          ctx.fillText(`${nf(row.elecYear)} €`, X1 - 30, y + 54);
          font(ctx, `400 21px ${SANS}`, 0);
          ctx.fillStyle = C.faint;
          ctx.fillText("d'électricité par an", X1 - 30, y + 84);
          ctx.textAlign = "left";
        }
        y += 124;
      }
      return;
    }

    const bottom = heading(ctx, d.verdict, `${d.vehicle}, ${seasonLabel}`);
    // Frise : une jauge par jour, niveau du matin en lime, niveau du soir en olive ; elle prend
    // la place que laisse le titre, au-dessus des chiffres
    const top = Math.max(482, bottom + 86);
    const h = 678 - top;
    const col = W / 7;
    const gw = 60;
    d.days.forEach((day, i) => {
      const cx = X0 + col * i + col / 2;
      const x = cx - gw / 2;
      pill(ctx, x, top, gw, h, 18, C.track);
      const startH = Math.max(0, Math.min(1, day.start)) * h;
      const endH = Math.max(0, Math.min(1, day.end)) * h;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, top, gw, h, 18);
      ctx.clip();
      ctx.fillStyle = C.soft;
      ctx.fillRect(x, top + h - startH, gw, startH);
      ctx.fillStyle = day.low ? C.danger : C.accent;
      ctx.fillRect(x, top + h - endH, gw, endH);
      ctx.restore();
      font(ctx, `600 24px ${SANS}`, 0);
      ctx.textAlign = "center";
      ctx.fillStyle = C.text;
      ctx.fillText(day.name, cx, top + h + 40);
      font(ctx, `500 20px ${MONO}`, 0);
      ctx.fillStyle = C.faint;
      ctx.fillText(pct(day.end), cx, top + h + 68);
      if (day.added > 0.005) {
        pill(ctx, cx - 40, top - 46, 80, 34, 17, C.lime);
        font(ctx, `700 20px ${SANS}`, 0);
        ctx.fillStyle = C.accentDim;
        ctx.fillText(`+${Math.round(Math.min(1, day.added) * 100)} %`, cx, top - 22);
      }
      ctx.textAlign = "left";
    });

    const list: Stat[] = [
      { label: "Par semaine", value: `${nf(d.km)} km` },
      { label: "Batterie au plus bas", value: pct(d.lowest) },
    ];
    if (d.elecYear !== null)
      list.push({ label: "Électricité sur un an", value: `${nf(d.elecYear)} €`, note: d.petrolYear !== null ? `contre ${nf(d.petrolYear)} € d'essence` : undefined });
    stats(ctx, list, 798);
  });
}

/* ── Grand trajet ──────────────────────────────────────────────── */

export interface TripCard {
  from: string | null;
  to: string;
  vehicle: string;
  season: "summer" | "winter";
  speed: number;
  /** Aller : km, minutes de route et de recharge, batterie à l'arrivée (0 à 1) */
  km: number;
  driveMinutes: number | null;
  chargeMinutes: number;
  arrive: number | null;
  /** Arrêts de l'aller ; posés sur la ligne quand on connaît leurs bornes (`stops`) */
  stopCount: number;
  stops: { km: number; name: string; kw: number; minutes: number }[];
}

export const duration = (min: number) => {
  const m = Math.max(5, Math.ceil(min / 5) * 5);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};

export function drawTripCard(d: TripCard): Promise<Blob> {
  return canvasCard((ctx) => {
    frame(ctx, "Grand trajet en électrique", "ev-ly.com/ma-semaine");
    const title = d.from ? `${d.from} → ${d.to}` : `Vers ${d.to}`;
    const bottom = heading(
      ctx,
      title,
      `${d.vehicle}, ${d.season === "winter" ? "en hiver (-5 °C)" : "en été"}, ${d.speed} km/h sur autoroute`,
      title.length > 22 ? 68 : 80
    );

    // Le trajet en ligne droite, les arrêts posés à leur kilomètre
    const y = Math.max(600, bottom + 130);
    const x0 = X0 + 14;
    const x1 = X1 - 14;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    const dotAt = (x: number, r: number, fill: string, ring?: string) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (ring) {
        ctx.lineWidth = 6;
        ctx.strokeStyle = ring;
        ctx.stroke();
      }
    };
    dotAt(x0, 14, C.accent);
    dotAt(x1, 14, C.accentDim);
    // Tous les arrêts sur la ligne ; leurs noms tant qu'ils tiennent (six au plus, en quinconce)
    const shown = d.stops;
    const labelled = shown.length <= 6;
    shown.forEach((s, i) => {
      const x = x0 + (Math.min(s.km, d.km) / Math.max(1, d.km)) * (x1 - x0);
      dotAt(x, 18, C.lime, C.accent);
      if (!labelled) return;
      const above = i % 2 === 0;
      font(ctx, `600 22px ${SANS}`, 0);
      ctx.fillStyle = C.text;
      ctx.textAlign = "center";
      const name = fit(ctx, s.name, 230);
      ctx.fillText(name, Math.min(Math.max(x, X0 + 115), X1 - 115), above ? y - 66 : y + 62);
      font(ctx, `500 20px ${MONO}`, 0);
      ctx.fillStyle = C.faint;
      ctx.fillText(`km ${nf(s.km)} · ${duration(s.minutes)}`, Math.min(Math.max(x, X0 + 115), X1 - 115), above ? y - 38 : y + 90);
      ctx.textAlign = "left";
    });
    if (!shown.length) {
      font(ctx, `600 26px ${SANS}`, 0);
      ctx.fillStyle = C.accentDim;
      ctx.textAlign = "center";
      const n = d.stopCount;
      ctx.fillText(n ? `${n} ${n > 1 ? "arrêts" : "arrêt"} de recharge, estimés sur une borne de 150 kW` : "Sans arrêt de recharge", (x0 + x1) / 2, y - 40);
      ctx.textAlign = "left";
    }

    const list: Stat[] = [
      { label: "Distance, aller", value: `${nf(d.km)} km` },
      {
        label: d.stopCount ? `${d.stopCount} ${d.stopCount > 1 ? "arrêts" : "arrêt"} de recharge` : "Recharge en route",
        value: d.stopCount ? duration(d.chargeMinutes) : "aucune",
      },
    ];
    if (d.driveMinutes !== null)
      list.push({ label: "Trajet complet", value: duration(d.driveMinutes + d.chargeMinutes), note: d.arrive !== null ? `arrivée avec ${pct(d.arrive)}` : undefined });
    stats(ctx, list, 798);
  });
}

/* ── Duel ──────────────────────────────────────────────────────── */

export interface DuelCard {
  a: { name: string; image: string | null };
  b: { name: string; image: string | null };
  rows: { label: string; a: string; b: string; winner: "a" | "b" | null }[];
  path: string;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Photo ajustée dans sa boîte, fondue dans le panneau (fond blanc des photos) */
function photo(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * r;
  const dh = img.naturalHeight * r;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(img, x + (w - dw) / 2, y + h - dh, dw, dh);
  ctx.restore();
}

export function drawDuelCard(d: DuelCard): Promise<Blob> {
  return canvasCard(async (ctx) => {
    frame(ctx, "Duel", d.path);
    const title = `${d.a.name} ou ${d.b.name} ?`;
    heading(ctx, title, null, title.length > 30 ? 60 : 70);

    const [ia, ib] = await Promise.all([d.a.image ? loadImage(d.a.image) : null, d.b.image ? loadImage(d.b.image) : null]);
    const boxW = W / 2 - 40;
    const boxY = 420;
    const boxH = 170;
    pill(ctx, X0, boxY - 10, W, boxH + 20, 28, C.bg);
    if (ia) photo(ctx, ia, X0 + 10, boxY, boxW - 20, boxH);
    if (ib) photo(ctx, ib, X1 - boxW + 10, boxY, boxW - 20, boxH);
    font(ctx, `800 30px ${DISPLAY}`, 0);
    ctx.fillStyle = C.faint;
    ctx.textAlign = "center";
    ctx.fillText("vs", CARD / 2, boxY + boxH / 2 + 10);
    ctx.textAlign = "left";

    // Les critères qui comptent : valeur de chaque côté, la meilleure en olive
    let y = 652;
    for (const row of d.rows.slice(0, 4)) {
      font(ctx, `500 21px ${SANS}`, 0);
      ctx.fillStyle = C.faint;
      ctx.textAlign = "center";
      ctx.fillText(fit(ctx, row.label, 330), CARD / 2, y);
      for (const side of ["a", "b"] as const) {
        const win = row.winner === side;
        font(ctx, `${win ? 800 : 600} 36px ${DISPLAY}`, -0.8);
        const text = fit(ctx, row[side], 300);
        const tw = ctx.measureText(text).width;
        const x = side === "a" ? X0 : X1 - tw;
        if (win) pill(ctx, x - 14, y - 34, tw + 28, 48, 24, C.lime);
        ctx.textAlign = "left";
        ctx.fillStyle = win ? C.accentDim : C.muted;
        ctx.fillText(text, x, y);
      }
      ctx.textAlign = "left";
      y += 62;
    }
  });
}

/* ── Partage ───────────────────────────────────────────────────── */

/** Le navigateur sait partager un fichier image (téléphone, Safari, Edge) */
export function canShareFile(): boolean {
  try {
    const f = new File([new Blob()], "x.png", { type: "image/png" });
    return !!navigator.canShare?.({ files: [f] });
  } catch {
    return false;
  }
}

export function canCopyImage(): boolean {
  return typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
}
