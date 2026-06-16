import type { PollutantReading } from "../../types/airQuality";
 
// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
 
export interface PollutantListProps {
  pollutants: PollutantReading[];
}
 
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
 
/**
 * Format a numeric value for display.
 * Strips unnecessary trailing zeros (e.g. 20.0 → "20", 12.5 → "12.5").
 */
function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}
 
// ---------------------------------------------------------------------------
// Sub-component: single pollutant row
// ---------------------------------------------------------------------------
 
function PollutantRow({ reading }: { reading: PollutantReading }) {
  const { displayName, value, unit, availability } = reading;
  const isAvailable = availability === "available";
 
  return (
    <li className="flex items-center justify-between gap-4 py-2">
      {/* Display name — always visible */}
      <span className="text-sm text-slate-700">{displayName}</span>
 
      {/* Value or missing marker — text always present */}
      <span
        className={`text-sm font-medium tabular-nums ${
          isAvailable ? "text-slate-900" : "text-slate-400"
        }`}
      >
        {isAvailable && value !== null ? (
          <>
            {formatValue(value)}{" "}
            <span className="text-xs font-normal text-slate-500">{unit}</span>
          </>
        ) : (
          // Explicit text marker — not blank, not color-only
          <span aria-label={`${displayName}: not available`}>Not available</span>
        )}
      </span>
    </li>
  );
}
 
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
 
export function PollutantList({ pollutants }: PollutantListProps) {
  return (
    <section
      role="region"
      aria-labelledby="pollutant-list-heading"
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2
        id="pollutant-list-heading"
        className="text-base font-semibold text-slate-900"
      >
        Pollutants
      </h2>
 
      {pollutants.length === 0 ? (
        <p className="text-sm text-slate-500">Pollutant data unavailable.</p>
      ) : (
        <ul
          role="list"
          className="divide-y divide-slate-100"
        >
          {pollutants.map((reading) => (
            <PollutantRow key={reading.pollutantCode} reading={reading} />
          ))}
        </ul>
      )}
    </section>
  );
}
 