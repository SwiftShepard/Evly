import { useRef, useEffect, memo } from "react";

interface Point {
  soc: number;
  power: number;
}

interface Props {
  curve: Point[];
  width?: number;
  height?: number;
}

/**
 * Sparkline de la courbe de charge DC, Canvas pur, pas de Chart.js.
 * Léger et instantané.
 */
function ChargingSparklineInner({ curve, width = 200, height = 40 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || curve.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // HiDPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const maxPower = Math.max(...curve.map((p) => p.power));
    const pad = 2;

    ctx.clearRect(0, 0, width, height);

    // Fill
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--color-accent").trim() || "#b8ff3d";

    ctx.beginPath();
    curve.forEach((p, i) => {
      const x = pad + ((width - 2 * pad) * p.soc) / 100;
      const y = height - pad - ((height - 2 * pad) * p.power) / maxPower;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    // Close the fill area
    ctx.lineTo(pad + width - 2 * pad, height - pad);
    ctx.lineTo(pad, height - pad);
    ctx.closePath();

    // Parse accent color and create transparent version
    ctx.fillStyle = accent.startsWith("#")
      ? accent + "18"
      : accent.replace(")", ", 0.09)").replace("rgb", "rgba");
    ctx.fill();

    // Stroke
    ctx.beginPath();
    curve.forEach((p, i) => {
      const x = pad + ((width - 2 * pad) * p.soc) / 100;
      const y = height - pad - ((height - 2 * pad) * p.power) / maxPower;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();
  }, [curve, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-label={`Courbe de charge DC, pic à ${Math.max(...curve.map((p) => p.power))} kW`}
      role="img"
    />
  );
}

const ChargingSparkline = memo(ChargingSparklineInner);
export default ChargingSparkline;
