import { FORECAST_CACHE_TTL_MS, SESSION_CACHE_TTL_MS } from "../config/constants";
import type { AirQualitySnapshot } from "../types/airQuality";
import type { ForecastWindow } from "../types/activity";
import { AppError } from "./errors";
import { withRetry } from "../utils/retry";
import { requestJson } from "./apiClient";
import { MemoryCache } from "./cache";
import {
  normalizeAirQualityResponse,
  normalizeForecastResponse,
  type OpenMeteoAirQualityResponse,
} from "./normalizers";

const AQI_BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const CURRENT_FIELDS = [
  "us_aqi",
  "european_aqi",
  "pm2_5",
  "pm10",
  "ozone",
  "nitrogen_dioxide",
  "sulphur_dioxide",
  "carbon_monoxide",
  "ammonia",
  "methane",
  "alder_pollen",
  "birch_pollen",
  "grass_pollen",
  "mugwort_pollen",
  "olive_pollen",
  "ragweed_pollen"
].join(",");

const cache = new MemoryCache<AirQualitySnapshot>(SESSION_CACHE_TTL_MS);

function makeCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export interface GetCurrentAQIInput {
  latitude: number;
  longitude: number;
  signal?: AbortSignal;
  /** Skip the cache read (still writes a fresh entry). Used for refresh-triggered fetches. */
  bypassCache?: boolean;
}

export async function getCurrentAQI(input: GetCurrentAQIInput): Promise<AirQualitySnapshot> {
  const { latitude, longitude, signal, bypassCache = false } = input;
  const cacheKey = makeCacheKey(latitude, longitude);

  if (!bypassCache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const snapshot = await withRetry(
    () =>
      requestJson<OpenMeteoAirQualityResponse>(AQI_BASE_URL, {
        signal,
        query: {
          latitude,
          longitude,
          current: CURRENT_FIELDS,
          timezone: "auto",
        },
      }).then(normalizeAirQualityResponse),
    {
      signal,
      shouldRetry: (error) => error instanceof AppError && error.retryable,
    },
  );

  cache.set(cacheKey, snapshot);
  return snapshot;
}

export function clearAQICache(): void {
  cache.clear();
}

// Separate cache instance: forecasts stay valid much longer (3h) than the
// current-conditions snapshot and must not share TTL or eviction with it.
const forecastCache = new MemoryCache<ForecastWindow>(FORECAST_CACHE_TTL_MS);

export interface GetHourlyForecastInput {
  latitude: number;
  longitude: number;
  signal?: AbortSignal;
  /** Skip the cache read (still writes a fresh entry). Used by the prefetch scheduled before expiry. */
  bypassCache?: boolean;
}

export async function getHourlyForecast(input: GetHourlyForecastInput): Promise<ForecastWindow> {
  const { latitude, longitude, signal, bypassCache = false } = input;
  const cacheKey = makeCacheKey(latitude, longitude);

  if (!bypassCache) {
    const cached = forecastCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const window = await withRetry(
    () =>
      requestJson<OpenMeteoAirQualityResponse>(AQI_BASE_URL, {
        signal,
        query: {
          latitude,
          longitude,
          hourly: "us_aqi,european_aqi",
          forecast_days: 2,
          timezone: "auto",
        },
      }).then((payload) => normalizeForecastResponse(payload)),
    {
      signal,
      shouldRetry: (error) => error instanceof AppError && error.retryable,
    },
  );

  forecastCache.set(cacheKey, window);
  return window;
}

export function clearForecastCache(): void {
  forecastCache.clear();
}
