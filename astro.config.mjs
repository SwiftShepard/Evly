// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
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
      filter: (page) => !page.includes('/admin'),
      serialize(item) {
        const urlObj = new URL(item.url);
        const pathname = urlObj.pathname;

        if (pathname === '/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
          item.lastmod = new Date().toISOString().split('T')[0];
        } else if (pathname === '/vehicules/') {
          item.priority = 0.9;
          item.changefreq = 'daily';
          item.lastmod = new Date().toISOString().split('T')[0];
        } else if (pathname.startsWith('/vehicules/')) {
          item.priority = 0.8;
          item.changefreq = 'weekly';

          const slugMatch = pathname.match(/^\/vehicules\/([a-z0-9-]+)\/$/);
          if (slugMatch && slugMatch[1]) {
            const slug = slugMatch[1];
            const jsonPath = path.join(vehiclesDir, `${slug}.json`);
            if (fsSync.existsSync(jsonPath)) {
              try {
                const data = JSON.parse(fsSync.readFileSync(jsonPath, 'utf8'));
                if (data.lastUpdated) {
                  item.lastmod = data.lastUpdated;
                }
              } catch (e) {
                // Fallback
              }
            }
          }
        } else if (['/comparer/', '/simulateur/', '/recommandation/', '/leasing-social/', '/methodologie/', '/glossaire/', '/pro/'].includes(pathname)) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
          item.lastmod = new Date().toISOString().split('T')[0];
        } else {
          item.priority = 0.6;
          item.changefreq = 'monthly';
          item.lastmod = new Date().toISOString().split('T')[0];
        }
        return item;
      }
    })
  ],
  vite: {
    plugins: [tailwindcss(), adminApiPlugin],
  },
});
