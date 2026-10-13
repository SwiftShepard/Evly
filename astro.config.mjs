// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { EnumChangefreq } from 'sitemap';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vehiclesDir = path.join(__dirname, 'src/data/vehicles');

/**
 * Plugin Vite dev-only : API de lecture/écriture des fiches véhicules.
 * Accessible uniquement via astro dev (localhost). Ignoré au build.
 * Routes :
 *   GET /api/admin/vehicle/:slug  → renvoie le JSON brut du fichier
 *   PUT /api/admin/vehicle/:slug  → écrit le JSON (valide JSON avant écriture)
 * @type {import('vite').Plugin}
 */
const adminApiPlugin = {
  name: 'evly-admin-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/admin/vehicle/')) return next();

      const slug = req.url.replace('/api/admin/vehicle/', '').split('?')[0];
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Slug invalide' }));
      }

      const filePath = path.join(vehiclesDir, `${slug}.json`);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');

      /* ── GET : lecture ── */
      if (req.method === 'GET') {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          res.end(content);
        } catch {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: `Fichier ${slug}.json introuvable` }));
        }
        return;
      }

      /* ── PUT : écriture ── */
      if (req.method === 'PUT') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          try {
            // 1. Valider que c'est du JSON valide
            const parsed = JSON.parse(body);
            // 2. Vérifier que le slug correspond
            if (parsed.slug !== slug) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: `Le slug dans le JSON (${parsed.slug}) ne correspond pas à l'URL (${slug})` }));
            }
            // 3. Formater proprement et écrire
            const formatted = JSON.stringify(parsed, null, 2);
            await fs.writeFile(filePath, formatted + '\n', 'utf-8');
            res.end(JSON.stringify({ ok: true, slug }));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: e instanceof SyntaxError ? `JSON invalide : ${e.message}` : String(e) }));
          }
        });
        req.on('error', (e) => {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(e) }));
        });
        return;
      }

      next();
    });
  },
};

/* ── Dates de mise à jour pour le sitemap (lues dans les fiches) ── */
/** @param {string} brand */
const toBrandSlug = (brand) =>
  brand.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const vehicleDates = new Map();
const brandDates = new Map();
for (const file of fsSync.readdirSync(vehiclesDir).filter((f) => f.endsWith('.json'))) {
  try {
    const data = JSON.parse(fsSync.readFileSync(path.join(vehiclesDir, file), 'utf8'));
    if (!data.lastUpdated) continue;
    vehicleDates.set(data.slug, data.lastUpdated);
    const brand = toBrandSlug(data.brand);
    if (!brandDates.has(brand) || brandDates.get(brand) < data.lastUpdated) brandDates.set(brand, data.lastUpdated);
  } catch {
    // Fiche invalide : le build Zod le signalera
  }
}
const latestDataDate = [...vehicleDates.values()].sort().at(-1);
// Pages dont le contenu suit directement les fiches véhicules
const DATA_PAGES = new Set(['/', '/vehicules/', '/marques/', '/comparer/', '/bons-plans/', '/leasing-social/', '/pro/vehicules/', '/ma-semaine/']);

// https://astro.build/config
export default defineConfig({
  site: 'https://ev-ly.com',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !/\/(admin|404)\/?$|\/simulateur\/rapport-premium\//.test(page),
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const vehicleMatch = pathname.match(/^\/vehicules\/([a-z0-9-]+)\/$/);
        const brandMatch = pathname.match(/^\/marques\/([a-z0-9-]+)\/$/);

        // lastmod = date réelle de la donnée ; absent plutôt qu'inventé (Google ignore les lastmod peu fiables)
        if (vehicleMatch) {
          item.priority = 0.8;
          item.changefreq = EnumChangefreq.WEEKLY;
          const updated = vehicleDates.get(vehicleMatch[1]);
          if (updated) item.lastmod = updated;
        } else if (brandMatch) {
          item.priority = 0.7;
          item.changefreq = EnumChangefreq.WEEKLY;
          const updated = brandDates.get(brandMatch[1]);
          if (updated) item.lastmod = updated;
        } else if (DATA_PAGES.has(pathname) || pathname.startsWith('/voitures-electriques/')) {
          item.priority = pathname === '/' ? 1.0 : 0.9;
          item.changefreq = EnumChangefreq.WEEKLY;
          item.lastmod = latestDataDate;
        } else {
          item.priority = 0.6;
          item.changefreq = EnumChangefreq.MONTHLY;
        }
        return item;
      }
    })
  ],
  vite: {
    plugins: [tailwindcss(), adminApiPlugin],
    // Dépendances des îlots React pré-optimisées dès le démarrage du serveur de dev :
    // sinon Vite les découvre en cours de session, invalide ses fichiers (erreur 504
    // « Outdated Optimize Dep ») et les graphiques des fiches restent vides jusqu'au redémarrage.
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'chart.js',
        'react-chartjs-2',
        'lucide-react',
      ],
    },
  },
});
