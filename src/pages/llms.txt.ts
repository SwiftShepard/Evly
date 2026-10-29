import type { APIRoute } from "astro";
import { getAllVehicles } from "@/lib/vehicles";
import { getBrands } from "@/lib/brands";
import { CATEGORIES } from "@/data/categories";
import { LEGAL_PAGES } from "@/data/legal";
import { getVehicleSeoFacts, getMarketStatus } from "@/lib/seo";
import { url } from "@/lib/url";
import { costText, duration, getTripResults, iceTripCost, stopsText, tripCostMedian, tripTitle } from "@/lib/roadTrips";
import { EVI, energyLabel, getEvVsIce } from "@/lib/evVsIce";
import { FUEL_PRICES } from "@/data/fuelPrices";

/**
 * /llms.txt : résumé du site au format proposé sur llmstxt.org, pour que les assistants IA
 * trouvent les bonnes pages et citent les chiffres avec leur niveau de confiance.
 */
export const GET: APIRoute = async ({ site }) => {
  const abs = (path: string) => new URL(url(path), site).toString();
  const n = (x: number) => x.toLocaleString("fr-FR").replace(/ | /g, " ");
  const vehicles = getAllVehicles();
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
  const tripLines = (await getTripResults()).map((r) => {
    const noStop = r.rows.filter((x) => x.summer.stops === 0).length;
    const fastest = r.rows[0];
    return `- [${tripTitle(r.axis)}](${abs(`/trajets/${r.axis.slug}/`)}): ${n(Math.round(r.km))} km, ${noStop} modèles sans arrêt l'été, ${stopsText(median(r.rows.map((x) => x.summer.stops)))} en médiane l'été et ${stopsText(median(r.rows.filter((x) => x.winter).map((x) => x.winter!.stops)))} par -5 °C${fastest ? `, le plus rapide ${fastest.name} en ${duration(fastest.summer.totalMin)}` : ""}, énergie de l'aller ${costText(tripCostMedian(r)).replace(/ /g, " ")} en médiane l'été contre ${n(Math.round(iceTripCost(r.km)))} € en essence.`;
  });

  const eviLines = getEvVsIce().map((c) => {
    const e = (x: number) => `${n(Math.round(x))} €`;
    const e2 = (x: number) => `${x.toFixed(2).replace(".", ",")} €`;
    const diff = c.total.ice - c.total.ev;
    return `- [${c.evName} ou ${c.iceName} ${energyLabel(c.twin)}](${abs(`/electrique-ou-essence/${c.twin.slug}/`)}): ${c.evVersion} à ${e(c.evNet)} après prime contre ${c.twin.version} à ${e(c.twin.price)} ; ${e2(c.ev100)} contre ${e2(c.ice100)} aux 100 km ; sur ${EVI.years} ans, l'électrique coûte ${diff > 0 ? `${e(diff)} de moins` : `${e(-diff)} de plus`}.`;
  });

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
- [Électrique ou essence, modèle par modèle](${abs("/electrique-ou-essence/")}): chaque électrique face à sa version essence ou hybride (liste plus bas).
- [Ma semaine en électrique](${abs("/ma-semaine/")}): depuis une adresse, semaine type avec un modèle (travail, courses, loisirs), recharges à la maison, au travail ou sur borne publique, coût de l'énergie face à l'essence, kilométrage annuel et forfait de location (LLD, LOA), carte de l'autonomie aller-retour en été et en hiver. Calcul dans le navigateur, sur les vraies routes.
- [Recommandation guidée](${abs("/recommandation/")}): questionnaire de choix selon l'usage.
- [Duels](${abs("/comparer/duels/")}): deux modèles face à face (autonomie réelle, prix après aides, recharge, coffre), dont les paires [à prix égal](${abs("/bons-plans/")}).
- [Observatoire de l'autonomie réelle](${abs("/observatoire/")}): écart entre l'annonce WLTP et l'autonomie mesurée, par marque et par modèle ; données ouvertes CC BY 4.0 en [CSV](${abs("/donnees/autonomie-reelle.csv")}) et [JSON](${abs("/donnees/autonomie-reelle.json")}).
- [Recharger chez soi](${abs("/recharge-a-domicile/")}): coût d'une recharge et aux 100 km selon l'option du compteur (base, heures creuses, Tempo) au tarif réglementé d'EDF en vigueur, et sur borne rapide ; prise renforcée ou borne. Chaque fiche donne ce coût pour ses versions.
- [Autonomie en hiver](${abs("/autonomie-hiver/")}): tout le catalogue classé par -5 °C (modèle de froid d'Evly appliqué à l'autonomie réelle, chimie et pompe à chaleur comprises), recalculable à toute température.
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

## Grands trajets

Chaque page classe tout le catalogue sur l'itinéraire : arrêts sur les bornes rapides réelles du tracé, temps de charge sur la courbe de la version, 130 km/h, été et -5 °C. Énergie : départ batterie pleine rechargée à la maison au tarif de base d'EDF, puis bornes rapides de 0,40 à 0,70 €/kWh selon le réseau ; essence : compacte à 6,5 l/100 km ; péages non comptés.

${tripLines.join("\n")}

## Électrique ou essence

La version électrique d'entrée face à la version thermique de même finition : prix catalogue (prime CEE de tout ménage déduite), consommations réelles des deux côtés (WLTP + 20,4 % pour l'essence, écart mesuré par la Commission européenne), SP95-E10 à ${FUEL_PRICES.e10.toFixed(2).replace(".", ",")} €/l, ${n(EVI.km)} km par an, entretien et assurance moyens de 2025 (Roole data, Assurland), revente après ${EVI.years} ans de ${EVI.resEv} % du prix catalogue en électrique et ${EVI.resIce} % en thermique (d'après Autovista) : le même calcul que le simulateur.

${eviLines.join("\n")}

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
