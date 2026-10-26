/**
 * « Image de ce duel » : les deux modèles et quatre critères (autonomie réelle, hiver, prix après
 * prime, recharge), dessinés sur l'appareil par lib/shareCard. Données préparées au build.
 */
import ShareImage from "@/components/ui/ShareImage";
import { drawDuelCard, type DuelCard } from "@/lib/shareCard";

interface Props {
  card: DuelCard;
  url: string;
}

export default function DuelShare({ card, url }: Props) {
  return (
    <ShareImage
      label="Image de ce duel"
      draw={() => drawDuelCard(card)}
      version={card.path}
      fileName={`${card.path.split("/").pop()}-evly.png`}
      shareTitle={`${card.a.name} ou ${card.b.name} ?`}
      shareText={`${card.a.name} ou ${card.b.name} : autonomie réelle, hiver, prix et recharge sur les mêmes mesures.`}
      shareUrl={url}
    />
  );
}
