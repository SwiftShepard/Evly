import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { useThemeColors } from "@/lib/useThemeColors";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface Props {
  urban: number;
  mixed: number;
  highway: number;
  winter: number;
  vehicleName: string;
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

export default function SeasonalRange({
  urban,
  mixed,
  highway,
  winter,
  vehicleName,
}: Props) {
  const [soh, setSoh] = useState(100);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.soh === "number") {
        setSoh(detail.soh);
      }
    };
    window.addEventListener("soh-changed", handler);
    return () => window.removeEventListener("soh-changed", handler);
  }, []);

  const c = useThemeColors(VARS);
  const labels = ["Urbain", "Mixte", "Hiver -5 °C", "Autoroute 130"];
  const scaledUrban = Math.round(urban * soh / 100);
  const scaledMixed = Math.round(mixed * soh / 100);
  const scaledWinter = Math.round(winter * soh / 100);
  const scaledHighway = Math.round(highway * soh / 100);
  const data = [scaledUrban, scaledMixed, scaledWinter, scaledHighway];
  const colors = [
    c["--color-accent"] || "#b8ff3d",
    c["--color-text-muted"] || "#9b9b95",
    c["--color-warning"] || "#ffb84d",
    c["--color-danger"] || "#ff5c42",
  ];
  const max = Math.ceil(Math.max(...data) / 50) * 50 + 50;

  const chartData = {
    labels,
    datasets: [
      {
        label: "Autonomie",
        data,
        backgroundColor: colors,
        borderWidth: 0,
        borderRadius: 0,
        barThickness: 32,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
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
        titleFont: { family: "JetBrains Mono Variable", size: 11, weight: 500 },
        bodyFont: { family: "JetBrains Mono Variable", size: 12 },
        callbacks: {
          label: (ctx) => `${ctx.parsed.x} km`,
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max,
        grid: { color: c["--color-border"] || "#2a2a30", drawTicks: false },
        border: { display: false },
        ticks: {
          color: c["--color-text-faint"] || "#5c5c58",
          font: { family: "JetBrains Mono Variable", size: 10 },
          stepSize: max > 500 ? 150 : 100,
          callback: (val) => `${val} km`,
        },
      },
      y: {
        grid: { display: false },
        border: { color: c["--color-border"] || "#2a2a30" },
        ticks: {
          color: c["--color-text"] || "#f5f5f0",
          font: { family: "JetBrains Mono Variable", size: 11 },
        },
      },
    },
  };

  return (
    <div
      className="relative h-56 sm:h-64 md:h-72 w-full"
      role="img"
      aria-label={`Autonomie réelle du ${vehicleName} par usage : urbain ${scaledUrban} km, mixte ${scaledMixed} km, hiver -5°C ${scaledWinter} km, autoroute 130 km/h ${scaledHighway} km.`}
    >
      <Bar data={chartData} options={options} />
    </div>
  );
}
