/**
 * Formatters FR, chiffres, prix, distances, énergie, durées.
 * Tous renvoient des chaînes prêtes à afficher (espaces insécables compris).
 */

const NBSP = " "; // espace fine insécable, pour les séparateurs FR

const numberFmt = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const numberFmt1 = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const numberFmt2 = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return eurFmt.format(value);
}

export function formatNumber(value: number, decimals: 0 | 1 | 2 = 0): string {
  if (decimals === 1) return numberFmt1.format(value);
  if (decimals === 2) return numberFmt2.format(value);
  return numberFmt.format(value);
}

export function formatKm(value: number): string {
  return `${numberFmt.format(value)}${NBSP}km`;
}

export function formatKwh(value: number, decimals: 0 | 1 | 2 = 1): string {
  return `${formatNumber(value, decimals)}${NBSP}kWh`;
}

export function formatKwhPer100(value: number): string {
  return `${formatNumber(value, 1)}${NBSP}kWh/100${NBSP}km`;
}

export function formatKw(value: number): string {
  return `${numberFmt.format(value)}${NBSP}kW`;
}

export function formatHp(value: number): string {
  return `${numberFmt.format(value)}${NBSP}ch`;
}

export function formatNm(value: number): string {
  return `${numberFmt.format(value)}${NBSP}Nm`;
}

export function formatSeconds(value: number): string {
  return `${numberFmt1.format(value)}${NBSP}s`;
}

export function formatMinutes(value: number): string {
  return `${numberFmt.format(value)}${NBSP}min`;
}

export function formatHours(value: number): string {
  // 5.33 -> "5h20"
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 0) return `${hours}${NBSP}h`;
  return `${hours}${NBSP}h${minutes.toString().padStart(2, "0")}`;
}

export function formatMm(value: number): string {
  return `${numberFmt.format(value)}${NBSP}mm`;
}

export function formatLiters(value: number): string {
  return `${numberFmt.format(value)}${NBSP}L`;
}

export function formatPercent(value: number): string {
  return `${numberFmt.format(value)}${NBSP}%`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatVoltage(value: number): string {
  return `${numberFmt.format(value)}${NBSP}V`;
}
