import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

/**
 * Photos véhicules optimisées au build (WebP redimensionné + srcset).
 * Les originaux pèsent jusqu'à 4 Mo : ne jamais les servir tels quels dans une page.
 * Côté serveur uniquement (getImage) ; les îlots React passent par vehicleImages.ts.
 */

// NOTE: import.meta.glob est résolu statiquement. Après ajout d'une image en dev,
// redémarrer le serveur (ou sauvegarder ce fichier) pour forcer un nouveau scan.
const modules = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/vehicles/*.{jpeg,jpg,png,webp,avif}",
  { eager: true }
);

const bySlug = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(modules)) {
  const stem = path.split("/").at(-1)!.replace(/\.(jpeg|jpg|png|webp|avif)$/i, "");
  bySlug.set(stem, mod.default);
}

export interface OptimizedImage {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

const cache = new Map<string, Promise<OptimizedImage | null>>();

/** Photo du véhicule déclinée aux largeurs demandées (la plus petite sert de src). */
export function getVehicleImage(slug: string, widths: number[] = [240, 480]): Promise<OptimizedImage | null> {
  const key = `${slug}|${widths.join(",")}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = optimize(slug, widths);
    cache.set(key, pending);
  }
  return pending;
}

async function optimize(slug: string, widths: number[]): Promise<OptimizedImage | null> {
  const meta = bySlug.get(slug);
  if (!meta) return null;
  try {
    const sizes = [...new Set(widths.map((w) => Math.min(w, meta.width)))].sort((a, b) => a - b);
    const images = await Promise.all(sizes.map((width) => getImage({ src: meta, width, format: "webp", quality: 80 })));
    const largest = images.at(-1)!;
    return {
      src: images[0]!.src,
      srcset: images.map((img) => `${img.src} ${img.attributes.width}w`).join(", "),
      width: Number(largest.attributes.width),
      height: Number(largest.attributes.height),
    };
  } catch {
    // Format que sharp ne sait pas décoder : on garde l'original plutôt que de casser le build
    return { src: meta.src, srcset: "", width: meta.width, height: meta.height };
  }
}

/** URL absolue d'une version 1200 px (données structurées, Google Images). */
export async function getVehicleImageAbsolute(slug: string, site: URL | undefined): Promise<string | null> {
  const img = await getVehicleImage(slug, [1200]);
  return img && site ? new URL(img.src, site).toString() : null;
}
