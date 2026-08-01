const imageModules = import.meta.glob<string>(
  "/src/assets/vehicles/*.{jpeg,jpg,png,webp,avif,svg}",
  { query: "?url", import: "default", eager: true }
);

export function getLocalVehicleImageUrl(slug: string): string | null {
  for (const [path, url] of Object.entries(imageModules)) {
    const stem = path.split("/").at(-1)!.replace(/\.(jpeg|jpg|png|webp|avif|svg)$/i, "");
    if (stem === slug) {
      return url;
    }
  }
  return null;
}
