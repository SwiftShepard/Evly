/**
 * Champ d'adresse avec suggestions de la Base Adresse Nationale (Géoplateforme IGN).
 * L'adresse tapée part vers ce service public pour être localisée ; Evly n'en garde rien.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { Place } from "./types";

const ENDPOINT = "https://data.geopf.fr/geocodage/search";

interface Props {
  label: string;
  /** Libellé lu par les lecteurs d'écran seulement (le contexte le donne déjà) */
  hideLabel?: boolean;
  value: Place | null;
  placeholder?: string;
  onChange: (place: Place | null) => void;
}

export async function geocode(q: string, signal?: AbortSignal): Promise<Place[]> {
  const res = await fetch(`${ENDPOINT}?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? []).map((f: any) => ({
    label: f.properties.label as string,
    lon: f.geometry.coordinates[0] as number,
    lat: f.geometry.coordinates[1] as number,
  }));
}

export default function AddressField({ label, hideLabel = false, value, placeholder, onChange }: Props) {
  const id = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useRef(false);

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.label]);

  useEffect(() => {
    if (!typed.current || text.trim().length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      geocode(text, ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(0);
          setOpen(true);
        })
        .catch(() => {});
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [text]);

  const pick = (p: Place) => {
    typed.current = false;
    setText(p.label);
    setOpen(false);
    onChange(p);
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
                {r.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
