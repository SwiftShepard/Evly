/**
 * Informations légales du site, source unique pour les pages légales, le pied de page
 * et les liens de contact (aucune coordonnée ne doit être recopiée ailleurs).
 */

/** Pages légales, liées depuis le pied de page et entre elles */
export const LEGAL_PAGES = [
  { path: "/mentions-legales/", label: "Mentions légales" },
  { path: "/confidentialite/", label: "Confidentialité" },
  { path: "/cookies/", label: "Cookies et traceurs" },
  { path: "/conditions-utilisation/", label: "Conditions d'utilisation" },
  { path: "/accessibilite/", label: "Accessibilité" },
] as const;

/** Date de dernière mise à jour des pages légales (ISO) */
export const LEGAL_UPDATED = "2026-10-13";

export const PUBLISHER = {
  /** Éditeur personne physique à titre non professionnel (LCEN, art. 1-1, II) */
  name: "Valentin",
  status: "particulier, à titre non professionnel",
  email: "valentin.lothe.art@gmail.com",
  site: "ev-ly.com",
};

export const HOST = {
  name: "GitHub, Inc.",
  service: "GitHub Pages",
  address: "88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis",
  privacyUrl: "https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement",
};

export const ANALYTICS = {
  name: "Plausible Insights OÜ",
  service: "Plausible Analytics",
  address: "Västriku tn 2, 50403 Tartu, Estonie",
  dataPolicyUrl: "https://plausible.io/data-policy",
};

export const CNIL = {
  name: "Commission nationale de l'informatique et des libertés (CNIL)",
  address: "3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07",
  complaintUrl: "https://www.cnil.fr/fr/plaintes",
};

/** Clés de stockage local du navigateur réellement utilisées par le site */
export const LOCAL_STORAGE_KEYS = [
  {
    key: "evly-favorites",
    storage: "localStorage",
    purpose: "Liste des véhicules que vous avez mis en favoris (identifiants de fiches).",
    duration: "Jusqu'à ce que vous retiriez vos favoris ou effaciez les données du site.",
  },
  {
    key: "evly-user-profile",
    storage: "localStorage",
    purpose:
      "Profil fiscal que vous avez choisi d'enregistrer pour estimer vos aides : type de profil, taille du foyer, revenu fiscal de référence.",
    duration: "Jusqu'à ce que vous le réinitialisiez ou effaciez les données du site.",
  },
  {
    key: "evly-trajet",
    storage: "localStorage",
    purpose:
      "Votre trajet quotidien (kilomètres par jour) et si vous pouvez recharger chez vous, si vous les réglez : sert à estimer vos jours d'autonomie et votre coût d'énergie.",
    duration: "Jusqu'à ce que vous effaciez les données du site.",
  },
  {
    key: "evly-semaine",
    storage: "localStorage",
    purpose:
      "Pour la page « Ma semaine », si vous l'utilisez : votre adresse, celle de votre travail, les lieux de votre semaine, le modèle et les réglages choisis. Sert à retrouver votre semaine à la prochaine visite.",
    duration: "Jusqu'à ce que vous effaciez les données du site.",
  },
  {
    key: "evly-catalog-return",
    storage: "sessionStorage",
    purpose: "Mémorise la position dans le catalogue pour le bouton « Retour à la liste ».",
    duration: "Effacé automatiquement à la fermeture de l'onglet.",
  },
  {
    key: "plausible_ignore",
    storage: "localStorage",
    purpose: "Créé uniquement si vous refusez la mesure d'audience : mémorise ce refus.",
    duration: "Jusqu'à ce que vous réactiviez la mesure d'audience ou effaciez les données du site.",
  },
] as const;

export function mailto(subject?: string): string {
  return `mailto:${PUBLISHER.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}

export function formatLegalDate(iso: string = LEGAL_UPDATED): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
