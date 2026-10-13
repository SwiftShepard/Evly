/**
 * Champ de lieu : une adresse, une commune, ou simplement le nom d'un endroit qu'on connaît
 * (« Fitness Park », « Carrefour »). Avec un point de référence (domicile, travail), les
 * suggestions se limitent aux alentours, du plus proche au plus loin.
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
  onChange: (place: Place | null) => void;
}

const distance = (m: number) => (m < 1000 ? `${Math.round(m / 50) * 50} m` : m < 10_000 ? `${formatNumber(m / 1000, 1)} km` : formatKm(m / 1000));

export default function AddressField({ label, hideLabel = false, value, placeholder, near = null, onChange }: Props) {
  const id = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [results, setResults] = useState<FoundPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useRef(false);

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.label]);

  const nearKey = near ? `${near.lat.toFixed(2)},${near.lon.toFixed(2)}` : "";
  useEffect(() => {
    if (!typed.current || text.trim().length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchPlaces(text, near, ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(0);
          setOpen(true);
        })
        .catch(() => {});
    }, 260);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [text, nearKey]);

  const pick = (p: FoundPlace) => {
    typed.current = false;
    setText(p.label);
    setOpen(false);
    onChange({ label: p.label, lat: p.lat, lon: p.lon });
  };

  return (
    <div className="week-field">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "label-eyebrow"}>{label}</label>
      <div className="week-combo">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            typed.current = true;
            setText(e.target.value);
            if (!e.target.value) onChange(null);
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!open || !results.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(results[active]!);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {open && results.length > 0 && (
          <ul id={`${id}-list`} role="listbox" className="week-combo-list">
            {results.map((r, i) => (
              <li
                key={`${r.lat},${r.lon}`}
                role="option"
                aria-selected={i === active}
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
        {open && typed.current && text.trim().length >= 3 && !results.length && near && (
          <p className="week-combo-empty">Rien de ce nom à moins de 80 km.</p>
        )}
      </div>
    </div>
  );
}
