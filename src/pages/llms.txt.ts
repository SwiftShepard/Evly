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
- [Électrique ou thermique : coût réel](${abs("/simulateur/")}): coût total sur 1 à 10 ans, en particulier ou pour une société, avec la consommation réelle de la version.
- [Ma semaine en électrique](${abs("/ma-semaine/")}): depuis une adresse, semaine type avec un modèle (travail, courses, loisirs), recharges à la maison, au travail ou sur borne publique, coût de l'énergie face à l'essence, kilométrage annuel et forfait de location (LLD, LOA), carte de l'autonomie aller-retour en été et en hiver. Calcul dans le navigateur, sur les vraies routes.
- [Recommandation guidée](${abs("/recommandation/")}): questionnaire de choix selon l'usage.
- [Duels](${abs("/comparer/duels/")}): deux modèles face à face (autonomie réelle, prix après aides, recharge, coffre), dont les paires [à prix égal](${abs("/bons-plans/")}).
- [Observatoire de l'autonomie réelle](${abs("/observatoire/")}): écart entre l'annonce WLTP et l'autonomie mesurée, par marque et par modèle ; données ouvertes CC BY 4.0 en [CSV](${abs("/donnees/autonomie-reelle.csv")}) et [JSON](${abs("/donnees/autonomie-reelle.json")}).
- [Nouveautés des données](${abs("/nouveautes/")}): nouveaux modèles, autonomies mesurées, prix ([RSS](${abs("/nouveautes/rss.xml")})).
- [Aides 2026](${abs("/aides/")}): barème de la prime CEE selon les revenus, leasing social, cas des sociétés.
- [Leasing social](${abs("/leasing-social/")}): conditions et véhicules éligibles.
- [Utilitaires électriques](${abs("/pro/vehicules/")}) et [voiture électrique d'entreprise](${abs("/pro/")}).
- [Méthodologie](${abs("/methodologie/")}): sources, protocoles de test et limites.
- [Glossaire](${abs("/glossaire/")}): vocabulaire de la voiture électrique.

## Liens qui répondent à une question

Ces liens ouvrent directement la réponse ; on peut les composer pour répondre à une question précise.

- Quelle voiture pour un trajet et un budget : ${abs("/recommandation/")}?trajet=80&max=30000 (trajet quotidien aller-retour en km, budget d'achat en €). Options : maison=0 (sans prise à domicile), budget=loyer&max=300 (loyer mensuel), format=city|sedan|suv|van, foyer=family|large.
- Un modèle sur un trajet réel : ${abs("/ma-semaine/")}?v=renault-5&domicile=Amiens&travail=Abbeville (communes ou adresses ; slug de la fiche). Options : vers=Lyon (grand trajet, arrêts de recharge sur les bornes du tracé), recharge=borne (sans prise à domicile), saison=ete (hiver par défaut), v=slug1,slug2 (jusqu'à 3 modèles).
- Deux modèles face à face : ${abs("/comparer/")}slug1-vs-slug2/ pour les duels publiés (liste sur la page Duels), sinon ${abs("/comparer/")}?v=slug1,slug2.

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
