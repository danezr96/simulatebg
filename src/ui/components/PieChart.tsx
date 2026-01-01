import { cn } from "../../utils/format";

export type PieDatum = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  data: PieDatum[];
  size?: number;
  innerRadius?: number;
  className?: string;
};

function toRadians(deg: number) {
  return (Math.PI / 180) * deg;
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = toRadians(startAngle);
  const end = toRadians(endAngle);

  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function ringPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
) {
  const start = toRadians(startAngle);
  const end = toRadians(endAngle);

  const x1 = cx + rOuter * Math.cos(start);
  const y1 = cy + rOuter * Math.sin(start);
  const x2 = cx + rOuter * Math.cos(end);
  const y2 = cy + rOuter * Math.sin(end);

  const x3 = cx + rInner * Math.cos(end);
  const y3 = cy + rInner * Math.sin(end);
  const x4 = cx + rInner * Math.cos(start);
  const y4 = cy + rInner * Math.sin(start);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

export function PieChart({ data, size = 160, innerRadius = 42, className }: Props) {
  const safe = data.filter((d) => Number.isFinite(d.value) && d.value > 0);
  const total = safe.reduce((sum, d) => sum + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2;

  let currentAngle = -90;
  const slices = safe.map((d, idx) => {
    const portion = total > 0 ? (d.value / total) * 360 : 0;
    const start = currentAngle;
    const end = currentAngle + portion;
    currentAngle = end;
    return {
      ...d,
      path: innerRadius > 0
        ? ringPath(cx, cy, radius, innerRadius, start, end)
        : arcPath(cx, cy, radius, start, end),
      key: `${d.label}-${idx}`,
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("h-40 w-40", className)}
      role="img"
    >
      {total <= 0 ? (
        <circle cx={cx} cy={cy} r={radius} fill="var(--card-2)" stroke="var(--border)" />
      ) : (
        slices.map((slice) => (
          <path
            key={slice.key}
            d={slice.path}
            fill={slice.color ?? "var(--accent)"}
            stroke="var(--bg)"
            strokeWidth="1"
          />
        ))
      )}
    </svg>
  );
}

export default PieChart;
