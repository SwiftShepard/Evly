import type { APIRoute } from "astro";
import { getAllVehicles } from "@/lib/vehicles";
import { getBrands } from "@/lib/brands";
import { CATEGORIES } from "@/data/categories";
import { LEGAL_PAGES } from "@/data/legal";
import { getVehicleSeoFacts, getMarketStatus } from "@/lib/seo";
import { url } from "@/lib/url";

/**
 * /llms.txt : résumé du site au format proposé sur llmstxt.org, pour que les assistants IA
 * trouvent les bonnes pages et citent les chiffres avec leur niveau de confiance.
 */
export const GET: APIRoute = ({ site }) => {
  const abs = (path: string) => new URL(url(path), site).toString();
  const n = (x: number) => x.toLocaleString("fr-FR").replace(/ | /g, " ");
  const vehicles = getAllVehicles();

  const vehicleLines = vehicles.map((v) => {
    const f = getVehicleSeoFacts(v);
    const parts = [
      f.priceMin != null ? `dès ${n(f.priceMin)} €` : "prix non communiqué",
      `autonomie réelle mixte ${n(f.rangeBest)} km (${f.rangeBestMeasured ? "mesurée" : "estimée"})`,
      `WLTP ${n(f.wltpMax)} km`,
      f.dcMin != null ? `recharge 10-80 % en ${f.dcMin} min` : "pas de recharge rapide",
    ];
    const status = getMarketStatus(v);
    if (status === "discontinued") parts.push("plus commercialisé");
    if (status === "upcoming") parts.push("à venir");
    if (status === "preorder") parts.push("en précommande");
    return `- [${f.name}](${abs(`/vehicules/${v.slug}/`)}): ${parts.join(", ")}. Mise à jour ${v.lastUpdated}.`;
  });

  const body = `# Evly

> Comparateur indépendant de voitures électriques pour le marché français : autonomies réelles mesurées (tests Bjørn Nyland, EVKX, ArenaEV, presse), temps de recharge, prix publics, aides (prime CEE, leasing social) et coût total de possession. Aucune publicité, aucun lien affilié, aucune rémunération des constructeurs.

Langue : français. ${vehicles.length} modèles. Les pages sont du HTML statique, lisible sans JavaScript ; chaque fiche contient des données structurées schema.org.

Pour citer un chiffre : indiquez la page Evly et son niveau de confiance (« mesurée » ou « estimée » pour l'autonomie). Les prix et les aides sont indicatifs et datés sur chaque fiche ; ils doivent être confirmés auprès du constructeur et des organismes officiels.

## Pages principales

- [Catalogue des voitures électriques](${abs("/vehicules/")}): tous les modèles, filtres par prix, autonomie, recharge, coffre et aides.
- [Comparateur](${abs("/comparer/")}): jusqu'à 4 véhicules côte à côte.
- [Simulateur de coût total](${abs("/simulateur/")}): électrique contre thermique sur 1 à 10 ans.
- [Recommandation guidée](${abs("/recommandation/")}): questionnaire de choix selon l'usage.
- [Leasing social](${abs("/leasing-social/")}): conditions et véhicules éligibles.
- [Bons plans](${abs("/bons-plans/")}): alternatives moins chères à budget égal.
- [Utilitaires électriques](${abs("/pro/vehicules/")}) et [offre flottes](${abs("/pro/")}).
- [Méthodologie](${abs("/methodologie/")}): sources, protocoles de test et limites.
- [Glossaire](${abs("/glossaire/")}): vocabulaire de la voiture électrique.

## Sélections

${CATEGORIES.map((c) => `- [${c.label}](${abs(`/voitures-electriques/${c.slug}/`)})`).join("\n")}

## Marques

${getBrands().map((b) => `- [${b.name}](${abs(`/marques/${b.slug}/`)})`).join("\n")}

## Fiches véhicules

${vehicleLines.join("\n")}

## Informations légales

${LEGAL_PAGES.map((p) => `- [${p.label}](${abs(p.path)})`).join("\n")}
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
