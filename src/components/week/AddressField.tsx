/**
 * Champ de lieu : une adresse, une commune, ou simplement le nom d'un endroit qu'on connaît
 * (« Fitness Park », « Carrefour », « Isola 2000 »). Les lieux qui portent les mots tapés
 * passent en premier ; avec un point de référence (domicile, travail), du plus proche au plus loin.
 * En mode `inline` (dans une brique dépliée), les résultats s'affichent dans le flux, sous le
 * champ, et le champ vide propose les lieux les plus proches (`suggestions`).
 * La saisie part vers les services de recherche publics (lib/map/search) ; Evly n'en garde rien.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { Place } from "./types";
import { searchPlaces, type FoundPlace } from "@/lib/map/search";
import { formatKm, formatNumber } from "@/lib/format";

interface Props {
  label: string;
  /** Libellé lu par les lecteurs d'écran seulement (le contexte le donne déjà) */
  hideLabel?: boolean;
  value: Place | null;
  placeholder?: string;
  /** Point autour duquel chercher (domicile, travail) */
  near?: { lat: number; lon: number } | null;
  /** Résultats dans le flux plutôt qu'en liste flottante */
  inline?: boolean;
  /** Champ vide, en mode inline : lieux proposés (du plus proche au plus loin) */
  suggestions?: FoundPlace[];
  /** Lieu actuellement retenu, marqué dans les propositions */
  selected?: Place | null;
  autoFocus?: boolean;
  onChange: (place: Place | null) => void;
}

const distance = (m: number) => (m < 1000 ? `${Math.round(m / 50) * 50} m` : m < 10_000 ? `${formatNumber(m / 1000, 1)} km` : formatKm(m / 1000));
const same = (a: { lat: number; lon: number } | null | undefined, b: { lat: number; lon: number }) =>
  !!a && Math.abs(a.lat - b.lat) < 1e-5 && Math.abs(a.lon - b.lon) < 1e-5;

export default function AddressField({ label, hideLabel = false, value, placeholder, near = null, inline = false, suggestions = [], selected = null, autoFocus = false, onChange }: Props) {
  const id = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [results, setResults] = useState<FoundPlace[]>([]);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useRef(false);

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.label]);

  const query = typed.current ? text.trim() : "";
  const nearKey = near ? `${near.lat.toFixed(2)},${near.lon.toFixed(2)}` : "";
  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setSearched(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchPlaces(query, near, ctrl.signal)
        .then((r) => {
          setResults(r);
          setSearched(true);
          setActive(0);
          setOpen(true);
        })
        .catch(() => {});
    }, 260);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, nearKey]);

  // En ligne : la recherche dès 3 lettres, sinon les lieux proposés
  const list = inline ? (query.length >= 3 ? results : suggestions) : results;
  const shown = inline || (open && list.length > 0);

  const pick = (p: FoundPlace) => {
    typed.current = false;
    // Brique : le champ se vide (le lieu s'affiche dans l'en-tête) ; travail, domicile : il garde le lieu
    setText(inline && !value ? "" : p.label);
    setOpen(false);
    onChange({ label: p.label, lat: p.lat, lon: p.lon });
  };

  return (
    <div className="week-field">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "label-eyebrow"}>{label}</label>
      <div className="week-combo" data-inline={inline ? "1" : undefined}>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={shown && list.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            typed.current = true;
            setText(e.target.value);
            if (!e.target.value && !inline) onChange(null);
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!list.length || (!inline && !open)) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % list.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + list.length) % list.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(list[active]!);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {shown && list.length > 0 && (
          <ul id={`${id}-list`} role="listbox" aria-label={inline && query.length < 3 ? "Près de chez vous" : `Résultats : ${label.toLowerCase()}`} className="week-combo-list">
            {list.map((r, i) => (
              <li
                key={`${r.lat},${r.lon}`}
                role="option"
                aria-selected={inline ? same(selected, r) : i === active}
                data-active={inline && i === active && query.length >= 3 ? "1" : undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r);
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{r.label}</span>
                  {r.detail && <span className="block truncate text-[12px] text-[var(--color-text-faint)]">{r.detail}</span>}
                </span>
                {r.d !== null && <span className="tabular shrink-0 text-[12px] text-[var(--color-text-faint)]">{distance(r.d)}</span>}
              </li>
            ))}
          </ul>
        )}
        {searched && query.length >= 3 && !results.length && (inline || open) && (
          <p className="week-combo-empty">Rien trouvé pour « {query} ». Essayez le nom du lieu, son adresse ou sa commune.</p>
        )}
      </div>
    </div>
  );
}
