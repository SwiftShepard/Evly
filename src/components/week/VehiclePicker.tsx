/**
 * Choix d'un modèle du catalogue par recherche (marque ou modèle).
 */
import { useId, useMemo, useState } from "react";
import type { WeekVehicle } from "./types";

interface Props {
  vehicles: WeekVehicle[];
  label: string;
  exclude?: string[];
  onPick: (v: WeekVehicle) => void;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function VehiclePicker({ vehicles, label, exclude = [], onPick }: Props) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return vehicles
      .filter((v) => !exclude.includes(v.slug))
      .filter((v) => words.every((w) => norm(`${v.brand} ${v.model}`).includes(w)))
      .slice(0, 8);
  }, [q, vehicles, exclude]);

  const pick = (v: WeekVehicle) => {
    onPick(v);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="week-combo">
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open && results.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={label}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + results.length) % results.length);
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            pick(results[active]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && results.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="week-combo-list">
          {results.map((v, i) => (
            <li
              key={v.slug}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(v);
              }}
            >
              {v.image && <img src={v.image} alt="" width={48} height={28} loading="lazy" className="vehicle-photo" />}
              <span>
                <span className="text-[var(--color-text-faint)]">{v.brand}</span> {v.model}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
