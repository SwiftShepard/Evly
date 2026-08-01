interface Props {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  success: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  cardNumber: string;
  onCardNumberChange: (value: string) => void;
  cardExpiry: string;
  onCardExpiryChange: (value: string) => void;
  cardCvc: string;
  onCardCvcChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  description: string;
  successMessage: string;
}

function formatCardNumber(raw: string): string {
  const val = raw.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
  const matches = val.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || "";
  const parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  return parts.length > 0 ? parts.join(" ") : val;
}

function formatCardExpiry(raw: string): string {
  let val = raw.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
  if (val.length >= 2) {
    val = val.substring(0, 2) + "/" + val.substring(2, 4);
  }
  return val;
}

/**
 * Modale de paiement carte, partagee entre le matcher strategique et le
 * simulateur TCO (F8). Placeholder visuel : aucun appel reseau reel n'est
 * effectue, cf. roadmap F8 pour le vrai branchement Stripe.
 */
export default function CardPaymentModal({
  isOpen,
  onClose,
  loading,
  success,
  email,
  onEmailChange,
  cardNumber,
  onCardNumberChange,
  cardExpiry,
  onCardExpiryChange,
  cardCvc,
  onCardCvcChange,
  onSubmit,
  title,
  description,
  successMessage,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative flex flex-col gap-5 text-[var(--color-text)]">
        <button
          onClick={() => {
            if (!loading && !success) onClose();
          }}
          className="absolute top-4 right-4 text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer"
          title="Fermer"
          disabled={loading || success}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent-dim)] flex items-center justify-center text-[var(--color-accent)] animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Paiement validé !</h3>
            <p className="text-sm text-[var(--color-text-muted)] max-w-xs leading-relaxed">{successMessage}</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-4 animate-fade-in">
            <div className="w-12 h-12 border-4 border-[var(--color-accent-dim)] border-t-[var(--color-accent)] rounded-full animate-spin"></div>
            <h3 className="text-lg font-semibold">Traitement en cours...</h3>
            <p className="text-xs text-[var(--color-text-faint)]">
              Connexion sécurisée avec Stripe. Veuillez ne pas fermer cette fenêtre.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
            </div>

            <div className="flex justify-between items-center bg-[var(--color-bg-subtle)] p-3 rounded-lg border border-[var(--color-border)]">
              <span className="text-xs font-mono uppercase text-[var(--color-text-muted)]">Total à payer</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-[var(--color-text-faint)] line-through">19,90 €</span>
                <span className="text-xl font-bold text-[var(--color-accent)]">9,90 €</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)]">Adresse e-mail</label>
                <input
                  type="email"
                  required
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)]">Numéro de carte</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => onCardNumberChange(formatCardNumber(e.target.value))}
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect width="22" height="16" x="1" y="4" rx="3" />
                      <line x1="1" x2="23" y1="10" y2="10" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)]">Date d'exp.</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => onCardExpiryChange(formatCardExpiry(e.target.value))}
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-faint)]">CVC</label>
                  <input
                    type="password"
                    required
                    maxLength={3}
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => onCardCvcChange(e.target.value.replace(/[^0-9]/gi, ""))}
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] text-[var(--color-accent-on)] text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-md mt-2 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Payer 9,90 € via Stripe
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--color-text-faint)] font-mono mt-1">
              <span>🔒 SSL chiffré 100% sécurisé</span>
              <span>·</span>
              <span>Garantie 14j</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
