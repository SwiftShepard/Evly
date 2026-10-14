import type { RangeSource } from "@/lib/map/energy";
import type { VehicleCharging } from "@/lib/map/week";

/** Version d'un modèle, regroupée par ce qui change le calcul (batterie, autonomie, recharge) */
export interface WeekVersion {
  /** Identifiant de la première configuration du groupe */
  id: string;
  /** « 52 kWh », ou « 75 kWh · Grande Autonomie » si deux versions ont la même batterie */
  label: string;
  /** Finitions concernées */
  detail: string;
  /** Configurations de la fiche regroupées dans cette version */
  configs: string[];
  /** Autonomie mesurée (essais) plutôt qu'estimée */
  measured: boolean;
  range: RangeSource;
  charging: VehicleCharging;
}

/** Modèle du catalogue tel que la page « Ma semaine » le reçoit */
export interface WeekVehicle {
  slug: string;
  brand: string;
  model: string;
  image: string | null;
  /** Prix d'entrée (€), pour proposer des modèles proches quand la semaine ne passe pas */
  price: number | null;
  /** Utilitaire strict : jamais proposé en remplacement d'une voiture */
  utility: boolean;
  versions: WeekVersion[];
  /** Version de la fiche, proposée par défaut */
  defaultVersion: string;
}

/** Modèle choisi dans une version : ce que reçoivent les calculs */
export interface Driven extends WeekVehicle {
  /** « slug@version » : clé des calculs et des zones */
  key: string;
  version: WeekVersion;
  range: RangeSource;
  charging: VehicleCharging;
  measured: boolean;
}

/** Lieu géocodé */
export interface Place {
  label: string;
  lat: number;
  lon: number;
}
