import type { APIRoute } from "astro";
import { getVehicleIndex } from "@/lib/vehicleIndex";

/**
 * /recherche.json : index compact des modèles, chargé à la demande par la recherche
 * instantanée (navigation) et par la sélection « selon votre trajet » de l'accueil.
 * Généré au build ; aucune donnée personnelle.
 */
export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await getVehicleIndex()), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
