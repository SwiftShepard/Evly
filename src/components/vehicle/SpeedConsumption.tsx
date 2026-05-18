import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import type { RangeTest } from "@/data/schemas";
import { useThemeColors } from "@/lib/useThemeColors";

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

interface Props {
  tests: RangeTest[];
  vehicleName: string;
  sourceLabels: Record<string, string>;
}

const VARS = [
  "--color-text",
  "--color-text-muted",
  "--color-text-faint",
  "--color-border",
  "--color-bg-subtle",
  "--color-accent",
  "--color-warning",
  "--color-danger",
] as const;

export default function SpeedConsumption({
  tests,
  vehicleName,
  sourceLabels,
}: Props) {
  const c = useThemeColors(VARS);

  const colorForProtocol = (protocol: RangeTest["protocol"]): string => {
    switch (protocol) {
      case "nyland":
        return c["--color-accent"] || "#b8ff3d";
      case "tested-other":
        return c["--color-warning"] || "#ffb84d";
      case "wltp":
      case "epa":
        return c["--color-text-muted"] || "#9b9b95";
      case "manufacturer":
      default:
        return c["--color-text-faint"] || "#5c5c58";
    }
  };

  const plotted = tests.filter(
    (t): t is RangeTest & { speed_kmh: number } => t.speed_kmh !== null
  );

  const groups = new Map<string, (RangeTest & { speed_kmh: number })[]>();
  for (const test of plotted) {
    const arr = groups.get(test.sourceId) ?? [];
    arr.push(test);
    groups.set(test.sourceId, arr);
  }

  const datasets = Array.from(groups.entries()).map(([sourceId, points]) => {
    const color = colorForProtocol(points[0]?.protocol ?? "tested-other");
    return {
      label: sourceLabels[sourceId] ?? sourceId,
      data: points.map((p) => ({
        x: p.speed_kmh,
        y: p.consumption_kWh_100km,
      })),
      backgroundColor: color,
      borderColor: color,
      borderWidth: 0,
      pointRadius: 7,
      pointHoverRadius: 10,
    };
  });

  const allSpeeds = plotted.map((t) => t.speed_kmh);
  const allConsos = plotted.map((t) => t.consumption_kWh_100km);
  const xMax = Math.ceil(Math.max(140, ...allSpeeds, 1) / 10) * 10 + 10;
  const yMax = Math.ceil(Math.max(25, ...allConsos, 1) / 5) * 5 + 2;

  const options: ChartOptions<"scatter"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        align: "start" as const,
        labels: {
          color: c["--color-text-muted"] || "#9b9b95",
          font: {
            family: "JetBrains Mono Variable",
            size: 11,
          },
          boxWidth: 10,
          boxHeight: 10,
          padding: 14,
          usePointStyle: false,
        },
      },
      tooltip: {
        backgroundColor: c["--color-bg-subtle"] || "#1c1c20",
        borderColor: c["--color-border"] || "#2a2a30",
        borderWidth: 1,
        titleColor: c["--color-text"] || "#f5f5f0",
        bodyColor: c["--color-text-muted"] || "#9b9b95",
        padding: 12,
        displayColors: false,
        titleFont: { family: "JetBrains Mono Variable", size: 11, weight: 500 },
        bodyFont: { family: "JetBrains Mono Variable", size: 12 },
        callbacks: {
          title: (items) => (items[0] ? `${items[0].parsed.x} km/h` : ""),
          label: (ctx) =>
            `${ctx.dataset.label}, ${ctx.parsed.y} kWh/100 km`,
        },
      },
    },
    scales: {
      x: {
        type: "linear" as const,
        min: 50,
        max: xMax,
        grid: { color: c["--color-border"] || "#2a2a30", drawTicks: false },
        border: { color: c["--color-border"] || "#2a2a30" },
        title: {
          display: true,
          text: "Vitesse stabilisée (km/h)",
          color: c["--color-text-faint"] || "#5c5c58",
          font: { family: "JetBrains Mono Variable", size: 10 },
        },
        ticks: {
          color: c["--color-text-faint"] || "#5c5c58",
          font: { family: "JetBrains Mono Variable", size: 10 },
          stepSize: 20,
          callback: (val) => `${val}`,
        },
      },
      y: {
        type: "linear" as const,
        min: 10,
        max: yMax,
        grid: { color: c["--color-border"] || "#2a2a30", drawTicks: false },
        border: { color: c["--color-border"] || "#2a2a30" },
        title: {
          display: true,
          text: "Consommation (kWh / 100 km)",
          color: c["--color-text-faint"] || "#5c5c58",
          font: { family: "JetBrains Mono Variable", size: 10 },
        },
        ticks: {
          color: c["--color-text-faint"] || "#5c5c58",
          font: { family: "JetBrains Mono Variable", size: 10 },
          stepSize: 5,
        },
      },
    },
  };

  if (datasets.length === 0) {
    return (
      <div className="h-72 w-full flex items-center justify-center">
        <p className="font-mono text-sm text-[var(--color-text-faint)]">
          Aucun test à vitesse stabilisée disponible pour ce modèle.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative h-72 md:h-80 lg:h-96 w-full"
      role="img"
      aria-label={`Consommation du ${vehicleName} en fonction de la vitesse, agrégée depuis ${datasets.length} source(s). Légende cliquable pour filtrer.`}
    >
      <Scatter data={{ datasets }} options={options} />
    </div>
  );
}
