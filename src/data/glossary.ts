export interface GlossaryEntry {
  term: string;
  abbr?: string;
  category: "batterie" | "recharge" | "performance" | "autonomie" | "general";
  definition: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Kilowattheure",
    abbr: "kWh",
    category: "batterie",
    definition:
      "Unite d'energie. Capacite utile de la batterie (ex : 60 kWh). Plus le chiffre est eleve, plus l'autonomie potentielle est grande. Distinguer capacite brute (totale) et utile (accessible).",
  },
  {
    term: "Watt-heure par kilogramme",
    abbr: "Wh/kg",
    category: "batterie",
    definition:
      "Densite energetique gravimetrique. Indique combien d'energie la batterie stocke par kilo de masse. Les cellules NMC atteignent 250-300 Wh/kg, les LFP 160-200 Wh/kg. Plus c'est eleve, plus la batterie est legere a capacite egale.",
  },
  {
    term: "NMC",
    category: "batterie",
    definition:
      "Nickel-Manganese-Cobalt. Chimie de cathode offrant une haute densite energetique et une bonne puissance de charge. Utilisee par la majorite des VE europeens et coreens. Plus chere que le LFP, sensible aux hautes temperatures.",
  },
  {
    term: "LFP",
    category: "batterie",
    definition:
      "Lithium-Fer-Phosphate (LiFePO4). Chimie de cathode sans cobalt ni nickel : moins chere, plus durable (cycles), plus sure thermiquement. Densite energetique inferieure au NMC. Tres repandue chez BYD, Tesla (SR+), MG.",
  },
  {
    term: "State of Charge",
    abbr: "SOC",
    category: "batterie",
    definition:
      "Pourcentage de charge restant dans la batterie (0-100 %). Equivalent de la jauge d'essence. Les constructeurs recommandent de charger entre 20 et 80 % au quotidien pour preserver la longevite.",
  },
  {
    term: "State of Health",
    abbr: "SOH",
    category: "batterie",
    definition:
      "Etat de sante de la batterie, exprime en pourcentage de sa capacite originale. Une batterie neuve est a 100 % SOH. La garantie constructeur couvre generalement un minimum de 70 % SOH sur 8 ans.",
  },
  {
    term: "C-rate",
    category: "batterie",
    definition:
      "Rapport entre la puissance de charge et la capacite de la batterie. 1C signifie charger toute la batterie en 1 heure (ex : 60 kW sur 60 kWh). 2C = 30 min. Les VE modernes atteignent 2-4C en pic.",
  },
  {
    term: "Architecture 400 V / 800 V",
    category: "batterie",
    definition:
      "Tension nominale du pack batterie. A puissance egale, 800 V fait circuler deux fois moins de courant que 400 V, ce qui reduit les pertes thermiques et permet des cables plus fins. Resultat : recharge plus rapide et rendement superieur.",
  },
  {
    term: "Charge DC",
    abbr: "DC",
    category: "recharge",
    definition:
      "Courant continu. Les bornes rapides (50-350 kW) injectent directement du DC dans la batterie, court-circuitant le chargeur embarque. Utilise le connecteur CCS Combo 2 en Europe.",
  },
  {
    term: "Charge AC",
    abbr: "AC",
    category: "recharge",
    definition:
      "Courant alternatif. La prise domestique, la wallbox et les bornes publiques lentes fournissent de l'AC. Le chargeur embarque du vehicule le convertit en DC. Puissance typique : 7,4 kW (mono) ou 11-22 kW (tri).",
  },
  {
    term: "Courbe de charge",
    category: "recharge",
    definition:
      "Graphique montrant la puissance DC acceptee par la batterie en fonction du SOC. La puissance est maximale entre 10 et 30 % puis diminue progressivement. C'est la donnee la plus revelatrice de la vitesse reelle de recharge.",
  },
  {
    term: "Plug and Charge",
    abbr: "PnC",
    category: "recharge",
    definition:
      "Protocole ISO 15118. Le vehicule s'authentifie automatiquement a la borne : il suffit de brancher le cable, pas besoin de badge ou d'application. Le paiement est gere par le contrat du constructeur.",
  },
  {
    term: "Vehicle-to-Load",
    abbr: "V2L",
    category: "recharge",
    definition:
      "Fonction permettant d'utiliser la batterie du vehicule comme source d'electricite (prise 230 V, jusqu'a 3,6 kW). Utile en camping, chantier ou coupure de courant. Disponible sur Hyundai Ioniq 5/6, Kia EV6/9, etc.",
  },
  {
    term: "Vehicle-to-Grid",
    abbr: "V2G",
    category: "recharge",
    definition:
      "Technologie bidirectionnelle : le vehicule renvoie de l'electricite vers le reseau. Permet de lisser les pics de demande et de generer un revenu pour le proprietaire. Necessite une borne compatible et un contrat specifique.",
  },
  {
    term: "CCS Combo 2",
    abbr: "CCS",
    category: "recharge",
    definition:
      "Combined Charging System, standard europeen. Combine une prise AC Type 2 et deux broches DC supplementaires en un seul connecteur. Supporte jusqu'a 350 kW DC et 43 kW AC.",
  },
  {
    term: "Wallbox",
    category: "recharge",
    definition:
      "Borne de recharge murale domestique. Puissance typique 7,4 kW (mono) ou 11-22 kW (tri). Charge complete en 4-8 heures. Installation par un electricien IRVE, eligible au credit d'impot (300 euros).",
  },
  {
    term: "Coefficient de trainee",
    abbr: "Cx",
    category: "performance",
    definition:
      "Mesure de la resistance aerodynamique. Plus le Cx est bas, moins le vehicule freine dans l'air. Un Cx de 0,20 (Mercedes EQS) est excellent. 0,28-0,32 est la norme SUV. Impact direct sur la consommation a haute vitesse.",
  },
  {
    term: "Couple moteur",
    abbr: "Nm",
    category: "performance",
    definition:
      "Force de rotation du moteur, en Newton-metres. Les moteurs electriques delivrent 100 % du couple des 0 tr/min, d'ou l'acceleration instantanee. Valeurs typiques : 200-600 Nm selon le vehicule.",
  },
  {
    term: "Traction",
    abbr: "FWD / RWD / AWD",
    category: "performance",
    definition:
      "Type de transmission. FWD : roues avant motrices (economique). RWD : roues arriere (dynamique, meilleure repartition). AWD : quatre roues motrices (grip, acceleration), generalement via un second moteur.",
  },
  {
    term: "Freinage regeneratif",
    abbr: "regen",
    category: "performance",
    definition:
      "Le moteur electrique fonctionne en generateur au freinage ou au lacher de l'accelerateur, convertissant l'energie cinetique en electricite stockee dans la batterie. Peut recuperer 10-30 % d'autonomie en ville.",
  },
  {
    term: "WLTP",
    category: "autonomie",
    definition:
      "Worldwide Harmonized Light-vehicle Test Procedure. Cycle de test reglementaire europeen simulant ville, route et autoroute. L'autonomie WLTP est toujours optimiste : prevoir -15 a -25 % en conditions reelles.",
  },
  {
    term: "Autonomie reelle",
    category: "autonomie",
    definition:
      "Kilometres effectivement parcourus dans des conditions normales d'usage (temperature, vitesse, passagers, clim). Evly croise les tests independants (Bjorn Nyland, EVKX) pour estimer ce chiffre.",
  },
  {
    term: "Consommation",
    abbr: "kWh/100 km",
    category: "autonomie",
    definition:
      "Equivalent electrique du L/100 km. Indique combien d'energie le vehicule consomme sur 100 km. Valeurs typiques : 14-18 kWh/100 en ville, 20-28 kWh/100 sur autoroute. Depend fortement de la vitesse et de la temperature.",
  },
  {
    term: "Coup de pouce CEE",
    abbr: "CEE",
    category: "general",
    definition:
      "Prime 'coup de pouce vehicules particuliers electriques', financee par les certificats d'economies d'energie. Remplace le bonus ecologique depuis le 1er juillet 2025. Trois niveaux selon le revenu fiscal de reference par part : 5 700 € (menage precaire), 4 700 € (modeste), 3 500 € (autre). Cumulable avec le surbonus batterie europeenne (1 200 a 2 000 €). Plafond maximal : 7 700 €. Conditions : VE neuf M1, prix < 47 000 €, masse < 2 400 kg, score ADEME >= 60/80. Demande avant signature du bon de commande.",
  },
  {
    term: "Prime a la conversion",
    category: "general",
    definition:
      "Aide gouvernementale francaise pour le remplacement d'un ancien vehicule thermique par un VE. Montant variable selon le revenu fiscal et l'age du vehicule mis au rebut.",
  },
  {
    term: "Surbonus batterie europeenne",
    category: "general",
    definition:
      "Prime complementaire de 1 200 a 2 000 € cumulable avec le coup de pouce CEE, accordee si le vehicule est assemble en Europe et que sa batterie (cellules incluses) est fabriquee en zone economique europeenne. Le montant varie selon le constructeur. La liste des modeles eligibles est publiee par l'ADEME.",
  },
  {
    term: "Leasing social",
    category: "general",
    definition:
      "Dispositif gouvernemental permettant aux menages modestes de louer un VE neuf a partir de 100 euros/mois. Eligibilite sous conditions de revenu fiscal de reference. Nombre de vehicules limite par vague.",
  },
  {
    term: "Score environnemental",
    category: "general",
    definition:
      "Note attribuee par l'ADEME a chaque modele VE, tenant compte de l'empreinte carbone de la fabrication (batterie, assemblage, transport). Conditionne l'eligibilite aux aides CEE et au leasing social.",
  },
];

export const CATEGORIES: Record<string, string> = {
  batterie: "Batterie & chimie",
  recharge: "Recharge",
  performance: "Performance & conduite",
  autonomie: "Autonomie & consommation",
  general: "Aides & reglementation",
};
