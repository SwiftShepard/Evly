/**
 * Partage de la semaine : adresse exacte pour les proches, ou position floutée
 * (à 500 m près) pour un partage public. Déplié sur place.
 */
import { useState } from "react";
import { Check, Link as LinkIcon, Share2 } from "lucide-react";
import { shareUrl, type SharedWeek } from "@/lib/map/share";

interface Props {
  week: SharedWeek | null;
}

export default function ShareBox({ week }: Props) {
  const [open, setOpen] = useState(false);
  const [exact, setExact] = useState(false);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (!week) return;
    const link = shareUrl(week, exact);
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

  return (
    <div className="week-share">
      <button type="button" className="btn btn-sm btn-secondary" aria-expanded={open} disabled={!week} onClick={() => setOpen((o) => !o)}>
        <Share2 size={15} strokeWidth={2.2} aria-hidden="true" />
        Partager ma semaine
      </button>
      <div className="week-unfold" data-open={open ? "1" : undefined}>
        <div className="week-share-body">
          <div role="radiogroup" aria-label="Précision de l'adresse partagée" className="flex flex-col gap-2 pt-3">
            <label className="week-radio">
              <input type="radio" name="share-precision" checked={!exact} onChange={() => setExact(false)} />
              <span>
                <b>Public</b> : votre domicile apparaît à 500 m près
              </span>
            </label>
            <label className="week-radio">
              <input type="radio" name="share-precision" checked={exact} onChange={() => setExact(true)} />
              <span>
                <b>Pour mes proches</b> : adresse exacte
              </span>
            </label>
          </div>
          <button type="button" className="btn btn-sm btn-primary mt-3" onClick={share}>
            {copied ? <Check size={15} strokeWidth={2.4} aria-hidden="true" /> : <LinkIcon size={15} strokeWidth={2.2} aria-hidden="true" />}
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
          <p className="mt-2 text-[12px] leading-snug text-[var(--color-text-faint)]">
            Tout est dans le lien lui-même : rien n'est enregistré chez Evly.
          </p>
        </div>
      </div>
    </div>
  );
}
