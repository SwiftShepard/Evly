import type { APIRoute } from "astro";
import { changeSummary, getDataUpdates, itemText } from "@/lib/dataHistory";
import { getVehicleBySlug } from "@/lib/vehicles";
import { getVehicleName } from "@/lib/seo";
import { url } from "@/lib/url";

/**
 * /nouveautes/rss.xml : un élément par modèle et par mise à jour (nouveau modèle, autonomie
 * mesurée, prix…), les plus récents d'abord. Même source que la page /nouveautes/.
 */
const MAX_ITEMS = 60;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const GET: APIRoute = ({ site }) => {
  const abs = (path: string) => new URL(url(path), site).toString();
  const updates = getDataUpdates();
  const items = updates
    .flatMap((u) =>
      u.vehicles.map((v) => {
        const current = getVehicleBySlug(v.slug);
        const name = current ? getVehicleName(current) : v.name;
        const link = current ? abs(`/vehicules/${v.slug}/`) : abs("/nouveautes/");
        const lines = v.items.map((it) => `<li>${esc(itemText(it))}</li>`).join("");
        return `    <item>
      <title>${esc(`${name} : ${changeSummary(v).replace(/^./, (c) => c.toLowerCase())}`)}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${u.sha.slice(0, 12)}-${v.slug}</guid>
      <pubDate>${new Date(u.date).toUTCString()}</pubDate>
      <description>${esc(`<ul>${lines}</ul>`)}</description>
    </item>`;
      })
    )
    .slice(0, MAX_ITEMS);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Evly : nouveautés des données</title>
    <link>${abs("/nouveautes/")}</link>
    <atom:link href="${abs("/nouveautes/rss.xml")}" rel="self" type="application/rss+xml" />
    <description>Nouveaux modèles, autonomies mesurées sur route, courbes de recharge et prix des voitures électriques vendues en France.</description>
    <language>fr-FR</language>
${updates[0] ? `    <lastBuildDate>${new Date(updates[0].date).toUTCString()}</lastBuildDate>\n` : ""}${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
