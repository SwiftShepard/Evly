import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Cartes de partage 1200 × 630 (Open Graph) générées au build avec sharp.
 * Polices du site (Inter, JetBrains Mono) chargées depuis @fontsource : le rendu
 * est identique en local et sur la CI, sans police système.
 */

const W = 1200;
const H = 630;
const PAD = 64;

const root = process.cwd();
const INTER = path.join(root, "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2");
const MONO = path.join(root, "node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2");

const C = {
  bg: "#ffffff",
  text: "#0f0f0f",
  muted: "#55554f",
  faint: "#8a8a84",
  accent: "#3a5c12",
  line: "#e6e5df",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ── Cache disque (node_modules/.astro, conservé entre deux builds CI) ── */

// À incrémenter dès que la mise en page des cartes change
const LAYOUT_VERSION = 1;
const CACHE_DIR = path.join(root, "node_modules/.astro/evly-og");

function photoFingerprint(slugs: string[]): string {
  const dir = path.join(root, "src/assets/vehicles");
  const files = fs.readdirSync(dir);
  return slugs
    .map((slug) => {
      const file = files.find((f) => f.replace(/\.[a-z]+$/i, "") === slug);
      return file ? crypto.createHash("sha1").update(fs.readFileSync(path.join(dir, file))).digest("hex") : "none";
    })
    .join(",");
}

async function cached(data: unknown, slugs: string[], render: () => Promise<Buffer>): Promise<Buffer> {
  const key = crypto
    .createHash("sha1")
    .update(JSON.stringify({ v: LAYOUT_VERSION, data, photos: photoFingerprint(slugs) }))
    .digest("hex");
  const file = path.join(CACHE_DIR, `${key}.jpg`);
  if (fs.existsSync(file)) return fs.readFileSync(file);
  const buffer = await render();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, buffer);
  return buffer;
}

interface TextOpts {
  size: number;
  color: string;
  weight?: number;
  width?: number;
  mono?: boolean;
  /** Interlettrage en px (négatif = serré) */
  tracking?: number;
}

async function text(content: string, o: TextOpts) {
  const spacing = o.tracking ? ` letter_spacing="${Math.round(o.tracking * 1024)}"` : "";
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${o.color}" font_weight="${o.weight ?? 400}"${spacing}>${content}</span>`,
      font: `${o.mono ? "JetBrains Mono" : "Inter"} ${o.size}`,
      fontfile: o.mono ? MONO : INTER,
      width: o.width,
      rgba: true,
      dpi: 72,
      spacing: Math.round(o.size * 0.08),
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
}

const rule = (y: number) =>
  Buffer.from(`<svg width="${W}" height="${H}"><rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="1" fill="${C.line}"/></svg>`);

async function wordmark() {
  return text(`ev<span foreground="${C.accent}">·</span>ly`, { size: 40, color: C.text, weight: 650, tracking: -1.2 });
}

/** Photo du véhicule recadrée sur son contenu et ajustée dans la boîte donnée, ou null si illisible. */
async function vehiclePhoto(slug: string, boxW: number, boxH: number) {
  const dir = path.join(root, "src/assets/vehicles");
  const file = fs.readdirSync(dir).find((f) => f.replace(/\.[a-z]+$/i, "") === slug);
  if (!file) return null;
  try {
    const trimmed = await sharp(path.join(dir, file)).trim({ threshold: 12 }).toBuffer();
    const { data, info } = await sharp(trimmed)
      .resize(boxW, boxH, { fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer({ resolveWithObject: true });
    return { input: data, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

export interface VehicleCardData {
  slug: string;
  brand: string;
  model: string;
  stats: { value: string; label: string; accent?: boolean }[];
}

/** Carte d'une fiche véhicule : nom, photo, trois chiffres clés. */
export function renderVehicleCard(d: VehicleCardData): Promise<Buffer> {
  return cached(d, [d.slug], () => drawVehicleCard(d));
}

async function drawVehicleCard(d: VehicleCardData): Promise<Buffer> {
  const layers: sharp.OverlayOptions[] = [];
  const mark = await wordmark();
  layers.push({ input: mark.input, left: PAD, top: 52 });

  const site = await text("ev-ly.com", { size: 20, color: C.faint, mono: true });
  layers.push({ input: site.input, left: W - PAD - site.width, top: 64 });

  const brand = await text(esc(d.brand.toUpperCase()), { size: 22, color: C.faint, mono: true, tracking: 2 });
  layers.push({ input: brand.input, left: PAD, top: 150 });

  const model = await text(esc(d.model), { size: d.model.length > 22 ? 56 : 72, color: C.text, weight: 650, width: 500, tracking: -2 });
  layers.push({ input: model.input, left: PAD, top: 186 });

  const photo = await vehiclePhoto(d.slug, 600, 300);
  if (photo) {
    layers.push({ input: photo.input, left: W - PAD - photo.width + 20, top: 410 - photo.height });
  }

  layers.push({ input: rule(440), left: 0, top: 0 });

  const colW = (W - PAD * 2) / d.stats.length;
  for (const [i, s] of d.stats.entries()) {
    const x = Math.round(PAD + i * colW);
    const value = await text(esc(s.value), { size: 54, color: s.accent ? C.accent : C.text, weight: 650, tracking: -1.5 });
    const label = await text(esc(s.label.toUpperCase()), { size: 17, color: C.faint, mono: true, tracking: 1.2, width: Math.round(colW - 24) });
    layers.push({ input: value.input, left: x, top: 470 });
    layers.push({ input: label.input, left: x, top: 470 + value.height + 10 });
  }

  return sharp({ create: { width: W, height: H, channels: 3, background: C.bg } })
    .composite(layers)
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

export interface PageCardData {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Jusqu'à 3 slugs de véhicules affichés en bas à droite */
  vehicles?: string[];
}

/** Carte générique : catalogue, marques, catégories, outils. */
export function renderPageCard(d: PageCardData): Promise<Buffer> {
  return cached(d, d.vehicles?.slice(0, 3) ?? [], () => drawPageCard(d));
}

async function drawPageCard(d: PageCardData): Promise<Buffer> {
  const layers: sharp.OverlayOptions[] = [];
  const mark = await wordmark();
  layers.push({ input: mark.input, left: PAD, top: 52 });

  const site = await text("ev-ly.com", { size: 20, color: C.faint, mono: true });
  layers.push({ input: site.input, left: W - PAD - site.width, top: 64 });

  const eyebrow = await text(esc(d.eyebrow.toUpperCase()), { size: 22, color: C.accent, mono: true, tracking: 2, weight: 600 });
  layers.push({ input: eyebrow.input, left: PAD, top: 170 });

  const hasCars = (d.vehicles?.length ?? 0) > 0;
  const title = await text(esc(d.title), { size: d.title.length > 34 ? 52 : 60, color: C.text, weight: 650, width: W - PAD * 2, tracking: -1.6 });
  layers.push({ input: title.input, left: PAD, top: 208 });

  if (d.subtitle) {
    const sub = await text(esc(d.subtitle), { size: 26, color: C.muted, width: hasCars ? 520 : 900 });
    layers.push({ input: sub.input, left: PAD, top: 208 + title.height + 22 });
  }

  if (hasCars) {
    // Rangée de photos en bas à droite, légèrement chevauchées
    const slugs = d.vehicles!.slice(0, 3);
    const photos = (await Promise.all(slugs.map((s) => vehiclePhoto(s, 250, 120)))).filter((p) => p !== null);
    let right = W - PAD + 10;
    for (const p of photos.reverse()) {
      layers.push({ input: p.input, left: right - p.width, top: H - 48 - p.height });
      right -= p.width - 30;
    }
  } else {
    const foot = await text("Comparateur indépendant · autonomies réelles mesurées", { size: 18, color: C.faint, mono: true });
    layers.push({ input: foot.input, left: PAD, top: H - 56 - foot.height });
  }

  return sharp({ create: { width: W, height: H, channels: 3, background: C.bg } })
    .composite(layers)
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}
