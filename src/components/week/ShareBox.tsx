/**
 * Partage de la semaine : adresse exacte pour les proches, position floutée (à 500 m près) pour
 * un partage public, ou lien lisible qui ne garde que les communes (la « question », à coller
 * sous un message de forum) ; et l'image de la semaine, sans adresse. Déplié sur place.
 */
import { useState } from "react";
import { Check, Link as LinkIcon, Share2 } from "lucide-react";
import { questionUrl, shareUrl, type SharedWeek, type WeekQuestion } from "@/lib/map/share";
import { drawWeekCard, type WeekCard } from "@/lib/shareCard";
import ShareImage from "@/components/ui/ShareImage";

interface Props {
  week: SharedWeek | null;
  /** Ce que montre l'image de la semaine, quand la semaine est calculée */
  card: WeekCard | null;
  /** La semaine réduite à ses communes ; null si le domicile n'en donne pas */
  question: WeekQuestion | null;
}

type Precision = "public" | "exact" | "communes";

export default function ShareBox({ week, card, question }: Props) {
  const [open, setOpen] = useState(false);
  const [precision, setPrecision] = useState<Precision>("public");
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (!week) return;
    const link = precision === "communes" && question ? questionUrl(question) : shareUrl(week, precision === "exact");
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "Ma semaine en électrique", url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* partage annulé ou presse-papiers refusé */
    }
  };

  const options: [Precision, string, string][] = [
    ["public", "Public", "votre domicile apparaît à 500 m près"],
    ["exact", "Pour mes proches", "adresse exacte"],
  ];
  if (question) options.push(["communes", "Lien lisible", `les communes seulement (${[question.home, question.work].filter(Boolean).join(" → ")}), sans le reste de la semaine`]);

  return (
    <div className="week-share">
      <button type="button" className="btn btn-sm btn-secondary" aria-expanded={open} disabled={!week} onClick={() => setOpen((o) => !o)}>
        <Share2 size={15} strokeWidth={2.2} aria-hidden="true" />
        Partager ma semaine
      </button>
      <div className="week-unfold" data-open={open ? "1" : undefined}>
        <div className="week-share-body">
          <div role="radiogroup" aria-label="Précision de l'adresse partagée" className="flex flex-col gap-2 pt-3">
            {options.map(([key, title, text]) => (
              <label key={key} className="week-radio">
                <input type="radio" name="share-precision" checked={precision === key} onChange={() => setPrecision(key)} />
                <span>
                  <b>{title}</b> : {text}
                </span>
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-sm btn-primary mt-3" onClick={share}>
            {copied ? <Check size={15} strokeWidth={2.4} aria-hidden="true" /> : <LinkIcon size={15} strokeWidth={2.2} aria-hidden="true" />}
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
          <p className="mt-2 text-[12px] leading-snug text-[var(--color-text-faint)]">
            {precision === "communes"
              ? "Le lien se lit et s'écrit à la main : ?domicile=…&travail=…&v=… Les communes sont retrouvées à l'ouverture."
              : "Tout est dans le lien lui-même : rien n'est enregistré chez Evly."}
          </p>
          {card && (
            <ShareImage
              className="mt-4 pt-4 border-t border-[var(--color-border)]"
              label="Image de ma semaine"
              draw={() => drawWeekCard(card)}
              version={JSON.stringify(card)}
              fileName="ma-semaine-evly.png"
              shareTitle="Ma semaine en électrique"
              shareText={card.compare?.length ? `Ma semaine en électrique, ${card.compare.length} modèles comparés.` : `Ma semaine en ${card.vehicle} : ${card.verdict.toLowerCase()}.`}
              shareUrl={`${location.origin}${location.pathname}`}
              note="Ni adresse ni carte sur l'image : seulement la semaine et ses chiffres. Elle est créée sur votre appareil."
            />
          )}
        </div>
      </div>
    </div>
  );
}
