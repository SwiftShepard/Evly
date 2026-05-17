import { VehicleSchema, type Vehicle } from "@/data/schemas";

/**
 * Charge tous les véhicules depuis `src/data/vehicles/*.json` au build.
 * Vite résout `import.meta.glob` à la compilation : tout JSON malformé
 * fait casser le build immédiatement (fail-fast garanti par Zod).
 */

const modules = import.meta.glob<Record<string, unknown>>(
  "/src/data/vehicles/*.json",
  { eager: true, import: "default" }
);

const vehicles: Vehicle[] = Object.entries(modules)
  .map(([path, raw]) => {
    const result = VehicleSchema.safeParse(raw);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `  • ${i.path.join(".")} — ${i.message}`)
        .join("\n");
      throw new Error(
        `Fiche véhicule invalide dans ${path} :\n${message}\n` +
          `Corrige le JSON pour qu'il respecte le schéma Zod.`
      );
    }
    return result.data;
  })
  .sort((a, b) => {
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    if (a.model !== b.model) return a.model.localeCompare(b.model);
    return a.variant.localeCompare(b.variant);
  });

export function getAllVehicles(): Vehicle[] {
  return vehicles;
}

export function getVehicleBySlug(slug: string): Vehicle | undefined {
  return vehicles.find((v) => v.slug === slug);
}

export function getVehicleSlugs(): string[] {
  return vehicles.map((v) => v.slug);
}
