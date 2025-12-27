// src/ui/components/Sparkline.tsx
import * as React from "react";
import { cn } from "../../utils/format";

export type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
};

function buildPoints(data: number[], width: number, height: number) {
  const values = data.map((v) => (Number.isFinite(v) ? v : 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, idx) => {
      const x = (idx / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function Sparkline({
  data,
  width = 160,
  height = 48,
  stroke = "var(--accent)",
  className,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cn("h-10 w-full", className)}
        preserveAspectRatio="none"
      >
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }

  const points = buildPoints(data, width, height);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-10 w-full", className)}
      preserveAspectRatio="none"
    >
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
    </svg>
  );
}

export default Sparkline;
