# Evly — l'électrique mesuré

> Comparateur indépendant de véhicules électriques pour le marché français.
> Données d'autonomie réelle agrégées depuis Bjørn Nyland, EVKX, ArenaEV et la presse VE.
> Direction visuelle : Linear × Polestar × brutalist data-viz.

Projet de démonstration technique conçu pour mettre en valeur des compétences de **chef de projet digital** et de **développement front**. Site 100 % statique, déployable gratuitement sur Cloudflare Pages.

---

## Pourquoi Evly

Les comparateurs VE existants sont soit franchement publicitaires (sites constructeurs), soit visuellement noyés sous le contenu (Caradisiac et consorts), soit superficiels sur les vraies métriques d'usage. Evly prend le parti inverse :

- **Données mesurées** plutôt que WLTP commerciale. La WLTP surestime l'autonomie réelle de 15 à 30 %. Evly agrège les protocoles **Nyland** (90 et 120 km/h, 1000 km challenge), **EVKX** (courbes de charge), **ArenaEV** (range par tranche de vitesse) et la presse VE française.
- **Verdict argumenté** plutôt que score sur 10. Pour qui ce véhicule est le bon choix, pour qui il ne l'est pas.
- **Sources tracées** sur chaque chiffre : niveau de confiance (`mesuré` / `constructeur` / `estimé` / `pending`), lien vers la vidéo ou l'article original.
- **Aucune publicité, aucun lien affilié, aucun tracking.**

---

## Stack technique

| Brique | Choix | Justification |
|---|---|---|
| Framework | **Astro 5** (`output: 'static'`) | SSG zéro JS par défaut, parfait pour des pages éditoriales. Îlots React quand l'interactivité est utile. |
| UI dynamique | **React 19** en îlots `client:visible` | Hydratation à la demande, hors viewport = zéro JS chargé. |
| Styling | **Tailwind CSS 4** via `@tailwindcss/vite`, tokens dans `@theme` (CSS pur) | Pas de `tailwind.config.js`, tout est en CSS — plus simple à auditer, meilleure DX. |
| Validation données | **Zod** au build time | Tout JSON véhicule malformé fait casser le build. Fail-fast garanti. |
| Charts | **Chart.js 4** (via `react-chartjs-2`) | Léger, éprouvé, chargé uniquement côté îlots. |
| Icônes | **Lucide React** | Cohérence avec écosystème moderne, tree-shakable. |
| Polices | `@fontsource-variable/inter` + `@fontsource-variable/jetbrains-mono`, auto-hébergées | Aucune dépendance Google Fonts en runtime. |
| TypeScript | Mode strict + `noUncheckedIndexedAccess` | Zéro `any`, accès tableau toujours typés `T \| undefined`. |
| SEO | `@astrojs/sitemap`, JSON-LD `Vehicle` sur chaque fiche, OG tags complets | Standard. |
| Hébergement | **Cloudflare Pages** | Bande passante illimitée, builds illimités, gratuit à vie. `wrangler.toml` fourni. |

---

## Architecture

```
evly/
├── astro.config.mjs              # site: https://evly.eu, output: 'static'
├── wrangler.toml                 # config Cloudflare Pages
├── tsconfig.json                 # strict + alias @/...
├── public/
│   ├── favicon.svg               # "e" vert sur fond #0A0A0B
│   └── robots.txt
└── src/
    ├── pages/
    │   ├── index.astro           # accueil éditorial
    │   ├── vehicules/
    │   │   ├── index.astro       # liste catalogue
    │   │   └── [slug].astro      # fiche véhicule (route dynamique)
    │   ├── comparer.astro        # placeholder V2
    │   ├── simulateur.astro      # placeholder V3
    │   ├── recommandation.astro  # placeholder V4
    │   └── methodologie.astro    # approche, protocoles, sources, limites
    ├── layouts/
    │   └── BaseLayout.astro      # HTML shell + meta SEO + JSON-LD + nav/footer
    ├── components/
    │   ├── nav/                  # Navigation, Footer (wordmark Evly)
    │   ├── ui/                   # Wordmark, Button, Card, Stat, Tag, Divider,
    │   │                         #   ComingSoon, SectionHeader, SourceTooltip,
    │   │                         #   MethodologyBadge
    │   └── vehicle/              # composants spécifiques aux fiches
    │       ├── VehicleHero.astro
    │       ├── SpecGrid.astro
    │       ├── PriceBreakdown.astro
    │       ├── VerdictBlock.astro
    │       ├── ChargingCurve.tsx     # îlot React, Chart.js
    │       ├── SeasonalRange.tsx     # îlot React, Chart.js
    │       └── SpeedConsumption.tsx  # îlot React, scatter conso/vitesse multi-sources
    ├── data/
    │   ├── vehicles/             # un .json par véhicule, validé Zod au build
    │   ├── schemas.ts            # schéma Zod exhaustif (60+ champs + rangeTests)
    │   └── sources.ts            # registre structuré : nyland, evkx, arenaev…
    ├── lib/
    │   ├── format.ts             # formatters FR (prix, km, kWh, durées)
    │   └── vehicles.ts           # loader avec validation Zod
    └── styles/
        └── global.css            # Tailwind 4 @theme + tokens + utilitaires éditoriaux
```

### Ajouter un véhicule

1. Créer `src/data/vehicles/<slug>.json` qui valide `VehicleSchema`.
2. Vérifier que les sources citées existent dans `src/data/sources.ts`. Sinon, les ajouter.
3. `npm run build` — la fiche est générée automatiquement à `/vehicules/<slug>`.

Si le JSON ne valide pas, le build casse avec un message Zod clair pointant le champ fautif.

---

## Conformité éditoriale

Règles non négociables :

- **Jamais reproduire** les verdicts éditoriaux des sources mot pour mot. Reformulation systématique.
- **Jamais reprendre** plus d'une courte citation (< 15 mots) par source dans une fiche.
- **Toujours créditer** la source sur chaque chiffre mesuré, avec lien externe.
- **Jamais utiliser** de captures, photos ou graphiques des sources sans autorisation. Les charts Evly sont reconstruits à partir des données brutes.
- **Marquer `estimated` ou `pending`** tout chiffre non sourcé ou en attente de vérification. Ne pas inventer.
- Donnée manquante (température, pneus, etc.) → `null` plutôt qu'une valeur plausible imaginée.

---

## Direction artistique

| Élément | Règle |
|---|---|
| Fond | `#0A0A0B` (presque noir, nuance chaude) |
| Surface élevée | `#131316` |
| Accent | `#B8FF3D` (vert électrique — chiffres clés, CTA, point du wordmark) |
| Texte principal | `#F5F5F0` (légèrement chaud, jamais blanc pur) |
| Lignes | 0,5 - 1 px en `#2A2A30` |
| Wordmark | "evly" Inter Display 600, tracking -0.03em, point central vert accent |
| Titres H1 | Inter Display 600, tracking -0.022em, jusqu'à 80 px |
| Chiffres signature | Inter Display 600, tabular-nums, 96 px+ pour hero |
| Specs techniques | JetBrains Mono 400-500 |
| **Interdits** | gradients, ombres portées, glows, emojis, capitales criardes, fonds bleus, fonts génériques |

---

## Performance & accessibilité

- **Lighthouse** : 100/100/100/100 visé sur la fiche véhicule.
- **JS** : zéro sur les pages purement éditoriales. Charts en îlots `client:visible`.
- **Fonts** : auto-hébergées, `font-display: swap`.
- **A11y** : skip link, charts `role="img"` + `aria-label`, focus visible 2 px accent, contrastes AAA, `prefers-reduced-motion` respecté.
- **SEO** : sitemap auto, OG complets, JSON-LD `Vehicle` sur chaque fiche.

---

## Commandes

| Commande | Effet |
|---|---|
| `npm install` | Installation. |
| `npm run dev` | Dev server (localhost:4321). |
| `npm run build` | Build statique → `dist/`. |
| `npm run preview` | Sert `dist/` localement. |
| `npm run check` | TypeScript + Astro check. |

---

## Déploiement Cloudflare Pages

1. Pousser le dépôt sur GitHub / GitLab.
2. Sur le dashboard Cloudflare → Pages → *Create project* → connecter le dépôt.
3. Build command : `npm run build`. Output directory : `dist`.
4. Pointer le domaine `evly.eu` vers le projet Pages. Aucun runtime requis.

Coût total : 0 €/mois, bande passante illimitée, builds illimités.

---

## État du projet

| Phase | Statut |
|---|---|
| **V1 — bootstrap** : design system, schéma, fiche véhicule, 2 variantes EV4 | Livrée |
| **V2 — sources** : branding Evly, registre de sources structuré, tests terrain Nyland | **Livrée** |
| V3 : comparateur multi (jusqu'à 4 véhicules, îlot React) | À venir |
| V4 : simulateur TCO (sliders interactifs) | À venir |
| V5 : questionnaire de recommandation (scoring pondéré) | À venir |
| V6 : extension catalogue à 10 modèles | À venir |

---

## Crédits

Projet personnel à but de démonstration. Tous les chiffres mesurés sont attribués à leur source (Bjørn Nyland, EVKX, ArenaEV, InsideEVs, Automobile Propre, Caradisiac, L'Argus, Touring). Aucun lien commercial n'existe avec les marques ou les sources citées. Pour les essais complets, consulter les sources originales — Evly ne reproduit jamais leur contenu éditorial.
