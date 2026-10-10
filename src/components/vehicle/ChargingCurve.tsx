import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import type { ChargingCurvePoint } from "@/data/schemas";
import { useThemeColors } from "@/lib/useThemeColors";

ChartJS.register(
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
);

interface Props {
  curve: ChargingCurvePoint[];
  peakPower_kW: number;
  vehicleName: string;
}

const VARS = [
  "--color-text-muted",
  "--color-text-faint",
  "--color-text",
  "--color-border",
  "--color-bg-subtle",
  "--color-bg",
  "--color-accent",
] as const;

export default function ChargingCurve({
  curve,
  peakPower_kW,
  vehicleName,
}: Props) {
  const c = useThemeColors(VARS);
  const labels = curve.map((p) => `${p.soc}%`);
  const data = curve.map((p) => p.power);
  const yMax = Math.ceil(Math.max(peakPower_kW, ...data) / 20) * 20 + 10;

  const accent = c["--color-accent"] || "#b8ff3d";
  const accentDim = accent
    ? `color-mix(in srgb, ${accent} 12%, transparent)`
    : "rgba(184, 255, 61, 0.12)";

  const chartData = {
    labels,
    datasets: [
      {
        label: "Puissance de charge",
        data,
        borderColor: accent,
        backgroundColor: accentDim,
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: accent,
        pointHoverBorderColor: c["--color-bg"] || "#0a0a0b",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: c["--color-bg-subtle"] || "#1c1c20",
        borderColor: c["--color-border"] || "#2a2a30",
        borderWidth: 1,
        titleColor: c["--color-text"] || "#f5f5f0",
        bodyColor: c["--color-text-muted"] || "#9b9b95",
        padding: 12,
        displayColors: false,
        titleFont: { family: "Geist Mono Variable", size: 11, weight: 500 },
        bodyFont: { family: "Geist Mono Variable", size: 12 },
        callbacks: {
          title: (items) => `SoC ${items[0]?.label ?? ""}`,
          label: (ctx) => `${ctx.parsed.y} kW`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: c["--color-border"] || "#2a2a30", display: false },
        border: { color: c["--color-border"] || "#2a2a30" },
        ticks: {
          color: c["--color-text-faint"] || "#5c5c58",
          font: { family: "Geist Mono Variable", size: 10 },
          autoSkipPadding: 14,
        },
      },
      y: {
        min: 0,
        max: yMax,
        grid: { color: c["--color-border"] || "#2a2a30", drawTicks: false },
        border: { display: false },
        ticks: {
          color: c["--color-text-faint"] || "#5c5c58",
          font: { family: "Geist Mono Variable", size: 10 },
          callback: (val) => `${val} kW`,
          stepSize: yMax > 100 ? 30 : 20,
        },
      },
    },
  };

  // Texte alternatif tiré des données réelles de la courbe (pas d'allure supposée)
  const peakPoint = curve.length
    ? curve.reduce((best, p) => (p.power > best.power ? p : best))
    : null;
  const at80 = curve.find((p) => p.soc >= 80);
  const ariaLabel = peakPoint
    ? `Courbe de charge rapide du ${vehicleName} selon le niveau de batterie : ` +
      `pic à ${peakPoint.power} kW vers ${peakPoint.soc} %` +
      (at80 ? `, ${at80.power} kW à ${at80.soc} %.` : ".")
    : `Courbe de charge rapide du ${vehicleName} : puissance maximale annoncée ${peakPower_kW} kW.`;

  return (
    <div
      className="relative h-60 sm:h-72 md:h-80 w-full"
      role="img"
      aria-label={ariaLabel}
    >
      <Line data={chartData} options={options} aria-hidden="true" />
    </div>
  );
}
