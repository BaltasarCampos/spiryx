import type { TrendDirection, TrendSnapshot } from "../../types/activity";

interface TrendIndicatorProps {
  trend: TrendSnapshot | null;
}

// Direction is carried by the text label and sentence; the symbol
// is a decorative duplicate, and color is never the only signal.
const DIRECTION_META: Record<
  TrendDirection,
  { symbol: string; label: string; verb: string; className: string }
> = {
  worsening: { symbol: "▲", label: "Worsening", verb: "up", className: "text-rose-700" },
  improving: { symbol: "▼", label: "Improving", verb: "down", className: "text-emerald-700" },
  stable: { symbol: "→", label: "Stable", verb: "changed", className: "text-slate-600" },
};

function formatPercent(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

export function TrendIndicator({ trend }: TrendIndicatorProps) {
  if (!trend) {
    return null;
  }

  const meta = DIRECTION_META[trend.direction];
  const percent = formatPercent(Math.abs(trend.percentChange));

  return (
    <p
      role="status"
      aria-live="polite"
      className={`flex items-center gap-1.5 text-sm ${meta.className}`}
    >
      <span aria-hidden="true">{meta.symbol}</span>
      <span className="font-semibold">{meta.label}</span>
      <span>
        — AQI {meta.verb} {percent}% from the previous reading.
      </span>
    </p>
  );
}
