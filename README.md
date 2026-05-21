# Evly — l'électrique mesuré

> Comparateur indépendant de véhicules électriques pour le marché français.
> Données d'autonomie réelle agrégées depuis Bjørn Nyland, EVKX, ArenaEV et la presse VE.
> Direction visuelle : Linear × Polestar × brutalist data-viz.

Projet de démonstration technique conçu pour mettre en valeur des compétences de **chef de projet digital** et de **développement front**. Site 100 % statique, déployé sur GitHub Pages.

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
| Framework | **Astro 5** (`output: 'static'`) | SSG zéro JS par défaut, parfait pour des pages éditoriales. Ilots React quand l'interactivité est utile. |
| UI dynamique | **React 19** en ilots `client:visible` / `client:load` | Hydratation à la demande, hors viewport = zéro JS chargé. |
| Styling | **Tailwind CSS 4** via `@tailwindcss/vite`, tokens dans `@theme` (CSS pur) | Pas de `tailwind.config.js`, tout est en CSS. |
| Validation données | **Zod** au build time | Tout JSON véhicule malformé fait casser le build. Fail-fast garanti. |
| Charts | **Chart.js 4** (via `react-chartjs-2`) | Léger, éprouvé, chargé uniquement coté ilots. |
| Icones | **Lucide React** + SVG inline par marque | Cohérence avec écosystème moderne, tree-shakable. |
| Polices | `@fontsource-variable/inter` + `@fontsource-variable/jetbrains-mono`, auto-hébergées | Aucune dépendance Google Fonts en runtime. |
| TypeScript | Mode strict + `noUncheckedIndexedAccess` | Zéro `any`, accès tableau toujours typés `T \| undefined`. |
| SEO | `@astrojs/sitemap`, JSON-LD `Vehicle` sur chaque fiche, OG tags complets | Standard. |
| Hébergement | **GitHub Pages** | Déploiement statique gratuit. `base: '/Evly'`, `trailingSlash: 'always'`. |

---

## Fonctionnalités

### Catalogue (120+ véhicules)
- 30 marques couvrant 120+ véhicules électriques du marché français
- Fiches détaillées : specs, autonomie réelle, courbe de charge, conso par vitesse, verdict, sources
- Sidebar sticky avec prix, CTAs config et bouton favori
- Filtres catalogue : segment, budget (7 paliers), marques groupées par origine (FR/DE/IT/KR/JP/US/SE/CN/Autres)
- Sections repliables (details/summary) avec chevron CSS
- Favoris LocalStorage avec filtre dédié

### Comparateur
- Jusqu'a 4 véhicules côte à côte, vue tableau horizontal
- Scroll horizontal mobile, sticky header de colonnes

### Simulateur TCO
- Calcul cout total de possession VE vs thermique sur 1 a 10 ans
- Selecteur véhicule + finition/batterie pour un cout représentatif
- Sliders km/an, durée, mix électricité domicile/rapide, essence/diesel
- Parametres avancés : entretien, assurance, valeur résiduelle, TVS
- Panel pédagogique dépréciation VE (batterie, sécurité, 2035, ZFE)
- Nombres animés (ease-out cubic 400ms)
- Barres cout/km VE vs thermique, cout mensuel, décomposition par poste
- Layout pleine largeur 2 colonnes (60/40), résultats sticky, responsive 1/2/2+sticky

### Leasing social
- Dossier complet : mécanisme CEE, conditions ménage, score ADEME
- Liste véhicules éligibles officiels, compatibles ADEME, sous réserve constructeur
- Prime CEE achat direct (max 8 100 EUR)

### Pages éditoriales
- Recommandation par scoring pondéré
- Page Pro (flottes, TCO entreprise)
- Glossaire VE interactif
- Méthodologie : approche, protocoles, sources, limites

---

## Architecture

```
evly/
├── astro.config.mjs              # base: '/Evly', output: 'static'
├── tsconfig.json                 # strict + alias @/...
├── public/
│   ├── favicon.svg
│   └── robots.txt
└── src/
    ├── pages/
    │   ├── index.astro           # accueil éditorial
    │   ├── vehicules/
    │   │   ├── index.astro       # catalogue avec filtres sidebar
    │   │   └── [slug].astro      # fiche véhicule (route dynamique)
    │   ├── comparer.astro        # comparateur horizontal 4 véhicules
    │   ├── simulateur.astro      # simulateur TCO pleine largeur
    │   ├── leasing-social/       # dossier leasing social complet
    │   ├── pro.astro             # page pro / flottes
    │   ├── recommandation.astro  # questionnaire scoring
    │   ├── glossaire.astro       # glossaire VE
    │   ├── methodologie.astro    # approche et sources
    │   └── admin.astro           # tableau de bord dev (localhost only)
    ├── layouts/
    │   └── BaseLayout.astro      # HTML shell + meta SEO + JSON-LD + nav/footer
    ├── components/
    │   ├── nav/                  # Navigation, Footer
    │   ├── ui/                   # BrandLogo, Button, Card, Stat, Tag, FavoriteButton...
    │   ├── vehicle/              # VehicleHero, SpecGrid, PriceBreakdown, VerdictBlock,
    │   │                         #   ChargingCurve.tsx, SeasonalRange.tsx, SpeedConsumption.tsx
    │   ├── tco/                  # TcoCalculator.tsx (simulateur TCO, ilot React)
    │   ├── compare/              # CompareTable.tsx (comparateur, ilot React)
    │   └── admin/                # AdminPanel, ConfigTracker, Roadmap (dev only)
    ├── data/
    │   ├── vehicles/             # un .json par véhicule, validé Zod au build
    │   ├── schemas.ts            # schéma Zod exhaustif (60+ champs + rangeTests)
    │   ├── sources.ts            # registre structuré : nyland, evkx, arenaev...
    │   └── roadmap.ts            # roadmap avec auto-detect au build
    ├── assets/
    │   ├── vehicles/             # images véhicules (WebP)
    │   └── logos/                # 31 logos marques SVG (inline, currentColor)
    ├── lib/
    │   ├── format.ts             # formatters FR (prix, km, kWh, durées)
    │   └── vehicles.ts           # loader avec validation Zod
    └── styles/
        └── global.css            # Tailwind 4 @theme + tokens + utilitaires éditoriaux
```

### Ajouter un véhicule

1. Créer `src/data/vehicles/<slug>.json` qui valide `VehicleSchema`.
2. Placer l'image dans `src/assets/vehicles/<slug>.webp` (optionnel).
3. Placer le logo marque dans `src/assets/logos/<Marque>.svg` si absent (optionnel, fallback SVG inline).
4. `npm run build` -- la fiche est générée automatiquement à `/vehicules/<slug>`.

Si le JSON ne valide pas, le build casse avec un message Zod clair pointant le champ fautif.

### Logos marques

31 logos SVG dans `src/assets/logos/`. Le composant `BrandLogo.astro` normalise le nom (minuscules, sans diacritiques) et matche le fichier. Nommer le fichier exactement comme la marque : `Alfa Romeo.svg`, `Citroën.svg`, etc. Fallback SVG inline pour les marques sans fichier.

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
| Accent | `#B8FF3D` (vert électrique) |
| Texte principal | `#F5F5F0` (légèrement chaud, jamais blanc pur) |
| Lignes | 0,5 - 1 px en `#2A2A30` |
| Wordmark | "evly" Inter Display 600, tracking -0.03em, point central vert accent |
| Titres H1 | Inter Display 600, tracking -0.022em |
| Specs techniques | JetBrains Mono 400-500 |
| **Interdits** | gradients, ombres portées, glows, emojis, capitales criardes, fonds bleus, fonts génériques |

---

## Performance et accessibilité

- **JS** : zéro sur les pages purement éditoriales. Charts et calculateurs en ilots React.
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

## Déploiement GitHub Pages

Build et déploiement automatiques via GitHub Actions sur push `main`.
Build command : `npm run build`. Output : `dist/`.

---

## Crédits

Projet personnel à but de démonstration. Tous les chiffres mesurés sont attribués à leur source (Bjorn Nyland, EVKX, ArenaEV, InsideEVs, Automobile Propre, Caradisiac, L'Argus, Touring). Aucun lien commercial n'existe avec les marques ou les sources citées. Pour les essais complets, consulter les sources originales.
