import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentAQI } from "../services/airQualityService";
import { getLocationName } from "../services/geocodingService";
import { useRefreshTimer } from "./useRefreshTimer";
import type { AirQualitySnapshot } from "../types/airQuality";
import { isAbortError } from "../utils/retry";
 
export type AQILoadState = "idle" | "loading" | "success" | "error";
 
export interface UseCurrentAQIResult {
  snapshot: AirQualitySnapshot | null;
  locationName: string | null;
  loadState: AQILoadState;
  errorMessage: string | null;
  lastFetchedAt: string | null;
  /** Triggers an immediate fetch and resets the auto-refresh interval. */
  refresh: () => void;
}
 
export function useCurrentAQI({
  latitude,
  longitude,
  enabled = true,
}: {
  latitude: number | null;
  longitude: number | null;
  enabled?: boolean;
}): UseCurrentAQIResult {
  const [snapshot, setSnapshot] = useState<AirQualitySnapshot | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<AQILoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
 
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
 
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);
 
  const doFetch = useCallback(async () => {
    if (!enabled || latitude === null || longitude === null) return;
 
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
 
    if (!isMountedRef.current) return;
    setLoadState("loading");
    setErrorMessage(null);
 
    try {
      const [nextSnapshot, nextLocationName] = await Promise.all([
        getCurrentAQI({ latitude, longitude, signal: controller.signal }),
        getLocationName({ latitude, longitude, signal: controller.signal }),
      ]);
 
      if (!isMountedRef.current || controller.signal.aborted) return;
 
      setSnapshot(nextSnapshot);
      setLocationName(nextLocationName);
      setLastFetchedAt(new Date().toISOString());
      setLoadState("success");
    } catch (error) {
      if (isAbortError(error) || !isMountedRef.current) return;
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load air quality data.",
      );
      setLoadState("error");
    }
  }, [enabled, latitude, longitude]);
 
  // Initial load / coordinate change
  useEffect(() => {
    if (!enabled || latitude === null || longitude === null) return;
    void doFetch();
  }, [enabled, latitude, longitude, doFetch]);
 
  // 15-minute auto-refresh — delegated to useRefreshTimer so manual refresh
  // also resets the interval, preventing a double-fetch shortly after.
  const { triggerRefresh } = useRefreshTimer({
    onRefresh: useCallback(() => void doFetch(), [doFetch]),
    enabled: enabled && latitude !== null && longitude !== null,
  });
 
  return {
    snapshot,
    locationName,
    loadState,
    errorMessage,
    lastFetchedAt,
    refresh: triggerRefresh,
  };
}
 