import type { APIRoute, GetStaticPaths } from "astro";
import { renderPageCard, renderVehicleCard, type PageCardData, type VehicleCardData } from "@/lib/og";
import { getPageCards } from "@/lib/ogPages";
import { getAllVehicles } from "@/lib/vehicles";
import { getBrands } from "@/lib/brands";
import { CATEGORIES } from "@/data/categories";
import { getVehicleSeoFacts } from "@/lib/seo";
import { formatPrice } from "@/lib/format";

/**
 * Cartes de partage (Open Graph) générées au build :
 *   /og/vehicules/{slug}.jpg, /og/marques/{marque}.jpg,
 *   /og/selections/{slug}.jpg, /og/pages/{clé}.jpg
 */

type Card = { kind: "vehicle"; data: VehicleCardData } | { kind: "page"; data: PageCardData };

export const getStaticPaths = (() => {
  const all = getAllVehicles();
  const paths: { params: { path: string }; props: Card }[] = [];

  for (const v of all) {
    const f = getVehicleSeoFacts(v);
    paths.push({
      params: { path: `vehicules/${v.slug}` },
      props: {
        kind: "vehicle",
        data: {
          slug: v.slug,
          brand: v.brand,
          model: v.model,
          stats: [
            { value: `${f.rangeBest} km`, label: `Autonomie réelle ${f.rangeBestMeasured ? "mesurée" : "estimée"}`, accent: true },
            { value: f.priceMin != null ? formatPrice(f.priceMin) : "NC", label: f.priceMin != null ? "Prix d'entrée" : "Prix non communiqué" },
            f.dcMin != null
              ? { value: `${f.dcMin} min`, label: "Recharge 10 → 80 %" }
              : { value: `${v.chargingAC.onboardCharger_kW} kW`, label: "Recharge AC" },
          ],
        },
      },
    });
  }

  for (const b of getBrands()) {
    const models = b.vehicles.length;
    paths.push({
      params: { path: `marques/${b.slug}` },
      props: {
        kind: "page",
        data: {
          eyebrow: "Marque",
          title: `Voitures électriques ${b.name}`,
          subtitle:
            b.priceMin != null
              ? `${models} modèle${models > 1 ? "s" : ""}, de ${formatPrice(b.priceMin)} à ${formatPrice(b.priceMax!)}. Autonomies réelles et prix.`
              : `${models} modèle${models > 1 ? "s" : ""} comparé${models > 1 ? "s" : ""}.`,
          vehicles: (b.cars.length ? b.cars : b.vehicles).slice(0, 3).map((v) => v.slug),
        },
      },
    });
  }

  for (const c of CATEGORIES) {
    const list = c.select(all);
    paths.push({
      params: { path: `selections/${c.slug}` },
      props: {
        kind: "page",
        data: { eyebrow: c.eyebrow, title: c.h1, subtitle: undefined, vehicles: list.slice(0, 3).map((v) => v.slug) },
      },
    });
  }

  for (const [key, data] of Object.entries(getPageCards())) {
    paths.push({ params: { path: `pages/${key}` }, props: { kind: "page", data } });
  }

  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const card = props as Card;
  const buffer = card.kind === "vehicle" ? await renderVehicleCard(card.data) : await renderPageCard(card.data);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/jpeg" },
  });
};
