import type { AirQualitySnapshot } from "../../types/airQuality";

interface AQISummaryCardProps {
  isRefreshing?: boolean;
  locationName: string | null;
  onRefresh: () => void;
  snapshot: AirQualitySnapshot;
}

// Full class names must be literals so Tailwind's content scan includes them.
const FRESHNESS_BADGE: Record<string, string> = {
  fresh: "bg-emerald-100 text-emerald-800",
  stale: "bg-amber-100 text-amber-800",
  expired: "bg-rose-100 text-rose-800",
};

const FRESHNESS_LABEL: Record<string, string> = {
  fresh: "Live",
  stale: "Stale data",
  expired: "Data unavailable",
};

const CATEGORY_RING: Record<string, string> = {
  good: "ring-emerald-400",
  moderate: "ring-yellow-400",
  unhealthy_sensitive: "ring-orange-400",
  unhealthy: "ring-red-500",
  very_unhealthy: "ring-purple-500",
  hazardous: "ring-rose-700",
  unknown: "ring-slate-300",
};

function formatTimestamp(isoString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

export function AQISummaryCard({
  isRefreshing = false,
  locationName,
  onRefresh,
  snapshot,
}: AQISummaryCardProps) {
  const {
    aqiValue,
    aqiScaleLabel,
    categoryKey,
    freshnessState,
    healthSummary,
    observedAtIso,
    sourceProvider,
    sourceUrl,
    unavailableReason,
  } = snapshot;

  const isExpired = freshnessState === "expired";
  const badgeClass = FRESHNESS_BADGE[freshnessState] ?? FRESHNESS_BADGE.fresh;
  const freshnessLabel = FRESHNESS_LABEL[freshnessState] ?? "Live";
  const ringClass = CATEGORY_RING[categoryKey] ?? CATEGORY_RING.unknown;

  return (
    <section aria-labelledby="aqi-summary-heading" className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="aqi-summary-heading" className="text-base font-semibold text-slate-900">
            Air Quality Index
          </h2>
          {locationName && (
            <p
              className="text-sm text-slate-600"
              aria-label={`Location: ${locationName}`}
            >
              {locationName}
            </p>
          )}
        </div>
        <span
          aria-label={`Data freshness: ${freshnessLabel}`}
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
        >
          {freshnessLabel}
        </span>
      </div>

      {/* AQI display */}
      {isExpired ? (
        <p role="alert" className="text-sm font-medium text-rose-700">
          This reading is more than 3 hours old and cannot be shown as current. Refresh to try
          again.
        </p>
      ) : (
        <div
          className={`flex flex-col items-center gap-2 rounded-2xl p-6 ring-4 ${ringClass}`}
        >
          <span
            aria-label={`AQI value: ${aqiValue ?? "unavailable"}`}
            className="text-6xl font-bold tabular-nums text-slate-900"
          >
            {aqiValue ?? "—"}
          </span>
          <span className="text-sm font-medium text-slate-600">{aqiScaleLabel}</span>
          <p className="text-center text-sm text-slate-700">{healthSummary}</p>
        </div>
      )}

      {/* Metadata */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
        <div>
          <dt className="font-semibold">Source</dt>
          <dd>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:text-tide"
            >
              {sourceProvider}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Observed</dt>
          <dd>
            <time dateTime={observedAtIso}>{formatTimestamp(observedAtIso)}</time>
          </dd>
        </div>
        {unavailableReason !== "none" && (
          <div className="col-span-2">
            <dt className="font-semibold">Status</dt>
            <dd className="capitalize">{unavailableReason.replaceAll("_", " ")}</dd>
          </div>
        )}
      </dl>

      {/* Refresh control */}
      <div className="flex justify-end">
        <button
          type="button"
          aria-label="Refresh air quality data"
          disabled={isRefreshing}
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-full bg-tide px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tide disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </section>
  );
}
