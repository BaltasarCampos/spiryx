import { SESSION_CACHE_TTL_MS } from "../config/constants";
import type { AirQualitySnapshot } from "../types/airQuality";
import { AppError } from "./errors";
import { withRetry } from "../utils/retry";
import { requestJson } from "./apiClient";
import { MemoryCache } from "./cache";
import { normalizeAirQualityResponse, type OpenMeteoAirQualityResponse } from "./normalizers";

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
}

export async function getCurrentAQI(input: GetCurrentAQIInput): Promise<AirQualitySnapshot> {
  const { latitude, longitude, signal } = input;
  const cacheKey = makeCacheKey(latitude, longitude);

  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
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
