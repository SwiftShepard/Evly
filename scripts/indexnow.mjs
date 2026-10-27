/**
 * IndexNow (Bing, Yandex, Seznam…) : à chaque déploiement, signale les pages nouvelles ou
 * modifiées sans attendre le passage des robots. Bing alimente aussi les réponses de ChatGPT et
 * de Copilot : une page signalée y est reprise plus vite.
 *
 * Compare chaque page du build (dist/) à la version en ligne, avant le déploiement, et écrit le
 * corps de la requête ; le job de déploiement l'envoie une fois le site à jour
 * (.github/workflows/deploy.yml). La clé est publique par principe : public/{clé}.txt la prouve.
 *
 * Usage :
 *   node scripts/indexnow.mjs --out indexnow.json   # rien n'est écrit si aucune page n'a changé
 */
import fs from "node:fs";
import path from "node:path";

const SITE = "https://ev-ly.com";
const KEY = "7dbfebe517918bc443e41b72b57574d8";
const DIST = "dist";
const MAX_URLS = 10_000;
const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;

const sitemaps = fs.readdirSync(DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f));
const urls = sitemaps.flatMap((f) => [...fs.readFileSync(path.join(DIST, f), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));

/** Ce qui ne change pas le contenu : noms de fichiers des assets, blancs */
const normalize = (html) => html.replace(/\/_astro\/[^"'\s)]+/g, "/_astro/x").replace(/\s+/g, " ").trim();

function localFile(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  return path.join(DIST, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
}

async function changed(url) {
  const file = localFile(url);
  if (!fs.existsSync(file)) return false;
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return true; // page nouvelle
    return normalize(await res.text()) !== normalize(fs.readFileSync(file, "utf8"));
  } catch {
    return false; // site injoignable : on ne signale rien plutôt que tout
  }
}

const list = [];
const queue = [...urls];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) if (await changed(url)) list.push(url);
  })
);
list.sort();

console.log(`IndexNow : ${list.length} page(s) nouvelle(s) ou modifiée(s) sur ${urls.length}`);
for (const u of list.slice(0, 40)) console.log(`  ${u}`);
if (list.length > 40) console.log(`  … et ${list.length - 40} autres`);

if (out && list.length) {
  const body = { host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: list.slice(0, MAX_URLS) };
  fs.writeFileSync(out, JSON.stringify(body));
}
