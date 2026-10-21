import {
  Briefcase,
  Castle,
  Clapperboard,
  Croissant,
  Dumbbell,
  Hammer,
  Landmark,
  MapPin,
  Mountain,
  Pill,
  PlugZap,
  School,
  ShoppingCart,
  Store,
  Trees,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  travail: Briefcase,
  courses: ShoppingCart,
  boulangerie: Croissant,
  bricolage: Hammer,
  restaurant: UtensilsCrossed,
  ecole: School,
  cinema: Clapperboard,
  sport: Dumbbell,
  marche: Store,
  pharmacie: Pill,
  balade: Trees,
  chateau: Castle,
  patrimoine: Landmark,
  monument: Landmark,
  musee: Landmark,
  sommet: Mountain,
  nature: Trees,
  parc: Trees,
  plage: Trees,
  borne: PlugZap,
};

export function CategoryIcon({ cat, size = 16 }: { cat: string; size?: number }) {
  const Icon = ICONS[cat] ?? MapPin;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}
