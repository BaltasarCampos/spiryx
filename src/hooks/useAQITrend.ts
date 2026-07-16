import { useEffect, useMemo, useRef, useState } from "react";
import { computeTrend } from "../utils/trend";
import type { AirQualitySnapshot } from "../types/airQuality";
import type { TrendSnapshot } from "../types/activity";

interface TrackedReadings {
  previous: number | null;
  current: number | null;
}

/**
 * Tracks the two most recently fetched AQI values and derives the trend
 * between them. Returns null until a previous reading exists (first load),
 * per the spec assumption that trend compares successive fetches, not a
 * rolling average.
 */
export function useAQITrend(snapshot: AirQualitySnapshot | null): TrendSnapshot | null {
  const [readings, setReadings] = useState<TrackedReadings>({
    previous: null,
    current: null,
  });
  // Guards against re-recording the same fetch (e.g. StrictMode double
  // effects), which would collapse the trend to a false 0% "stable".
  const lastRecordedRef = useRef<AirQualitySnapshot | null>(null);

  useEffect(() => {
    if (!snapshot || snapshot === lastRecordedRef.current) return;
    lastRecordedRef.current = snapshot;

    const { aqiValue } = snapshot;
    // An unavailable reading cannot be compared; keep the last real pair.
    if (aqiValue === null) return;

    setReadings(({ current }) => ({ previous: current, current: aqiValue }));
  }, [snapshot]);

  const { previous, current } = readings;
  return useMemo(
    () => (previous !== null && current !== null ? computeTrend(current, previous) : null),
    [current, previous],
  );
}
