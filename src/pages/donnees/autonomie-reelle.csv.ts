import type { APIRoute } from "astro";
import { DATA_FIELDS, getOpenDataRecords } from "@/lib/observatory";

/**
 * Données ouvertes de l'observatoire (CC BY 4.0), une ligne par version : format qui s'ouvre
 * tel quel dans un tableur français (point-virgule, virgule décimale, UTF-8 avec BOM).
 * La même chose en JSON : /donnees/autonomie-reelle.json.
 */
const cell = (v: string | number | null) => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "number" ? String(v).replace(".", ",") : v;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const GET: APIRoute = ({ site }) => {
  const keys = DATA_FIELDS.map((f) => f.key);
  const lines = [keys.join(";"), ...getOpenDataRecords(site).map((r) => keys.map((k) => cell(r[k] ?? null)).join(";"))];
  return new Response("﻿" + lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8" } });
};
