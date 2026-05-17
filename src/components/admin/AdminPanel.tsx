import { useState, useEffect, useCallback, useRef } from "react";

/* ---------------------------------------------------------------- */
/* Types                                                             */
/* ---------------------------------------------------------------- */

export interface VehicleAdminRow {
  slug: string;
  brand: string;
  model: string;
  variant: string;
  segment: string;
  hasImage: boolean;
  hasLogo: boolean;
  configsCount: number;
  trimsCount: number;
  batteryLabels: string[];
  hasBothBatteries: boolean;
  wltp_min: number;
  wltp_max: number;
  realRangeMixed: number;
  realRangeHighway: number;
  realRangeConfidence: string;
  hasRangeTests: boolean;
  sourcesCount: number;
  sources: string[];
  cheapestPrice: number;
  lastUpdated: string;
  releaseYear: number;
}

interface ValidationEntry {
  statsOk: boolean;
}
type ValidationState = Record<string, ValidationEntry>;
type FilterKey = "all" | "no-image" | "no-logo" | "unvalidated" | "no-configs" | "single-battery";
type SortKey = keyof Pick<VehicleAdminRow, "brand" | "lastUpdated" | "configsCount" | "trimsCount" | "realRangeMixed" | "cheapestPrice">;

const STORAGE_KEY = "evly-admin-v1";

/* ---------------------------------------------------------------- */
/* Confidence helpers                                                */
/* ---------------------------------------------------------------- */

const CONFIDENCE_LABEL: Record<string, string> = {
  bjorn_nyland: "Nyland",
  tested: "Testé",
  manufacturer: "Fab.",
  estimated: "Est.",
  pending: "…",
};
const CONFIDENCE_COLOR: Record<string, string> = {
  bjorn_nyland: "#22c55e",
  tested: "#4ade80",
  manufacturer: "#60a5fa",
  estimated: "#f59e0b",
  pending: "#6b7280",
};

/* ---------------------------------------------------------------- */
/* Small UI atoms                                                    */
/* ---------------------------------------------------------------- */

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 5px", borderRadius: 4, fontSize: 10, fontFamily: "monospace", fontWeight: 600, color, background: bg, whiteSpace: "nowrap", lineHeight: 1.6 }}>
      {children}
    </span>
  );
}

function Dot({ ok, label }: { ok: boolean; label: string }) {
  return <span title={label} style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: ok ? "#22c55e" : "#ef4444", flexShrink: 0 }} />;
}

function SummaryCard({
  value, total, label, ok, tooltip,
}: {
  value: number; total: number; label: string; ok?: boolean; tooltip?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const color = ok === undefined ? "#818cf8" : value === total ? "#22c55e" : "#f59e0b";
  return (
    <div
      style={{ position: "relative", background: "#161616", border: "1px solid #282828", borderRadius: 8, padding: "10px 16px", minWidth: 130, cursor: tooltip ? "default" : undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "monospace", lineHeight: 1 }}>
        {value}<span style={{ fontSize: 12, color: "#555", fontWeight: 400 }}>/{total}</span>
      </div>
      <div style={{ fontSize: 11, color: "#666", marginTop: 3, fontFamily: "monospace" }}>
        {label} · {pct}%
        {tooltip && <span style={{ marginLeft: 5, color: "#444", fontSize: 10 }}>ⓘ</span>}
      </div>

      {/* Tooltip */}
      {tooltip && hovered && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)",
          background: "#1c1c1c", border: "1px solid #333", borderRadius: 7,
          padding: "9px 13px", fontSize: 11, color: "#bbb", whiteSpace: "normal",
          width: 240, zIndex: 200, pointerEvents: "none", lineHeight: 1.6,
          boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        }}>
          {tooltip}
          {/* flèche */}
          <div style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
            borderTop: "6px solid #333",
          }} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* JSON Editor panel                                                 */
/* ---------------------------------------------------------------- */

interface EditorState {
  slug: string;
  json: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saved: boolean;
}

function JsonEditor({
  state,
  onChange,
  onSave,
  onClose,
  vehicle,
}: {
  state: EditorState;
  onChange: (json: string) => void;
  onSave: () => void;
  onClose: () => void;
  vehicle?: VehicleAdminRow;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Format JSON helper */
  const formatJson = () => {
    try {
      const parsed = JSON.parse(state.json);
      onChange(JSON.stringify(parsed, null, 2));
    } catch { /* ignore */ }
  };

  /* Tab key support in textarea */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newVal = state.json.substring(0, start) + "  " + state.json.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      onSave();
    }
  };

  /* Try to parse to show live validation */
  let parseError: string | null = null;
  try { JSON.parse(state.json); } catch (e) { parseError = String(e); }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d0d0d", borderLeft: "1px solid #222" }}>
      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          ✏ {vehicle ? `${vehicle.brand} ${vehicle.model}` : state.slug}
        </span>
        <a
          href={`/vehicules/${state.slug}`}
          target="_blank"
          rel="noopener"
          style={{ fontSize: 10, color: "#444", textDecoration: "none", flexShrink: 0 }}
        >
          ↗ voir la fiche
        </a>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 4px", flexShrink: 0 }}
          title="Fermer (Échap)"
        >
          ×
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ padding: "6px 12px", borderBottom: "1px solid #1a1a1a", display: "flex", gap: 6, alignItems: "center", flexShrink: 0, background: "#0a0a0a" }}>
        <button
          onClick={formatJson}
          disabled={state.loading || !!parseError}
          style={{ padding: "3px 10px", borderRadius: 4, border: "1px solid #282828", background: "transparent", color: "#666", fontSize: 11, fontFamily: "monospace", cursor: parseError ? "not-allowed" : "pointer" }}
        >
          Formater JSON
        </button>
        <span style={{ flex: 1 }} />
        {parseError && (
          <span style={{ fontSize: 10, color: "#ef4444", fontFamily: "monospace", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            ✗ {parseError}
          </span>
        )}
        {!parseError && !state.loading && (
          <span style={{ fontSize: 10, color: "#22c55e", fontFamily: "monospace" }}>✓ JSON valide</span>
        )}
      </div>

      {/* Textarea */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {state.loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#444", fontFamily: "monospace", fontSize: 13 }}>
            Chargement…
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={state.json}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            style={{
              width: "100%",
              height: "100%",
              resize: "none",
              background: "#080808",
              color: "#d4d4d4",
              border: "none",
              outline: "none",
              fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
              fontSize: 12,
              lineHeight: 1.6,
              padding: "12px 16px",
              boxSizing: "border-box",
              overflowY: "auto",
              whiteSpace: "pre",
              overflowWrap: "normal",
              tabSize: 2,
            }}
          />
        )}
      </div>

      {/* Footer / Save */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid #1e1e1e", display: "flex", gap: 8, alignItems: "center", flexShrink: 0, background: "#0d0d0d" }}>
        {state.error && (
          <span style={{ flex: 1, fontSize: 11, color: "#ef4444", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            ✗ {state.error}
          </span>
        )}
        {state.saved && !state.error && (
          <span style={{ flex: 1, fontSize: 11, color: "#22c55e", fontFamily: "monospace" }}>
            ✓ Sauvegardé — Astro recharge en cours…
          </span>
        )}
        {!state.error && !state.saved && <span style={{ flex: 1 }} />}
        <span style={{ fontSize: 10, color: "#333", fontFamily: "monospace" }}>Ctrl+S pour sauvegarder · Échap pour fermer</span>
        <button
          onClick={onClose}
          style={{ padding: "5px 14px", borderRadius: 5, border: "1px solid #282828", background: "transparent", color: "#555", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}
        >
          Annuler
        </button>
        <button
          onClick={onSave}
          disabled={state.saving || state.loading || !!parseError}
          style={{
            padding: "5px 16px",
            borderRadius: 5,
            border: "1px solid",
            borderColor: parseError ? "#422" : "#4f46e5",
            background: parseError ? "#1a0f0f" : state.saving ? "#2e2b6e" : "#3730a3",
            color: parseError ? "#555" : "#c7d2fe",
            fontSize: 12,
            fontFamily: "monospace",
            fontWeight: 600,
            cursor: parseError || state.saving ? "not-allowed" : "pointer",
          }}
        >
          {state.saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Main panel                                                        */
/* ---------------------------------------------------------------- */

export default function AdminPanel({ vehicles }: { vehicles: VehicleAdminRow[] }) {
  const [validation, setValidation] = useState<ValidationState>({});
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("brand");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  /* Editor state */
  const [editor, setEditor] = useState<EditorState | null>(null);

  /* localStorage hydration */
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setValidation(JSON.parse(raw));
    } catch {}
  }, []);

  /* Open editor: fetch JSON from dev API */
  const openEditor = useCallback(async (slug: string) => {
    setEditor({ slug, json: "", loading: true, saving: false, error: null, saved: false });
    try {
      const res = await fetch(`/api/admin/vehicle/${slug}`);
      if (!res.ok) throw new Error(await res.text());
      const text = await res.text();
      // Format the JSON nicely
      const formatted = JSON.stringify(JSON.parse(text), null, 2);
      setEditor((prev) => prev ? { ...prev, json: formatted, loading: false } : null);
    } catch (e) {
      setEditor((prev) => prev ? { ...prev, loading: false, error: `Impossible de charger la fiche : ${String(e)}. Êtes-vous en mode dev (astro dev) ?` } : null);
    }
  }, []);

  /* Save editor content */
  const saveEditor = useCallback(async () => {
    if (!editor) return;
    setEditor((prev) => prev ? { ...prev, saving: true, error: null, saved: false } : null);
    try {
      const res = await fetch(`/api/admin/vehicle/${editor.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: editor.json,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setEditor((prev) => prev ? { ...prev, saving: false, saved: true } : null);
    } catch (e) {
      setEditor((prev) => prev ? { ...prev, saving: false, error: String(e) } : null);
    }
  }, [editor]);

  const toggleStats = useCallback((slug: string) => {
    setValidation((prev) => {
      const next = { ...prev, [slug]: { statsOk: !prev[slug]?.statsOk } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /* Derived counts */
  const total = vehicles.length;
  const imagesOk = vehicles.filter((v) => v.hasImage).length;
  const logosOk = vehicles.filter((v) => v.hasLogo).length;
  const statsValidated = mounted ? vehicles.filter((v) => validation[v.slug]?.statsOk).length : 0;
  const configsComplete = vehicles.filter((v) => v.configsCount >= 2).length;
  const multiBattery = vehicles.filter((v) => v.hasBothBatteries).length;

  /* Filter */
  const afterFilter = vehicles.filter((v) => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.slug.includes(q) || v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q);
    if (!matchSearch) return false;
    switch (filter) {
      case "no-image": return !v.hasImage;
      case "no-logo": return !v.hasLogo;
      case "unvalidated": return mounted ? !validation[v.slug]?.statsOk : true;
      case "no-configs": return v.configsCount === 0;
      case "single-battery": return !v.hasBothBatteries && v.configsCount > 0;
      default: return true;
    }
  });

  /* Sort */
  const sorted = [...afterFilter].sort((a, b) => {
    let av: string | number, bv: string | number;
    switch (sortKey) {
      case "brand": av = `${a.brand} ${a.model}`; bv = `${b.brand} ${b.model}`; break;
      case "lastUpdated": av = a.lastUpdated; bv = b.lastUpdated; break;
      case "configsCount": av = a.configsCount; bv = b.configsCount; break;
      case "trimsCount": av = a.trimsCount; bv = b.trimsCount; break;
      case "realRangeMixed": av = a.realRangeMixed; bv = b.realRangeMixed; break;
      case "cheapestPrice": av = a.cheapestPrice; bv = b.cheapestPrice; break;
      default: av = ""; bv = "";
    }
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const thStyle = (key?: SortKey): React.CSSProperties => ({
    padding: "6px 8px", textAlign: "left", fontSize: 10, fontWeight: 600,
    color: key && sortKey === key ? "#818cf8" : "#555", fontFamily: "monospace",
    textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #222",
    whiteSpace: "nowrap", cursor: key ? "pointer" : "default", userSelect: "none",
    background: "#111", position: "sticky", top: 0, zIndex: 2,
  });

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: `Tous (${total})` },
    { key: "no-image", label: `Sans image (${total - imagesOk})` },
    { key: "no-logo", label: `Sans logo (${total - logosOk})` },
    { key: "unvalidated", label: `Non validés (${mounted ? total - statsValidated : "?"})` },
    { key: "no-configs", label: `0 configs (${vehicles.filter((v) => v.configsCount === 0).length})` },
    { key: "single-battery", label: `1 batterie (${vehicles.filter((v) => !v.hasBothBatteries && v.configsCount > 0).length})` },
  ];

  const editingVehicle = editor ? vehicles.find((v) => v.slug === editor.slug) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0a0a", color: "#e5e5e5", fontFamily: "monospace", overflow: "hidden" }}>

      {/* ── Top bar ── */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid #1e1e1e", background: "#0d0d0d", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#818cf8" }}>⚙ EVLY ADMIN</span>
        <span style={{ fontSize: 10, color: "#333" }}>localhost uniquement · {total} véhicules</span>
        <div style={{ flex: 1 }} />
        <input
          type="search" placeholder="Rechercher…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: "#161616", border: "1px solid #282828", borderRadius: 6, padding: "4px 10px", color: "#e5e5e5", fontSize: 12, fontFamily: "monospace", outline: "none", width: 180 }}
        />
        <a href="/vehicules" style={{ fontSize: 11, color: "#444", textDecoration: "none" }}>→ Site</a>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap", alignItems: "center" }}>
        <SummaryCard value={imagesOk} total={total} label="Images" ok={imagesOk === total}
          tooltip="Photo présente dans src/assets/vehicles/{slug}.{ext}. Sans image, la fiche affiche un placeholder gris sur le site." />
        <SummaryCard value={logosOk} total={total} label="Logos" ok={logosOk === total}
          tooltip="Logo SVG présent dans src/assets/logos/{brand}.svg. Sans logo, le nom de la marque s'affiche en texte sur la fiche." />
        <SummaryCard value={mounted ? statsValidated : 0} total={total} label="Stats validées"
          tooltip="Véhicules dont tu as manuellement coché STAT ✓ après vérification des données. Persiste dans le localStorage — ne se réinitialise pas au rechargement." />
        <SummaryCard value={configsComplete} total={total} label="≥2 configs"
          tooltip="Véhicules ayant au moins 2 entrées dans configurations[]. En dessous de 2, le sélecteur de config n'apparaît pas sur la fiche véhicule." />
        <SummaryCard value={multiBattery} total={total} label="2 batteries"
          tooltip="Véhicules avec à la fois une config 'standard' ET une config 'long-range'. Permet d'afficher les onglets Standard / Long Range dans le comparateur." />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "#333" }}>{sorted.length}/{total} affichés</span>
      </div>

      {/* ── Filters ── */}
      <div style={{ padding: "8px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: "3px 10px", borderRadius: 20, border: "1px solid", borderColor: filter === f.key ? "#6366f1" : "#282828", background: filter === f.key ? "#1e1b4b" : "transparent", color: filter === f.key ? "#a5b4fc" : "#555", fontSize: 11, fontFamily: "monospace", cursor: "pointer" }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Content : table + editor side-by-side ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Table */}
        <div style={{ flex: editor ? "0 0 55%" : "1 1 100%", overflow: "auto", transition: "flex 0.2s" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 32 }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: 36 }} />
              <col style={{ width: 36 }} />
              <col style={{ width: 44 }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: 44 }} />
              <col style={{ width: 44 }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle()}>#</th>
                <th style={thStyle("brand")} onClick={() => handleSort("brand")}>Véhicule {sortKey === "brand" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                <th style={{ ...thStyle(), textAlign: "center" }}>IMG</th>
                <th style={{ ...thStyle(), textAlign: "center" }}>LOGO</th>
                <th style={{ ...thStyle(), textAlign: "center" }}>STAT ✓</th>
                <th style={thStyle()}>Batteries · Configs</th>
                <th style={{ ...thStyle("configsCount"), textAlign: "center" }} onClick={() => handleSort("configsCount")}>CFG {sortKey === "configsCount" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                <th style={{ ...thStyle("trimsCount"), textAlign: "center" }} onClick={() => handleSort("trimsCount")}>FIN {sortKey === "trimsCount" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                <th style={thStyle("cheapestPrice")} onClick={() => handleSort("cheapestPrice")}>Prix {sortKey === "cheapestPrice" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                <th style={thStyle("realRangeMixed")} onClick={() => handleSort("realRangeMixed")}>Réel mix. {sortKey === "realRangeMixed" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                <th style={thStyle()}>A130</th>
                <th style={thStyle()}>Sources</th>
                <th style={thStyle("lastUpdated")} onClick={() => handleSort("lastUpdated")}>MàJ {sortKey === "lastUpdated" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((v, i) => {
                const isValidated = mounted ? !!validation[v.slug]?.statsOk : false;
                const isEditing = editor?.slug === v.slug;
                const hasIssue = !v.hasImage || !v.hasLogo || v.configsCount === 0;
                const rowBg = isEditing ? "#1e1b4b" : i % 2 === 0 ? "#0d0d0d" : "#0a0a0a";

                return (
                  <tr key={v.slug} style={{ background: rowBg, borderLeft: hasIssue ? "2px solid #422" : isValidated ? "2px solid #14532d" : "2px solid transparent" }}>
                    <td style={{ padding: "5px 8px", color: "#444", fontSize: 10, borderBottom: "1px solid #181818", textAlign: "right" }}>{i + 1}</td>

                    {/* Véhicule — cliquable pour ouvrir l'éditeur */}
                    <td style={{ padding: "5px 8px", borderBottom: "1px solid #181818", overflow: "hidden" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <button
                          onClick={() => isEditing ? setEditor(null) : openEditor(v.slug)}
                          style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: isEditing ? "#a5b4fc" : "#d4d4d4", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "monospace" }}
                          title={isEditing ? "Fermer l'éditeur" : `Éditer ${v.slug}.json`}
                        >
                          {isEditing ? "▶ " : ""}{v.brand} {v.model}
                        </button>
                        <span style={{ color: "#333", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {v.slug}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: "5px 4px", borderBottom: "1px solid #181818", textAlign: "center" }}>
                      <Dot ok={v.hasImage} label={v.hasImage ? "Image présente" : "Image manquante"} />
                    </td>
                    <td style={{ padding: "5px 4px", borderBottom: "1px solid #181818", textAlign: "center" }}>
                      <Dot ok={v.hasLogo} label={v.hasLogo ? "Logo présent" : "Logo manquant"} />
                    </td>

                    <td style={{ padding: "5px 4px", borderBottom: "1px solid #181818", textAlign: "center" }}>
                      <button
                        onClick={() => toggleStats(v.slug)}
                        title={isValidated ? "Stats vérifiées — cliquer pour annuler" : "Marquer stats comme vérifiées"}
                        style={{ width: 18, height: 18, borderRadius: 4, border: "1px solid", borderColor: isValidated ? "#166534" : "#333", background: isValidated ? "#14532d" : "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: isValidated ? "#4ade80" : "#444" }}
                      >
                        {isValidated ? "✓" : ""}
                      </button>
                    </td>

                    <td style={{ padding: "5px 8px", borderBottom: "1px solid #181818", overflow: "hidden" }}>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {v.batteryLabels.length === 0
                          ? <Badge color="#ef4444" bg="#2d1111">aucune</Badge>
                          : v.batteryLabels.map((bl) => (
                            <Badge key={bl} color={bl.startsWith("lr") ? "#a5b4fc" : "#6ee7b7"} bg={bl.startsWith("lr") ? "#1e1b4b" : "#064e3b"}>{bl}</Badge>
                          ))}
                      </div>
                    </td>

                    <td style={{ padding: "5px 4px", borderBottom: "1px solid #181818", textAlign: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: v.configsCount === 0 ? "#ef4444" : v.configsCount === 1 ? "#f59e0b" : "#22c55e" }}>{v.configsCount}</span>
                    </td>
                    <td style={{ padding: "5px 4px", borderBottom: "1px solid #181818", textAlign: "center", color: "#888" }}>{v.trimsCount}</td>

                    <td style={{ padding: "5px 8px", borderBottom: "1px solid #181818", color: "#888", fontSize: 11, whiteSpace: "nowrap" }}>
                      {v.cheapestPrice ? `${(v.cheapestPrice / 1000).toFixed(1).replace(".", ",")}k€` : "—"}
                    </td>

                    <td style={{ padding: "5px 8px", borderBottom: "1px solid #181818", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "#d4d4d4", fontWeight: 600, fontSize: 12 }}>{v.realRangeMixed}</span>
                        <span style={{ color: "#444", fontSize: 10 }}>km</span>
                        <span style={{ fontSize: 9, color: CONFIDENCE_COLOR[v.realRangeConfidence] ?? "#6b7280" }}>{CONFIDENCE_LABEL[v.realRangeConfidence] ?? v.realRangeConfidence}</span>
                        {v.hasRangeTests && <span title="Tests terrain" style={{ fontSize: 9, color: "#22c55e" }}>🧪</span>}
                      </div>
                    </td>

                    <td style={{ padding: "5px 8px", borderBottom: "1px solid #181818", color: "#666", fontSize: 11, whiteSpace: "nowrap" }}>{v.realRangeHighway} km</td>

                    <td style={{ padding: "5px 8px", borderBottom: "1px solid #181818", overflow: "hidden" }}>
                      <span title={v.sources.join(", ")} style={{ fontSize: 10, color: "#555", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {v.sourcesCount}× {v.sources.join(", ")}
                      </span>
                    </td>

                    <td style={{ padding: "5px 8px", borderBottom: "1px solid #181818", color: "#555", fontSize: 10, whiteSpace: "nowrap" }}>{v.lastUpdated}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "#444", fontSize: 13 }}>Aucun véhicule ne correspond.</div>
          )}
        </div>

        {/* Editor panel */}
        {editor && (
          <div style={{ flex: "0 0 45%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <JsonEditor
              state={editor}
              vehicle={editingVehicle}
              onChange={(json) => setEditor((prev) => prev ? { ...prev, json, error: null, saved: false } : null)}
              onSave={saveEditor}
              onClose={() => setEditor(null)}
            />
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{ padding: "5px 20px", borderTop: "1px solid #1a1a1a", background: "#0d0d0d", display: "flex", gap: 20, flexShrink: 0, fontSize: 10, color: "#444", fontFamily: "monospace" }}>
        <span>{imagesOk}/{total} images · {logosOk}/{total} logos · {mounted ? statsValidated : "?"}/{total} validés · {configsComplete}/{total} ≥2cfg · {multiBattery}/{total} 2 batteries</span>
        <span style={{ flex: 1 }} />
        {editor && <span style={{ color: "#6366f1" }}>✏ édition de {editor.slug}.json</span>}
        <span>evly-admin · {new Date().toLocaleDateString("fr-FR")}</span>
      </div>
    </div>
  );
}
