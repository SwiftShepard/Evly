import type { APIRoute } from "astro";
import { CITATION, DATA_FIELDS, DATA_LICENSE, getOpenDataRecords } from "@/lib/observatory";
import { url } from "@/lib/url";

/** Données ouvertes de l'observatoire en JSON (mêmes lignes que le CSV, nombres décimaux à point) */
export const GET: APIRoute = ({ site }) => {
  const body = {
    titre: "Autonomie réelle des voitures électriques vendues en France",
    description:
      "Une ligne par version : autonomie annoncée (WLTP), autonomie réelle (mixte, 130 km/h, ville, -5 °C), écart à l'annonce et niveau de confiance. Chiffres calculés par Evly à partir d'essais sur route sourcés (Bjørn Nyland, presse) ou estimés quand la version n'a pas encore été essayée.",
    licence: { nom: DATA_LICENSE.name, url: DATA_LICENSE.url },
    citation: CITATION,
    page: new URL(url("/observatoire/"), site).toString(),
    methode: new URL(url("/methodologie/"), site).toString(),
    genere_le: new Date().toISOString(),
    champs: DATA_FIELDS.map((f) => ({ cle: f.key, description: f.label })),
    versions: getOpenDataRecords(site),
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
