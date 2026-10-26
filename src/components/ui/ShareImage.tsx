/**
 * « En image » : crée sur l'appareil l'image à partager (lib/shareCard), la montre dépliée sur
 * place, puis la partage (téléphone), la copie (ordinateur) ou la télécharge. Rien n'est envoyé
 * à Evly : l'image ne quitte l'appareil que par le geste du visiteur.
 */
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Image as ImageIcon, Share2 } from "lucide-react";
import { canCopyImage, canShareFile } from "@/lib/shareCard";

interface Props {
  /** Libellé du bouton */
  label: string;
  draw: () => Promise<Blob>;
  /** Change dès que l'image doit être redessinée (autre modèle, autre saison…) */
  version: string;
  fileName: string;
  shareTitle: string;
  shareText: string;
  shareUrl: string;
  note?: string;
  className?: string;
}

export default function ShareImage({ label, draw, version, fileName, shareTitle, shareText, shareUrl, note, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<{ blob: Blob; src: string; version: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"copied" | "shared" | null>(null);
  const [failed, setFailed] = useState(false);
  const [can, setCan] = useState({ share: false, copy: false });
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => setCan({ share: canShareFile(), copy: canCopyImage() }), []);

  // Image (re)dessinée à l'ouverture, puis à chaque changement de ce qu'elle montre
  useEffect(() => {
    if (!open || image?.version === version) return;
    let stale = false;
    setBusy(true);
    setFailed(false);
    drawRef
      .current()
      .then((blob) => {
        if (stale) return;
        setImage((prev) => {
          if (prev) URL.revokeObjectURL(prev.src);
          return { blob, src: URL.createObjectURL(blob), version };
        });
      })
      .catch(() => !stale && setFailed(true))
      .finally(() => !stale && setBusy(false));
    return () => {
      stale = true;
    };
  }, [open, version, image?.version]);

  useEffect(() => () => { if (image) URL.revokeObjectURL(image.src); }, [image]);

  const flash = (kind: "copied" | "shared") => {
    setDone(kind);
    setTimeout(() => setDone(null), 2200);
  };

  const share = async () => {
    if (!image) return;
    try {
      await navigator.share({ files: [new File([image.blob], fileName, { type: "image/png" })], title: shareTitle, text: `${shareText} ${shareUrl}` });
      flash("shared");
    } catch {
      /* partage annulé */
    }
  };
  const copy = async () => {
    if (!image) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image.blob })]);
      flash("copied");
    } catch {
      setFailed(true);
    }
  };
  const download = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image.src;
    a.download = fileName;
    a.click();
  };

  return (
    <div className={`share-img ${className}`}>
      <button type="button" className="btn btn-sm btn-secondary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ImageIcon size={15} strokeWidth={2.2} aria-hidden="true" />
        {label}
      </button>
      <div className="share-img-reveal" data-open={open ? "1" : undefined}>
        <div>
          <div className="share-img-body">
            <div className="share-img-preview" data-busy={busy ? "1" : undefined}>
              {image ? <img src={image.src} alt={`Aperçu : ${shareTitle}`} width={540} height={540} /> : <span>{failed ? "Image indisponible sur ce navigateur." : "Création de l'image…"}</span>}
            </div>
            <div className="share-img-actions">
              {can.share && (
                <button type="button" className="btn btn-sm btn-primary" onClick={share} disabled={!image}>
                  {done === "shared" ? <Check size={15} strokeWidth={2.4} aria-hidden="true" /> : <Share2 size={15} strokeWidth={2.2} aria-hidden="true" />}
                  Partager l'image
                </button>
              )}
              {!can.share && can.copy && (
                <button type="button" className="btn btn-sm btn-primary" onClick={copy} disabled={!image}>
                  {done === "copied" ? <Check size={15} strokeWidth={2.4} aria-hidden="true" /> : <Copy size={15} strokeWidth={2.2} aria-hidden="true" />}
                  {done === "copied" ? "Image copiée" : "Copier l'image"}
                </button>
              )}
              <button type="button" className="btn btn-sm btn-secondary" onClick={download} disabled={!image}>
                <Download size={15} strokeWidth={2.2} aria-hidden="true" />
                Télécharger
              </button>
            </div>
            <p className="share-img-note">{note ?? "L'image est créée sur votre appareil : rien n'est envoyé à Evly."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
