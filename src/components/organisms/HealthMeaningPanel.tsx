import type { AirQualitySnapshot } from "../../types/airQuality";
import type { AQICategoryKey, FreshnessState } from "../../types/airQuality";
 
// ---------------------------------------------------------------------------
// Category display metadata
// ---------------------------------------------------------------------------
 
const CATEGORY_LABEL: Record<AQICategoryKey, string> = {
  good: "Good",
  moderate: "Moderate",
  unhealthy_sensitive: "Unhealthy for Sensitive Groups",
  unhealthy: "Unhealthy",
  very_unhealthy: "Very Unhealthy",
  hazardous: "Hazardous",
  unknown: "Unavailable",
};
 
// Full class name literals required for Tailwind content scan.
const CATEGORY_BADGE_STYLES: Record<AQICategoryKey, string> = {
  good: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  moderate: "bg-yellow-100 text-yellow-900 ring-yellow-300",
  unhealthy_sensitive: "bg-orange-100 text-orange-900 ring-orange-300",
  unhealthy: "bg-red-100 text-red-900 ring-red-300",
  very_unhealthy: "bg-purple-100 text-purple-900 ring-purple-300",
  hazardous: "bg-rose-100 text-rose-900 ring-rose-300",
  unknown: "bg-slate-100 text-slate-600 ring-slate-200",
};
 
// ---------------------------------------------------------------------------
// Freshness display metadata
// ---------------------------------------------------------------------------
 
const FRESHNESS_WARNING: Record<FreshnessState, string | null> = {
  fresh: null,
  stale: "Stale — this reading is older than 90 minutes.",
  expired: "Expired — data is no longer current.",
};
 
// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
 
export interface HealthMeaningPanelProps {
  snapshot: AirQualitySnapshot;
}
 
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
 
export function HealthMeaningPanel({ snapshot }: HealthMeaningPanelProps) {
  const {
    aqiScaleLabel,
    categoryKey,
    freshnessState,
    healthGuidance,
    healthSummary,
  } = snapshot;
 
  const isExpired = freshnessState === "expired";
  const isStale = freshnessState === "stale";
  const freshnessWarning = FRESHNESS_WARNING[freshnessState];
  const categoryLabel = CATEGORY_LABEL[categoryKey] ?? CATEGORY_LABEL.unknown;
  const badgeStyle =
    CATEGORY_BADGE_STYLES[categoryKey] ?? CATEGORY_BADGE_STYLES.unknown;
 
  return (
    <section
      role="region"
      aria-labelledby="health-meaning-heading"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      {/* Heading (SR navigation target) */}
      <h2
        id="health-meaning-heading"
        className="text-base font-semibold text-slate-900"
      >
        Health Meaning
      </h2>
 
      {/* Category badge — text label always present */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-label={`Category: ${categoryLabel}`}
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${badgeStyle}`}
        >
          {categoryLabel}
        </span>
 
        {/* AQI scale label — visible text, not tooltip */}
        <span className="text-xs text-slate-500">{aqiScaleLabel}</span>
      </div>
 
      {/* Freshness warning — visible text, not color alone */}
      {freshnessWarning !== null && (
        <p
          role="alert"
          className={`text-sm font-medium ${
            isExpired ? "text-rose-700" : "text-amber-700"
          }`}
        >
          {freshnessWarning}
        </p>
      )}
 
      {/* Health summary and guidance — hidden when expired */}
      {isExpired ? (
        <p className="text-sm text-slate-500">
          Health guidance is unavailable while data is expired. Refresh to load
          current conditions.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-800">{healthSummary}</p>
          <p className="text-sm leading-relaxed text-slate-700">
            {isStale
              ? `${healthGuidance} Note: this guidance is based on outdated readings.`
              : healthGuidance}
          </p>
        </div>
      )}
 
      {/* Non-medical disclaimer */}
      <p className="text-xs leading-5 text-slate-400">
        This information is not a substitute for medical advice and is provided
        for informational purposes only.
      </p>
    </section>
  );
}