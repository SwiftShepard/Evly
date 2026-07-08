import { useMemo, Fragment } from "react";
import type { Vehicle, VehicleConfiguration } from "@/data/schemas";
import type { ConfiguredCard } from "@/lib/insights";
import ConfigSelector from "./ConfigSelector";
import { url } from "@/lib/url";
import { calculateCeeAid } from "@/lib/cee";
import { readUserProfile } from "@/lib/userProfile";
import { X, Plus } from "lucide-react";

interface Props {
  cards: ConfiguredCard[];
  onRemove: (index: number) => void;
  onConfigChange: (index: number, configId: string) => void;
  onAdd: () => void;
  maxCards: number;
}

interface RowDef {
  label: string;
  getValue: (card: ConfiguredCard) => string | null;
  numeric?: (card: ConfiguredCard) => number | null;
  bestIsMax?: boolean;
}

interface SectionDef {
  title: string;
  rows: RowDef[];
}

/* ── formatters ── */
const fmtN = (n: number | null | undefined, d = 0): string | null =>
  n != null ? n.toLocaleString("fr-FR", { maximumFractionDigits: d }) : null;

const fmtPrix = (n: number | null | undefined): string | null =>
  n != null
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
    : null;

/* ── rows definition ── */
const SECTIONS: SectionDef[] = [
  {
    title: "Autonomie",
    rows: [
      {
        label: "Mixte réelle",
        getValue: (c) => {
          const v = c.config.realRange?.mixed_km;
          return v ? `${fmtN(Math.round(v * (c.soh ?? 100) / 100))} km` : null;
        },
        numeric: (c) => {
          const v = c.config.realRange?.mixed_km;
          return v ? Math.round(v * (c.soh ?? 100) / 100) : null;
        },
        bestIsMax: true,
      },
      {
        label: "WLTP",
        getValue: (c) => {
          const v = c.config.wltp_km;
          return v ? `${fmtN(Math.round(v * (c.soh ?? 100) / 100))} km` : null;
        },
        numeric: (c) => {
          const v = c.config.wltp_km;
          return v ? Math.round(v * (c.soh ?? 100) / 100) : null;
        },
        bestIsMax: true,
      },
      {
        label: "Autoroute 130",
        getValue: (c) => {
          const v = c.config.realRange?.highway_130_km;
          return v ? `${fmtN(Math.round(v * (c.soh ?? 100) / 100))} km` : null;
        },
        numeric: (c) => {
          const v = c.config.realRange?.highway_130_km;
          return v ? Math.round(v * (c.soh ?? 100) / 100) : null;
        },
        bestIsMax: true,
      },
      {
        label: "Hiver -5°C",
        getValue: (c) => {
          const v = c.config.realRange?.winter_minus5_km;
          return v ? `${fmtN(Math.round(v * (c.soh ?? 100) / 100))} km` : null;
        },
        numeric: (c) => {
          const v = c.config.realRange?.winter_minus5_km;
          return v ? Math.round(v * (c.soh ?? 100) / 100) : null;
        },
        bestIsMax: true,
      },
    ],
  },
  {
    title: "Recharge",
    rows: [
      {
        label: "DC pic",
        getValue: (c) => c.config.chargingDC_peak_kW != null ? `${fmtN(c.config.chargingDC_peak_kW)} kW` : null,
        numeric: (c) => c.config.chargingDC_peak_kW ?? null,
        bestIsMax: true,
      },
      {
        label: "10→80 %",
        getValue: (c) => c.config.chargingDC_10_80_min != null ? `${fmtN(c.config.chargingDC_10_80_min)} min` : null,
        numeric: (c) => c.config.chargingDC_10_80_min ?? null,
        bestIsMax: false,
      },
      {
        label: "+30 min DC",
        getValue: (c) => c.config.chargingDC_kWh_30min != null ? `${fmtN(c.config.chargingDC_kWh_30min)} kWh` : null,
        numeric: (c) => c.config.chargingDC_kWh_30min ?? null,
        bestIsMax: true,
      },
      {
        label: "AC bord",
        getValue: (c) => c.vehicle.chargingAC?.onboardCharger_kW != null ? `${fmtN(c.vehicle.chargingAC.onboardCharger_kW, 1)} kW` : null,
        numeric: (c) => c.vehicle.chargingAC?.onboardCharger_kW ?? null,
        bestIsMax: true,
      },
    ],
  },
  {
    title: "Prix",
    rows: [
      {
        label: "Prix brut",
        getValue: (c) => fmtPrix(c.config.price_EUR) ?? "Tarif à venir",
        numeric: (c) => c.config.price_EUR ?? null,
        bestIsMax: false,
      },
      {
        label: "Aide CEE*",
        getValue: (c) => {
          const profile = readUserProfile();
          const total = calculateCeeAid({
            vehicle: c.vehicle,
            price: c.config.price_EUR,
            profileType: profile.hasConfigured ? profile.profileType : "particular",
            householdSize: profile.hasConfigured ? profile.householdSize : 1,
            taxIncome: profile.hasConfigured ? profile.taxIncome : 10000,
          }).amount;
          return total > 0 ? `-${fmtPrix(total)}` : null;
        },
        numeric: (c) => {
          const profile = readUserProfile();
          return calculateCeeAid({
            vehicle: c.vehicle,
            price: c.config.price_EUR,
            profileType: profile.hasConfigured ? profile.profileType : "particular",
            householdSize: profile.hasConfigured ? profile.householdSize : 1,
            taxIncome: profile.hasConfigured ? profile.taxIncome : 10000,
          }).amount;
        },
        bestIsMax: true,
      },
      {
        label: "Prix net*",
        getValue: (c) => {
          if (c.config.price_EUR == null) return "Tarif à venir";
          const profile = readUserProfile();
          const aids = calculateCeeAid({
            vehicle: c.vehicle,
            price: c.config.price_EUR,
            profileType: profile.hasConfigured ? profile.profileType : "particular",
            householdSize: profile.hasConfigured ? profile.householdSize : 1,
            taxIncome: profile.hasConfigured ? profile.taxIncome : 10000,
          }).amount;
          return fmtPrix(Math.max(0, c.config.price_EUR - aids));
        },
        numeric: (c) => {
          if (c.config.price_EUR == null) return null;
          const profile = readUserProfile();
          const aids = calculateCeeAid({
            vehicle: c.vehicle,
            price: c.config.price_EUR,
            profileType: profile.hasConfigured ? profile.profileType : "particular",
            householdSize: profile.hasConfigured ? profile.householdSize : 1,
            taxIncome: profile.hasConfigured ? profile.taxIncome : 10000,
          }).amount;
          return Math.max(0, c.config.price_EUR - aids);
        },
        bestIsMax: false,
      },
      {
        label: "Leasing social",
        getValue: (c) =>
          c.config.leasingSocialEligible && (c.vehicle.leasingSocial_EUR_per_month != null || c.config.monthlyLease_EUR != null)
            ? `${fmtN(c.vehicle.leasingSocial_EUR_per_month ?? c.config.monthlyLease_EUR)} €/mois`
            : null,
        numeric: (c) => c.vehicle.leasingSocial_EUR_per_month ?? c.config.monthlyLease_EUR ?? null,
        bestIsMax: false,
      },
    ],
  },
  {
    title: "Motorisation",
    rows: [
      {
        label: "Puissance",
        getValue: (c) => `${fmtN(c.vehicle.power_kW)} kW · ${fmtN(c.vehicle.power_hp)} ch`,
        numeric: (c) => c.vehicle.power_kW,
        bestIsMax: true,
      },
      {
        label: "Couple",
        getValue: (c) => `${fmtN(c.vehicle.torque_Nm)} Nm`,
        numeric: (c) => c.vehicle.torque_Nm,
        bestIsMax: true,
      },
      {
        label: "0-100 km/h",
        getValue: (c) => `${c.vehicle.acceleration_0_100_s.toString().replace(".", ",")} s`,
        numeric: (c) => c.vehicle.acceleration_0_100_s,
        bestIsMax: false,
      },
      {
        label: "V max",
        getValue: (c) => `${fmtN(c.vehicle.topSpeed_kmh)} km/h`,
        numeric: (c) => c.vehicle.topSpeed_kmh,
        bestIsMax: true,
      },
      {
        label: "Traction",
        getValue: (c) => c.vehicle.drivetrain,
      },
    ],
  },
  {
    title: "Batterie",
    rows: [
      {
        label: "Capacité",
        getValue: (c) => {
          const v = c.config.usableCapacity_kWh ?? c.vehicle.usableCapacity_kWh;
          return v ? `${fmtN(v * (c.soh ?? 100) / 100, 1)} kWh` : null;
        },
        numeric: (c) => {
          const v = c.config.usableCapacity_kWh ?? c.vehicle.usableCapacity_kWh;
          return v ? v * (c.soh ?? 100) / 100 : null;
        },
        bestIsMax: true,
      },
      {
        label: "Chimie",
        getValue: (c) => c.vehicle.chemistry,
      },
      {
        label: "Architecture",
        getValue: (c) => `${fmtN(c.vehicle.architecture_V)} V`,
        numeric: (c) => c.vehicle.architecture_V ?? null,
      },
      {
        label: "Conso. mixte",
        getValue: (c) =>
          c.config.wltp_consumption_kWh_100km != null
            ? `${c.config.wltp_consumption_kWh_100km.toString().replace(".", ",")} kWh/100`
            : null,
        numeric: (c) => c.config.wltp_consumption_kWh_100km ?? null,
        bestIsMax: false,
      },
    ],
  },
  {
    title: "Dimensions",
    rows: [
      {
        label: "Longueur",
        getValue: (c) => `${(c.vehicle.length_mm / 1000).toFixed(3).replace(".", ",")} m`,
        numeric: (c) => c.vehicle.length_mm,
      },
      {
        label: "Largeur",
        getValue: (c) => `${(c.vehicle.width_mm / 1000).toFixed(3).replace(".", ",")} m`,
        numeric: (c) => c.vehicle.width_mm,
      },
      {
        label: "Coffre",
        getValue: (c) => `${fmtN(c.vehicle.trunkCapacity_L)} L`,
        numeric: (c) => c.vehicle.trunkCapacity_L,
        bestIsMax: true,
      },
      {
        label: "Masse",
        getValue: (c) => `${fmtN(c.vehicle.mass_kg)} kg`,
        numeric: (c) => c.vehicle.mass_kg,
        bestIsMax: false,
      },
    ],
  },
];

/* ── colors ── */
const COL_WIDTH = 200;
const LABEL_WIDTH = 148;

const cellBase: React.CSSProperties = {
  padding: "10px 14px",
  verticalAlign: "middle",
  borderBottom: "0.5px solid var(--color-border)",
  whiteSpace: "nowrap",
};

export default function ComparisonTable({ cards, onRemove, onConfigChange, onAdd, maxCards }: Props) {
  const totalCols = cards.length + (cards.length < maxCards ? 1 : 0);

  /* ── best-value map per row label ── */
  const bestValues = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const section of SECTIONS) {
      for (const row of section.rows) {
        if (row.bestIsMax === undefined || !row.numeric) { map.set(row.label, null); continue; }
        const nums = cards.map((c) => row.numeric!(c)).filter((v): v is number => v !== null);
        if (nums.length < 2) { map.set(row.label, null); continue; }
        map.set(row.label, row.bestIsMax ? Math.max(...nums) : Math.min(...nums));
      }
    }
    return map;
  }, [cards]);

  if (cards.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl p-12 text-center"
        style={{ border: "1.5px dashed var(--color-border-strong)" }}
      >
        <span className="font-mono text-xs" style={{ color: "var(--color-text-faint)" }}>
          Aucun véhicule sélectionné
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--color-bg-subtle)", color: "var(--color-text-muted)" }}
        >
          <Plus size={14} />
          Ajouter un véhicule
        </button>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          borderCollapse: "separate",
          borderSpacing: 0,
          minWidth: LABEL_WIDTH + cards.length * COL_WIDTH,
          width: "100%",
          tableLayout: "fixed",
        }}
      >
        {/* ── col widths ── */}
        <colgroup>
          <col style={{ width: LABEL_WIDTH }} />
          {cards.map((_, i) => <col key={i} style={{ width: COL_WIDTH }} />)}
          {cards.length < maxCards && <col style={{ width: 56 }} />}
        </colgroup>

        {/* ── sticky header ── */}
        <thead>
          <tr>
            {/* Corner */}
            <th
              style={{
                ...cellBase,
                position: "sticky",
                top: 0,
                left: 0,
                zIndex: 30,
                backgroundColor: "var(--color-bg)",
                borderRight: "0.5px solid var(--color-border)",
                width: LABEL_WIDTH,
                textAlign: "left",
              }}
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "var(--color-text-faint)" }}>
                Critère
              </span>
            </th>

            {/* Vehicle columns */}
            {cards.map((card, i) => (
              <th
                key={i}
                style={{
                  ...cellBase,
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  backgroundColor: "var(--color-surface)",
                  borderRight: "0.5px solid var(--color-border)",
                  textAlign: "left",
                  padding: "10px 12px",
                }}
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  {/* Brand + remove */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] truncate" style={{ color: "var(--color-text-faint)" }}>
                        {card.vehicle.brand} · {card.vehicle.segment.split(", ")[0]}
                      </span>
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--color-text)", letterSpacing: "-0.01em" }}>
                        {card.vehicle.model}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      className="flex-shrink-0 p-1 rounded-md transition-colors"
                      style={{ color: "var(--color-text-faint)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--color-danger)";
                        e.currentTarget.style.backgroundColor = "var(--color-bg-subtle)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--color-text-faint)";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      aria-label={`Retirer ${card.vehicle.model}`}
                    >
                      <X size={13} strokeWidth={1.8} />
                    </button>
                  </div>

                  {/* Config selector (compact) */}
                  {card.vehicle.configurations.length > 1 && (
                    <ConfigSelector
                      vehicle={card.vehicle}
                      activeConfigId={card.config.id}
                      onConfigChange={(id) => onConfigChange(i, id)}
                      collapsed={true}
                      onToggleCollapse={() => {}}
                    />
                  )}

                  {/* Link to fiche */}
                  <a
                    href={url(`/vehicules/${card.vehicle.slug}?config=${card.config.id}${card.soh && card.soh !== 100 ? `&soh=${card.soh}` : ""}`)}
                    className="font-mono text-[9px] transition-colors"
                    style={{ color: "var(--color-text-faint)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-faint)"; }}
                  >
                    Voir la fiche →
                  </a>
                </div>
              </th>
            ))}

            {/* Add column */}
            {cards.length < maxCards && (
              <th
                style={{
                  ...cellBase,
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  backgroundColor: "var(--color-bg)",
                  textAlign: "center",
                  width: 56,
                }}
              >
                <button
                  type="button"
                  onClick={onAdd}
                  className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all"
                  style={{
                    backgroundColor: "var(--color-bg-subtle)",
                    border: "1px dashed var(--color-border-strong)",
                    color: "var(--color-text-faint)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-accent)";
                    e.currentTarget.style.color = "var(--color-accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border-strong)";
                    e.currentTarget.style.color = "var(--color-text-faint)";
                  }}
                  aria-label="Ajouter un véhicule"
                >
                  <Plus size={14} />
                </button>
              </th>
            )}
          </tr>
        </thead>

        {/* ── body ── */}
        <tbody>
          {SECTIONS.map((section, si) => (
            <Fragment key={`s-${si}`}>
              {/* Section header */}
              <tr>
                <td
                  colSpan={totalCols + 1}
                  style={{
                    ...cellBase,
                    position: "sticky",
                    left: 0,
                    backgroundColor: "var(--color-bg-subtle)",
                    borderTop: si > 0 ? "0.5px solid var(--color-border)" : undefined,
                    padding: "6px 14px",
                  }}
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] font-semibold" style={{ color: "var(--color-text-faint)" }}>
                    {section.title}
                  </span>
                </td>
              </tr>

              {/* Data rows */}
              {section.rows.map((row, ri) => {
                const bestVal = bestValues.get(row.label) ?? null;

                return (
                  <tr
                    key={`r-${si}-${ri}`}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "var(--color-bg-subtle)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ""; }}
                  >
                    {/* Label (sticky left) */}
                    <td
                      style={{
                        ...cellBase,
                        position: "sticky",
                        left: 0,
                        zIndex: 5,
                        backgroundColor: "var(--color-bg)",
                        borderRight: "0.5px solid var(--color-border)",
                        width: LABEL_WIDTH,
                      }}
                    >
                      <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                        {row.label}
                      </span>
                    </td>

                    {/* Values */}
                    {cards.map((card, ci) => {
                      const displayVal = row.getValue(card);
                      const numericVal = row.numeric?.(card) ?? null;
                      const isBest = bestVal !== null && numericVal !== null && numericVal === bestVal;

                      return (
                        <td
                          key={ci}
                          style={{
                            ...cellBase,
                            borderRight: "0.5px solid var(--color-border)",
                            backgroundColor: isBest
                              ? "color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))"
                              : "inherit",
                          }}
                        >
                          {displayVal != null ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={displayVal === "Tarif à venir" ? "text-xs italic font-normal text-[var(--color-text-faint)]" : "text-sm font-semibold tabular-nums"}
                                style={{
                                  color: displayVal === "Tarif à venir" ? "var(--color-text-faint)" : (isBest ? "var(--color-accent)" : "var(--color-text)"),
                                  letterSpacing: displayVal === "Tarif à venir" ? "normal" : "-0.01em",
                                }}
                              >
                                {displayVal}
                              </span>
                              {isBest && (
                                <span
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-surface-accent)] text-[var(--color-accent)] border border-[rgba(58,92,18,0.15)] ml-1"
                                  title={row.bestIsMax ? "Meilleur de la sélection" : "Moins cher / avantageux"}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-faint)" }}>
                              n/c
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Empty add-col cell */}
                    {cards.length < maxCards && (
                      <td style={{ ...cellBase, backgroundColor: "var(--color-bg)" }} />
                    )}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
