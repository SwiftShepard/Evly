// Audit SEO du build (dist/) : H1, title, description, canonical, og:image, JSON-LD, liens internes.
// Usage : npm run build && npm run audit:seo
import fs from "node:fs";
import path from "node:path";

const dist = "dist";
const pages = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith(".html")) pages.push(p);
  }
})(dist);

const issues = [];
const titles = new Map();
const descs = new Map();
let ldCount = 0;
const linkTargets = new Set();

const decode = (s) => s.replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&#38;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

for (const file of pages) {
  const rel = "/" + path.relative(dist, file).split(path.sep).join("/").replace(/index\.html$/, "");
  const html = fs.readFileSync(file, "utf8");
  const noindex = /<meta name="robots" content="noindex/.test(html);
  // Le contenu des <template> n'est ni affiché ni indexé (ex. : copie du repli d'un îlot client:only)
  const h1 = (html.replace(/<template[\s\S]*?<\/template>/g, "").match(/<h1[\s>]/g) || []).length;
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
  const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const og = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1];

  if (!noindex) {
    if (h1 !== 1) issues.push(`${rel} : ${h1} H1`);
    if (title.length > 70) issues.push(`${rel} : title ${title.length} car. « ${title} »`);
    if (desc.length < 70 || desc.length > 165) issues.push(`${rel} : description ${desc.length} car.`);
    if (/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(desc)) issues.push(`${rel} : emoji dans la description`);
    titles.set(title, [...(titles.get(title) ?? []), rel]);
    descs.set(desc, [...(descs.get(desc) ?? []), rel]);
    if (canonical !== `https://ev-ly.com${rel}`) issues.push(`${rel} : canonical ${canonical}`);
  }
  if (og) {
    const ogPath = path.join(dist, new URL(og).pathname);
    if (!fs.existsSync(ogPath)) issues.push(`${rel} : og:image absente ${og}`);
  } else if (!noindex) issues.push(`${rel} : pas d'og:image`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
      ldCount++;
    } catch (e) {
      issues.push(`${rel} : JSON-LD invalide (${e.message})`);
    }
  }
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) linkTargets.add(m[1]);
}

for (const [t, list] of titles) if (list.length > 1) issues.push(`title dupliqué « ${t} » : ${list.join(", ")}`);
for (const [d, list] of descs) if (list.length > 1) issues.push(`description dupliquée : ${list.join(", ")}`);

// Liens internes cassés
for (const href of linkTargets) {
  if (/\.(svg|png|jpe?g|webp|xml|txt|js|css|ico)$/.test(href) || href.startsWith("/_astro/")) continue;
  const clean = href.endsWith("/") ? href : href + "/";
  const target = path.join(dist, clean, "index.html");
  if (!fs.existsSync(target) && !fs.existsSync(path.join(dist, href))) issues.push(`lien cassé : ${href}`);
}

console.log(`${pages.length} pages, ${ldCount} blocs JSON-LD valides, ${linkTargets.size} cibles de liens internes`);
console.log(issues.length ? issues.join("\n") : "Aucun problème détecté.");
