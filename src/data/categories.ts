import type { Vehicle } from "@/data/schemas";
import {
  SEO_YEAR,
  getBodyInfo,
  getMarketStatus,
  getVehicleName,
  getVehicleSeoFacts,
  withArticle,
} from "@/lib/seo";
import { isStrictUtility } from "@/lib/vehicles";
import { formatPrice } from "@/lib/format";
import { CEE_BASE_EUR, CEE_MAX_EUR, CEE_GRID_LABEL } from "@/lib/cee";

/**
 * Pages « sélections » (/voitures-electriques/{slug}/) : une intention de recherche
 * générique par page (« SUV électrique », « voiture électrique pas chère »…).
 * Les textes sont écrits à la main ; tous les chiffres sont recalculés au build.
 */

export type CategoryColumn = "price" | "range" | "charge" | "trunk" | "aided" | "country";

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface VehicleCategory {
  slug: string;
  /** Libellé court (liens, pied de page) */
  label: string;
  title: string;
  h1: string;
  eyebrow: string;
  description: (list: Vehicle[]) => string;
  intro: (list: Vehicle[]) => string[];
  /** Véhicules retenus, déjà triés */
  select: (all: Vehicle[]) => Vehicle[];
  /** Colonne mise en avant (ordre du classement) puis colonnes affichées */
  sortedBy: CategoryColumn;
  columns: CategoryColumn[];
  faq: (list: Vehicle[]) => FaqEntry[];
}

/* ── Outils ───────────────────────────────────────────────────────────── */

const facts = (v: Vehicle) => getVehicleSeoFacts(v);
const price = (v: Vehicle) => facts(v).priceMin ?? Infinity;
const range = (v: Vehicle) => facts(v).rangeBest;
const charge = (v: Vehicle) => facts(v).dcMin ?? Infinity;
const aided = (v: Vehicle) => facts(v).priceAfterAids ?? price(v);

const byPrice = (a: Vehicle, b: Vehicle) => price(a) - price(b);
const byRange = (a: Vehicle, b: Vehicle) => range(b) - range(a);
const byCharge = (a: Vehicle, b: Vehicle) => charge(a) - charge(b) || range(b) - range(a);

/** Voitures particulières en vente (ni utilitaires, ni quadricycles, ni modèles retirés, prix connu). */
function passengerPool(all: Vehicle[]): Vehicle[] {
  return all.filter((v) => {
    const cat = getBodyInfo(v).category;
    return (
      !isStrictUtility(v) &&
      cat !== "utilitaire" &&
      cat !== "quadricycle" &&
      getMarketStatus(v) !== "discontinued" &&
      facts(v).priceMin != null
    );
  });
}

const measuredWord = (v: Vehicle) => (facts(v).rangeBestMeasured ? "mesurés" : "estimés");
const eur = (n: number) => formatPrice(n);

function rangeSentence(v: Vehicle): string {
  const f = facts(v);
  return `${f.rangeBest} km réels ${measuredWord(v)} en usage mixte`;
}

function priceSentence(v: Vehicle): string {
  const f = facts(v);
  if (f.priceMin == null) return "prix non communiqué";
  return f.priceAfterAids != null
    ? `à partir de ${eur(f.priceMin)}, ou ${eur(f.priceAfterAids)} après aides maximales`
    : `à partir de ${eur(f.priceMin)}`;
}

/** « la Renault 5 E-Tech, la Peugeot E-208 et l'Opel Corsa Electric » */
function listNames(list: Vehicle[], max = 4): string {
  const names = list.slice(0, max).map((v) => withArticle(v));
  if (names.length <= 1) return names.join("");
  const rest = list.length > max ? `${names.join(", ")}, entre autres` : `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
  return rest;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SEVEN_SEATS = new Set([
  "kia-ev9",
  "hyundai-ioniq-9",
  "peugeot-e-5008",
  "volvo-ex90",
  "mercedes-eqs-suv",
  "mercedes-glb",
  "vw-id-buzz",
  "renault-grand-kangoo",
  "citroen-e-berlingo",
  "peugeot-e-rifter",
  "opel-combo-e-life",
  "toyota-proace-city",
  "hyundai-staria",
  "mercedes-eqv",
  "citroen-e-spacetourer",
  "peugeot-e-traveller",
  "opel-vivaro-e-life",
]);

/* ── Sélections ───────────────────────────────────────────────────────── */

export const CATEGORIES: VehicleCategory[] = [
  {
    slug: "pas-cheres",
    label: "Pas chères (< 30 000 €)",
    title: `Voiture électrique pas chère : moins de 30 000 € (${SEO_YEAR})`,
    h1: "Voitures électriques pas chères : les modèles à moins de 30 000 €",
    eyebrow: "Petit budget",
    select: (all) => passengerPool(all).filter((v) => price(v) <= 30000).sort(byPrice),
    sortedBy: "price",
    columns: ["price", "aided", "range", "charge"],
    description: (l) =>
      `Les ${l.length} voitures électriques neuves à moins de 30 000 € en France, dès ${eur(price(l[0]!))}. Prix après aides, autonomie réelle et recharge comparés.`,
    intro: (l) => [
      `Rouler en électrique ne demande plus un budget de berline premium : ${l.length} voitures électriques neuves sont vendues moins de 30 000 € en France en ${SEO_YEAR}, à commencer par ${withArticle(l[0]!)} à ${eur(price(l[0]!))}. Citadines, petits SUV et compactes : la liste ci-dessous est classée du prix catalogue le plus bas au plus élevé.`,
      `Le prix affiché n'est qu'un point de départ. Sur les modèles éligibles, le coup de pouce CEE retire ${eur(CEE_BASE_EUR)} pour tout ménage et jusqu'à ${eur(CEE_MAX_EUR)} selon vos revenus, et le leasing social ouvre certaines citadines à moins de 150 € par mois. À l'inverse, sur une petite batterie, l'écart entre l'autonomie WLTP et l'autonomie réelle se ressent vite : c'est cette dernière que nous affichons.`,
    ],
    faq: (l) => {
      const cheapest = l[0]!;
      const best = [...l].sort(byRange)[0]!;
      const under20 = l.filter((v) => price(v) < 20000);
      const under20Aided = l.filter((v) => aided(v) < 20000);
      return [
        {
          question: "Quelle est la voiture électrique neuve la moins chère en France ?",
          answer: `${cap(withArticle(cheapest))} est la voiture électrique la moins chère de notre comparatif, ${priceSentence(cheapest)}. Son autonomie atteint ${rangeSentence(cheapest)}.`,
        },
        {
          question: "Quelle voiture électrique à moins de 30 000 € a la meilleure autonomie ?",
          answer: `${cap(withArticle(best))} offre la meilleure autonomie de cette sélection : ${rangeSentence(best)}, pour un prix ${priceSentence(best)}.`,
        },
        {
          question: "Peut-on acheter une voiture électrique neuve à moins de 20 000 € ?",
          answer:
            under20.length > 0
              ? `Oui : ${under20.length} modèle${under20.length > 1 ? "s sont vendus" : " est vendu"} moins de 20 000 € au prix catalogue (${listNames(under20, 3)}). Avec la prime CEE de tout ménage, ${under20Aided.length} modèles passent sous ce seuil.`
              : `Pas au prix catalogue, mais avec la prime CEE de tout ménage ${under20Aided.length} modèles passent sous les 20 000 €.`,
        },
      ];
    },
  },
  {
    slug: "suv",
    label: "SUV électriques",
    title: `SUV électrique ${SEO_YEAR} : prix et autonomie réelle`,
    h1: "SUV électriques : tous les modèles, leurs prix et leur autonomie réelle",
    eyebrow: "SUV & crossovers",
    select: (all) => passengerPool(all).filter((v) => getBodyInfo(v).category === "suv").sort(byPrice),
    sortedBy: "price",
    columns: ["price", "range", "charge", "trunk"],
    description: (l) =>
      `Comparez les ${l.length} SUV électriques vendus en France, dès ${eur(price(l[0]!))} : autonomie réelle mesurée, recharge 10-80 %, coffre et prix ${SEO_YEAR}.`,
    intro: (l) => [
      `Le SUV est la silhouette la plus vendue en électrique. Evly compare ${l.length} SUV et crossovers électriques disponibles en France, du petit SUV urbain à ${eur(price(l[0]!))} au grand SUV 7 places, avec leur autonomie réelle et leur vitesse de recharge.`,
      `À batterie égale, un SUV consomme davantage qu'une berline : sa surface frontale et son poids pénalisent l'autonomie, surtout sur autoroute. Comparez la colonne autonomie réelle plutôt que le chiffre WLTP, et le temps de recharge 10 → 80 % si vous partez souvent loin.`,
    ],
    faq: (l) => {
      const best = [...l].sort(byRange)[0]!;
      const fastest = [...l].sort(byCharge)[0]!;
      return [
        {
          question: "Quel est le SUV électrique le moins cher ?",
          answer: `${cap(withArticle(l[0]!))} est le SUV électrique le moins cher de notre comparatif, ${priceSentence(l[0]!)}.`,
        },
        {
          question: "Quel SUV électrique a la plus grande autonomie ?",
          answer: `${cap(withArticle(best))} arrive en tête avec ${rangeSentence(best)}, et ${facts(best).rangeHighway} km sur autoroute à 130 km/h.`,
        },
        {
          question: "Quel SUV électrique recharge le plus vite ?",
          answer: `${cap(withArticle(fastest))} passe de 10 à 80 % en ${facts(fastest).dcMin} minutes sur borne rapide, grâce à une puissance de charge de ${facts(fastest).dcPeak} kW.`,
        },
      ];
    },
  },
  {
    slug: "citadines",
    label: "Citadines électriques",
    title: `Citadine électrique ${SEO_YEAR} : prix et autonomie réelle`,
    h1: "Citadines électriques : prix, autonomie réelle et recharge",
    eyebrow: "En ville",
    select: (all) => passengerPool(all).filter((v) => getBodyInfo(v).category === "citadine").sort(byPrice),
    sortedBy: "price",
    columns: ["price", "aided", "range", "charge"],
    description: (l) =>
      `Les ${l.length} citadines électriques vendues en France, dès ${eur(price(l[0]!))} : autonomie réelle en ville et sur autoroute, recharge et prix après aides.`,
    intro: (l) => [
      `La citadine est le terrain naturel de la voiture électrique : trajets courts, recharge à domicile, freinage régénératif en ville. ${l.length} citadines électriques sont vendues en France en ${SEO_YEAR}, de ${eur(price(l[0]!))} à ${eur(price(l.at(-1)!))}.`,
      `Leur point faible reste l'autoroute : une petite batterie se vide vite à 130 km/h. Pour chaque modèle, nous affichons l'autonomie réelle en usage mixte et le temps de recharge 10 → 80 %, les deux chiffres qui décident si une citadine peut aussi servir aux week-ends.`,
    ],
    faq: (l) => {
      const best = [...l].sort(byRange)[0]!;
      const highways = l.map((v) => facts(v).rangeHighway).sort((a, b) => a - b);
      return [
        {
          question: "Quelle est la citadine électrique la moins chère ?",
          answer: `${cap(withArticle(l[0]!))} est la citadine électrique la moins chère, ${priceSentence(l[0]!)}.`,
        },
        {
          question: "Quelle citadine électrique a la meilleure autonomie ?",
          answer: `${cap(withArticle(best))} offre la meilleure autonomie de sa catégorie : ${rangeSentence(best)}.`,
        },
        {
          question: "Une citadine électrique peut-elle faire de l'autoroute ?",
          answer: `Oui, mais avec des arrêts plus fréquents. À 130 km/h, les citadines de cette sélection parcourent entre ${highways[0]} et ${highways.at(-1)} km avant de devoir recharger. Une recharge rapide de 10 à 80 % prend le plus souvent 25 à 35 minutes.`,
        },
      ];
    },
  },
  {
    slug: "compactes",
    label: "Compactes électriques",
    title: `Compacte électrique ${SEO_YEAR} : prix et autonomie réelle`,
    h1: "Compactes électriques : prix, autonomie réelle et recharge",
    eyebrow: "Compactes",
    select: (all) => passengerPool(all).filter((v) => getBodyInfo(v).category === "compacte").sort(byPrice),
    sortedBy: "price",
    columns: ["price", "range", "charge", "trunk"],
    description: (l) =>
      `Les ${l.length} compactes électriques vendues en France, dès ${eur(price(l[0]!))} : autonomie réelle mesurée, recharge 10-80 %, coffre et prix ${SEO_YEAR}.`,
    intro: (l) => [
      `Ni citadine ni SUV, la compacte reste le meilleur compromis de l'électrique : assez grande pour une famille de quatre, assez basse et légère pour consommer peu sur autoroute. ${l.length} compactes électriques sont vendues en France, de ${eur(price(l[0]!))} à ${eur(price(l.at(-1)!))}.`,
      `Leur profil aérodynamique leur donne souvent une meilleure autonomie réelle qu'un SUV de même batterie. Le tableau compare l'autonomie mesurée ou estimée, la vitesse de recharge et le volume de coffre.`,
    ],
    faq: (l) => {
      const best = [...l].sort(byRange)[0]!;
      return [
        {
          question: "Quelle est la compacte électrique la moins chère ?",
          answer: `${cap(withArticle(l[0]!))} est la compacte électrique la moins chère, ${priceSentence(l[0]!)}.`,
        },
        {
          question: "Quelle compacte électrique a la plus grande autonomie ?",
          answer: `${cap(withArticle(best))} arrive en tête avec ${rangeSentence(best)}.`,
        },
      ];
    },
  },
  {
    slug: "berlines",
    label: "Berlines électriques",
    title: `Berline électrique ${SEO_YEAR} : prix et autonomie réelle`,
    h1: "Berlines électriques : prix, autonomie réelle et recharge",
    eyebrow: "Berlines & breaks",
    select: (all) =>
      passengerPool(all)
        .filter((v) => ["berline", "break"].includes(getBodyInfo(v).category))
        .sort(byPrice),
    sortedBy: "price",
    columns: ["price", "range", "charge", "trunk"],
    description: (l) =>
      `Les ${l.length} berlines électriques vendues en France, dès ${eur(price(l[0]!))} : autonomie réelle sur autoroute, recharge 10-80 % et prix ${SEO_YEAR}.`,
    intro: (l) => [
      `Basses et profilées, les berlines électriques sont les plus efficientes sur autoroute : c'est dans cette catégorie que l'on trouve les meilleures autonomies réelles. Evly compare ${l.length} berlines et breaks électriques, de ${eur(price(l[0]!))} à plus de ${eur(Math.floor(price(l.at(-1)!) / 1000) * 1000)}.`,
      `Pour les gros rouleurs, regardez l'autonomie réelle et le temps de recharge ensemble : une berline qui recharge vite peut battre, sur un long trajet, une rivale à plus grosse batterie.`,
    ],
    faq: (l) => {
      const best = [...l].sort(byRange)[0]!;
      const fastest = [...l].sort(byCharge)[0]!;
      return [
        {
          question: "Quelle est la berline électrique la moins chère ?",
          answer: `${cap(withArticle(l[0]!))} est la berline électrique la moins chère de notre comparatif, ${priceSentence(l[0]!)}.`,
        },
        {
          question: "Quelle berline électrique a la meilleure autonomie ?",
          answer: `${cap(withArticle(best))} offre ${rangeSentence(best)}, et ${facts(best).rangeHighway} km sur autoroute à 130 km/h.`,
        },
        {
          question: "Quelle berline électrique recharge le plus vite ?",
          answer: `${cap(withArticle(fastest))} passe de 10 à 80 % en ${facts(fastest).dcMin} minutes sur borne rapide (pic à ${facts(fastest).dcPeak} kW).`,
        },
      ];
    },
  },
  {
    slug: "familiales",
    label: "Familiales",
    title: `Voiture électrique familiale ${SEO_YEAR} : coffre et autonomie`,
    h1: "Voitures électriques familiales : grand coffre et autonomie réelle",
    eyebrow: "En famille",
    select: (all) =>
      passengerPool(all)
        .filter((v) => {
          const b = getBodyInfo(v);
          const small = /^[AB]/i.test(v.segment.trim());
          return SEVEN_SEATS.has(v.slug) || b.category === "monospace" || (!small && v.trunkCapacity_L >= 500);
        })
        .sort(byPrice),
    sortedBy: "price",
    columns: ["price", "trunk", "range", "charge"],
    description: (l) =>
      `${l.length} voitures électriques familiales comparées : coffre d'au moins 500 litres, monospaces et 7 places, avec autonomie réelle, recharge et prix dès ${eur(price(l[0]!))}.`,
    intro: (l) => [
      `Une voiture familiale électrique doit avaler les départs en vacances : un vrai coffre, de la place à l'arrière et une autonomie qui tient sur autoroute chargée. Nous avons retenu ${l.length} modèles avec un coffre d'au moins 500 litres, une carrosserie de monospace ou une troisième rangée de sièges.`,
      `Sur un long trajet en famille, le temps de recharge compte autant que l'autonomie : 20 minutes de pause toutes les deux à trois heures, c'est le rythme des enfants. Le tableau indique les deux, avec le volume de coffre en configuration 5 places.`,
    ],
    faq: (l) => {
      const biggest = [...l].sort((a, b) => b.trunkCapacity_L - a.trunkCapacity_L)[0]!;
      const best = [...l].sort(byRange)[0]!;
      return [
        {
          question: "Quelle est la voiture électrique familiale la moins chère ?",
          answer: `${cap(withArticle(l[0]!))} est la familiale électrique la moins chère de cette sélection, ${priceSentence(l[0]!)}, avec un coffre de ${l[0]!.trunkCapacity_L} litres.`,
        },
        {
          question: "Quelle voiture électrique a le plus grand coffre ?",
          answer: `${cap(withArticle(biggest))} offre le plus grand coffre de la sélection : ${biggest.trunkCapacity_L} litres, et ${biggest.trunkCapacityFolded_L} litres sièges rabattus.`,
        },
        {
          question: "Quelle familiale électrique pour partir loin en vacances ?",
          answer: `Pour les longs trajets, ${withArticle(best)} offre la meilleure autonomie de la sélection (${rangeSentence(best)}). Vérifiez aussi le temps de recharge 10 → 80 %, qui détermine la durée des pauses.`,
        },
      ];
    },
  },
  {
    slug: "7-places",
    label: "7 places",
    title: `Voiture électrique 7 places ${SEO_YEAR} : la liste complète`,
    h1: "Voitures électriques 7 places : SUV, monospaces et ludospaces",
    eyebrow: "7 places et plus",
    select: (all) => passengerPool(all).filter((v) => SEVEN_SEATS.has(v.slug)).sort(byPrice),
    sortedBy: "price",
    columns: ["price", "range", "charge", "trunk"],
    description: (l) =>
      `Les ${l.length} voitures électriques 7 places (ou plus) vendues en France, dès ${eur(price(l[0]!))} : grands SUV, monospaces et ludospaces, avec leur autonomie réelle.`,
    intro: (l) => [
      `L'offre de voitures électriques à sept places s'est enfin étoffée. Evly en recense ${l.length}, du ludospace pratique à ${eur(price(l[0]!))} au grand SUV premium, en passant par les monospaces de 8 ou 9 places.`,
      `Attention : sur plusieurs modèles, la troisième rangée est une option ou n'existe que sur la version longue. Et une voiture chargée de sept personnes consomme davantage, ce qui réduit l'autonomie réelle affichée ici, mesurée ou estimée avec un conducteur seul.`,
    ],
    faq: (l) => {
      const best = [...l].sort(byRange)[0]!;
      const suvs = l.filter((v) => getBodyInfo(v).category === "suv");
      return [
        {
          question: "Quelle est la voiture électrique 7 places la moins chère ?",
          answer: `${cap(withArticle(l[0]!))} est la voiture électrique 7 places la moins chère, ${priceSentence(l[0]!)} (vérifiez que la version choisie dispose bien de la troisième rangée).`,
        },
        {
          question: "Quels SUV électriques ont 7 places ?",
          answer: `${suvs.length} SUV électriques proposent 7 places en France : ${listNames(suvs, 6)}.`,
        },
        {
          question: "Quelle voiture électrique 7 places a la meilleure autonomie ?",
          answer: `${cap(withArticle(best))} offre la meilleure autonomie de la sélection avec ${rangeSentence(best)}.`,
        },
      ];
    },
  },
  {
    slug: "grande-autonomie",
    label: "Plus grande autonomie",
    title: `Voiture électrique avec la plus grande autonomie (${SEO_YEAR})`,
    h1: "Les voitures électriques avec la plus grande autonomie réelle",
    eyebrow: "Classement autonomie",
    select: (all) => passengerPool(all).sort(byRange).slice(0, 25),
    sortedBy: "range",
    columns: ["range", "charge", "price"],
    description: (l) =>
      `Classement ${SEO_YEAR} des voitures électriques à la plus grande autonomie réelle, pas WLTP : ${getVehicleName(l[0]!)} en tête avec ${range(l[0]!)} km. Prix et recharge comparés.`,
    intro: (l) => [
      `Ce classement retient l'autonomie réelle en usage mixte, et non le chiffre WLTP affiché en concession, qui la surestime souvent de 15 à 30 %. ${cap(withArticle(l[0]!))} prend la tête avec ${rangeSentence(l[0]!)}.`,
      `Quand un essai indépendant existe (protocole Bjørn Nyland à 90 et 120 km/h, supertests de la presse), l'autonomie est dite mesurée ; sinon elle est estimée à partir de la consommation et de la batterie utile. Les 25 modèles les plus endurants du marché français figurent ci-dessous.`,
    ],
    faq: (l) => {
      const highway = [...l].sort((a, b) => facts(b).rangeHighway - facts(a).rangeHighway)[0]!;
      const under40 = l.filter((v) => price(v) <= 40000);
      return [
        {
          question: "Quelle voiture électrique a la plus grande autonomie ?",
          answer: `${cap(withArticle(l[0]!))} a la plus grande autonomie réelle de notre comparatif : ${rangeSentence(l[0]!)}, pour un prix ${priceSentence(l[0]!)}.`,
        },
        {
          question: "Quelle voiture électrique a la meilleure autonomie sur autoroute ?",
          answer: `À 130 km/h, ${withArticle(highway)} va le plus loin : environ ${facts(highway).rangeHighway} km entre deux recharges.`,
        },
        {
          question: "Quelle voiture électrique à grande autonomie coûte moins de 40 000 € ?",
          answer:
            under40.length > 0
              ? `${cap(withArticle(under40[0]!))} est la mieux placée de ce classement sous 40 000 € : ${rangeSentence(under40[0]!)}, ${priceSentence(under40[0]!)}.`
              : "Aucun modèle de ce classement ne descend sous 40 000 € : les grandes batteries restent chères.",
        },
      ];
    },
  },
  {
    slug: "recharge-rapide",
    label: "Recharge la plus rapide",
    title: `Voiture électrique à recharge rapide : le top ${SEO_YEAR}`,
    h1: "Les voitures électriques qui rechargent le plus vite",
    eyebrow: "Classement recharge",
    select: (all) =>
      passengerPool(all)
        .filter((v) => facts(v).dcMin != null)
        .sort(byCharge)
        .slice(0, 25),
    sortedBy: "charge",
    columns: ["charge", "range", "price"],
    description: (l) =>
      `Classement ${SEO_YEAR} des voitures électriques qui rechargent le plus vite de 10 à 80 % : ${getVehicleName(l[0]!)} en ${facts(l[0]!).dcMin} min. Puissance de charge, autonomie et prix.`,
    intro: (l) => {
      const v800 = l.filter((v) => v.architecture_V === 800).length;
      return [
        `Sur un long trajet, la vitesse de recharge compte autant que l'autonomie. Ce classement retient le temps pour passer de 10 à 80 % sur une borne rapide adaptée : ${withArticle(l[0]!)} y parvient en ${facts(l[0]!).dcMin} minutes.`,
        `${v800} des ${l.length} modèles du classement utilisent une architecture 800 volts, qui accepte des puissances plus élevées plus longtemps. La puissance de pointe ne suffit pas : c'est la tenue de la courbe de charge entre 10 et 80 % qui fait la différence.`,
      ];
    },
    faq: (l) => {
      const cheap = l.filter((v) => price(v) <= 40000);
      return [
        {
          question: "Quelle voiture électrique recharge le plus vite ?",
          answer: `${cap(withArticle(l[0]!))} recharge le plus vite de notre comparatif : 10 à 80 % en ${facts(l[0]!).dcMin} minutes, avec une puissance de pointe de ${facts(l[0]!).dcPeak} kW.`,
        },
        {
          question: "Quelle voiture électrique à moins de 40 000 € recharge vite ?",
          answer:
            cheap.length > 0
              ? `${cap(withArticle(cheap[0]!))} est la plus rapide sous 40 000 € : 10 à 80 % en ${facts(cheap[0]!).dcMin} minutes, ${priceSentence(cheap[0]!)}.`
              : "Aucun modèle de ce classement ne descend sous 40 000 €.",
        },
        {
          question: "Pourquoi s'arrêter à 80 % sur borne rapide ?",
          answer:
            "Au-delà de 80 %, la puissance de charge chute fortement pour protéger la batterie : les 20 derniers pour cent prennent souvent autant de temps que les 70 précédents. Sur la route, mieux vaut repartir à 80 % et s'arrêter un peu plus souvent.",
        },
      ];
    },
  },
  {
    slug: "fabriquees-en-france",
    label: "Fabriquées en France",
    title: `Voiture électrique fabriquée en France : la liste ${SEO_YEAR}`,
    h1: "Voitures électriques fabriquées en France",
    eyebrow: "Made in France",
    select: (all) =>
      all
        .filter((v) => v.productionCountry === "France" && getMarketStatus(v) !== "discontinued" && facts(v).priceMin != null)
        .sort(byPrice),
    sortedBy: "price",
    columns: ["price", "country", "range", "charge"],
    description: (l) => {
      const cars = l.filter((v) => !isStrictUtility(v) && getBodyInfo(v).category !== "utilitaire");
      return `Les ${l.length} voitures électriques assemblées en France en ${SEO_YEAR}, usine par usine : ${cars
        .slice(0, 2)
        .map(getVehicleName)
        .join(", ")} et les autres. Prix, aides et autonomie réelle.`;
    },
    intro: (l) => {
      const plants = [...new Set(l.map((v) => v.assemblyPlant))].sort((a, b) => a.localeCompare(b, "fr"));
      return [
        `${l.length} voitures et utilitaires électriques vendus en France sortent d'usines françaises : ${plants.join(", ")}. Le tableau indique l'usine d'assemblage de chaque modèle, avec son prix et son autonomie réelle.`,
        `Produire en France ou en Europe améliore le score environnemental calculé par l'ADEME, qui conditionne le coup de pouce CEE et le leasing social : la plupart des modèles de cette liste y sont éligibles, sous conditions de prix et de revenus.`,
      ];
    },
    faq: (l) => {
      const eligible = l.filter((v) => facts(v).aids > 0);
      const cars = l.filter((v) => !isStrictUtility(v) && getBodyInfo(v).category !== "utilitaire");
      return [
        {
          question: "Quelles voitures électriques sont fabriquées en France ?",
          answer: `En ${SEO_YEAR}, ${l.length} modèles électriques sont assemblés en France, dont ${listNames(cars, 6)}.`,
        },
        {
          question: "Quelle est la voiture électrique française la moins chère ?",
          answer: `${cap(withArticle(cars[0]!))} est la voiture électrique fabriquée en France la moins chère, ${priceSentence(cars[0]!)}. Elle est assemblée à ${cars[0]!.assemblyPlant}.`,
        },
        {
          question: "Une voiture fabriquée en France donne-t-elle droit à plus d'aides ?",
          answer: `Pas directement : c'est le score environnemental de l'ADEME (au moins 60/100) qui ouvre droit au coup de pouce CEE, avec un prix sous 47 000 €. Une production européenne aide à atteindre ce score : ${eligible.length} des ${l.length} modèles de cette liste y sont éligibles d'après nos fiches.`,
        },
      ];
    },
  },
  {
    slug: "eligibles-prime-cee",
    label: "Éligibles prime CEE",
    title: `Prime CEE ${SEO_YEAR} : voitures électriques éligibles`,
    h1: "Voitures électriques éligibles à la prime CEE (coup de pouce)",
    eyebrow: "Aides à l'achat",
    select: (all) =>
      all
        .filter((v) => !isStrictUtility(v) && facts(v).aids > 0 && getMarketStatus(v) !== "discontinued")
        .sort((a, b) => aided(a) - aided(b)),
    sortedBy: "aided",
    columns: ["aided", "price", "range", "charge"],
    description: (l) =>
      `Les ${l.length} voitures électriques éligibles à la prime CEE en ${SEO_YEAR}, classées par prix après aides : dès ${eur(aided(l[0]!))}. Conditions, montants et autonomie réelle.`,
    intro: (l) => [
      `Le coup de pouce CEE finance l'achat d'une voiture électrique neuve sous trois conditions : un score environnemental ADEME d'au moins 60/100, un prix inférieur à 47 000 € et une masse sous 2,4 tonnes. ${l.length} modèles de notre catalogue les remplissent pour au moins une de leurs versions.`,
      `Le montant dépend de vos revenus par part fiscale : ${eur(CEE_BASE_EUR)} pour tout ménage, jusqu'à ${eur(CEE_MAX_EUR)} en situation de précarité, davantage quand la voiture et sa batterie sont produites en Europe (montants indicatifs, ${CEE_GRID_LABEL} ; ils varient selon l'organisme qui verse la prime). Le classement ci-dessous part du prix de la version d'entrée diminué de la prime de tout ménage. La demande se fait avant la signature du bon de commande.`,
    ],
    faq: (l) => [
      {
        question: "Quelles sont les conditions de la prime CEE pour une voiture électrique ?",
        answer:
          "La voiture doit être neuve, 100 % électrique, avoir un score environnemental ADEME d'au moins 60/100, coûter moins de 47 000 € et peser moins de 2,4 tonnes. Le montant varie ensuite selon le revenu fiscal de référence par part, le kilométrage professionnel (plus de 12 000 km par an, jusqu'à fin 2026) et le lieu de production de la voiture et de sa batterie.",
      },
      {
        question: "Quelle est la voiture électrique la moins chère après la prime CEE ?",
        answer: `${cap(withArticle(l[0]!))} est la moins chère avec la prime de tout ménage : ${eur(aided(l[0]!))} au lieu de ${eur(price(l[0]!))}.`,
      },
      {
        question: "Comment obtenir la prime CEE ?",
        answer:
          "La demande doit être faite avant la signature du bon de commande, auprès d'un fournisseur d'énergie ou d'un organisme partenaire du programme, souvent par l'intermédiaire du concessionnaire. L'aide est ensuite déduite du prix ou versée après l'achat.",
      },
    ],
  },
];

export function getCategory(slug: string): VehicleCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

const selections = new Map<string, Set<string>>();

/** Sélections dans lesquelles figure un véhicule (liens « Voir aussi » des fiches). */
export function getCategoriesFor(v: Vehicle, all: Vehicle[]): VehicleCategory[] {
  return CATEGORIES.filter((c) => {
    if (!selections.has(c.slug)) selections.set(c.slug, new Set(c.select(all).map((o) => o.slug)));
    return selections.get(c.slug)!.has(v.slug);
  });
}
