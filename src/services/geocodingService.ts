import { AppError } from "./errors";
import { requestJson } from "./apiClient";
import { normalizeLocationName, type OpenMeteoReverseGeocodingResponse } from "./normalizers";
import { withRetry } from "../utils/retry";

const GEOCODING_BASE_URL = "/api/geocodingFunction";

export interface GetLocationNameInput {
  latitude: number;
  longitude: number;
  signal?: AbortSignal;
}

export async function getLocationName(input: GetLocationNameInput): Promise<string> {
  const { latitude, longitude, signal } = input;

  try {
    const response = await withRetry(
      () =>
        requestJson<OpenMeteoReverseGeocodingResponse>(GEOCODING_BASE_URL, {
          signal,
          query: {
            latitude,
            longitude,
          },
        }),
      {
        signal,
        shouldRetry: (error) => error instanceof AppError && error.retryable,
      },
    );

    return normalizeLocationName(response);
  } catch {
    // Geocoding failure is non-fatal; fall back to a generic label
    return "Current location";
  }
}
