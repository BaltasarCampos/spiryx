import { useCallback, useEffect, useRef, useState } from "react";
import { AUTO_REFRESH_INTERVAL_MS } from "../config/constants";
import { getCurrentAQI } from "../services/airQualityService";
import { getLocationName } from "../services/geocodingService";
import type { AirQualitySnapshot } from "../types/airQuality";
import { isAbortError } from "../utils/retry";

export type AQILoadState = "idle" | "loading" | "success" | "error";

export interface UseCurrentAQIResult {
  snapshot: AirQualitySnapshot | null;
  locationName: string | null;
  loadState: AQILoadState;
  errorMessage: string | null;
  lastFetchedAt: string | null;
  refresh: () => Promise<void>;
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
      setErrorMessage(error instanceof Error ? error.message : "Unable to load air quality data.");
      setLoadState("error");
    }
  }, [enabled, latitude, longitude]);

  // Initial load / coordinate change
  useEffect(() => {
    if (!enabled || latitude === null || longitude === null) return;
    void doFetch();
  }, [enabled, latitude, longitude, doFetch]);

  // 15-minute auto-refresh
  useEffect(() => {
    if (!enabled || latitude === null || longitude === null) return;
    const timerId = window.setInterval(() => void doFetch(), AUTO_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timerId);
  }, [enabled, latitude, longitude, doFetch]);

  return { snapshot, locationName, loadState, errorMessage, lastFetchedAt, refresh: doFetch };
}
