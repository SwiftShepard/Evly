import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

/**
 * Marges transparentes d'une photo véhicule détourée (build uniquement).
 * Beaucoup de photos gardent un large vide sous les roues : pour poser une voiture
 * sur une « ligne de sol », il faut décaler l'image de cette marge.
 * Fractions de la taille de l'image (0 à 1).
 */
export interface ContentMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const NONE: ContentMargins = { top: 0, right: 0, bottom: 0, left: 0 };
const cache = new Map<string, Promise<ContentMargins>>();

export function getContentMargins(slug: string): Promise<ContentMargins> {
  let pending = cache.get(slug);
  if (!pending) {
    pending = measure(slug);
    cache.set(slug, pending);
  }
  return pending;
}

async function measure(slug: string): Promise<ContentMargins> {
  const dir = path.join(process.cwd(), "src/assets/vehicles");
  const file = fs.readdirSync(dir).find((f) => f.replace(/\.[a-z]+$/i, "") === slug);
  if (!file) return NONE;
  try {
    const src = path.join(dir, file);
    const { width = 0, height = 0 } = await sharp(src).metadata();
    const { info } = await sharp(src).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
    if (!width || !height) return NONE;
    const left = -(info.trimOffsetLeft ?? 0);
    const top = -(info.trimOffsetTop ?? 0);
    return {
      top: top / height,
      left: left / width,
      right: (width - left - info.width) / width,
      bottom: (height - top - info.height) / height,
    };
  } catch {
    // Image illisible par sharp : pas de compensation plutôt qu'un build cassé
    return NONE;
  }
}
