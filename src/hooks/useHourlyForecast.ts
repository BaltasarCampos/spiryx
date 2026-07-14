import { useCallback, useEffect, useRef, useState } from "react";
import { FORECAST_CACHE_TTL_MS, FORECAST_PREFETCH_LEAD_MS } from "../config/constants";
import { getHourlyForecast } from "../services/airQualityService";
import { useRefreshTimer } from "./useRefreshTimer";
import type { ForecastWindow } from "../types/activity";
import { isAbortError } from "../utils/retry";

export type ForecastLoadState = "idle" | "loading" | "success" | "error";

export interface UseHourlyForecastResult {
  forecast: ForecastWindow | null;
  loadState: ForecastLoadState;
  errorMessage: string | null;
  fetchedAtIso: string | null;
  /** Triggers an immediate cache-bypassing fetch and resets the prefetch timer. */
  refresh: () => void;
}

// Refetch FORECAST_PREFETCH_LEAD_MS before the 3h cache entry expires so a
// fresh window is already in place when the old one lapses.
const PREFETCH_INTERVAL_MS = FORECAST_CACHE_TTL_MS - FORECAST_PREFETCH_LEAD_MS;

export function useHourlyForecast({
  latitude,
  longitude,
  enabled = true,
}: {
  latitude: number | null;
  longitude: number | null;
  enabled?: boolean;
}): UseHourlyForecastResult {
  const [forecast, setForecast] = useState<ForecastWindow | null>(null);
  const [loadState, setLoadState] = useState<ForecastLoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchedAtIso, setFetchedAtIso] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const hasDataRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const doFetch = useCallback(async (bypassCache = false) => {
    if (!enabled || latitude === null || longitude === null) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!isMountedRef.current) return;
    // Stale-while-revalidate: keep showing the current window during a
    // background refresh instead of dropping back to a loading state.
    if (!hasDataRef.current) {
      setLoadState("loading");
    }
    setErrorMessage(null);

    try {
      const window = await getHourlyForecast({
        latitude,
        longitude,
        signal: controller.signal,
        bypassCache,
      });

      if (!isMountedRef.current || controller.signal.aborted) return;

      hasDataRef.current = true;
      setForecast(window);
      setFetchedAtIso(new Date().toISOString());
      setLoadState("success");
    } catch (error) {
      if (isAbortError(error) || !isMountedRef.current) return;
      // A failed background refresh keeps the previous window on screen; the
      // error state only surfaces when there is nothing to show instead.
      if (!hasDataRef.current) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load the air quality forecast.",
        );
        setLoadState("error");
      }
    }
  }, [enabled, latitude, longitude]);

  // Initial load / coordinate change
  useEffect(() => {
    if (!enabled || latitude === null || longitude === null) return;
    void doFetch();
  }, [enabled, latitude, longitude, doFetch]);

  const { triggerRefresh } = useRefreshTimer({
    onRefresh: useCallback(() => void doFetch(true), [doFetch]),
    intervalMs: PREFETCH_INTERVAL_MS,
    enabled: enabled && latitude !== null && longitude !== null,
  });

  return {
    forecast,
    loadState,
    errorMessage,
    fetchedAtIso,
    refresh: triggerRefresh,
  };
}
