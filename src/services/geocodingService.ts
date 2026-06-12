import { AppError } from "./errors";
import { requestJson } from "./apiClient";
import { normalizeLocationName, type BigdatacloudReverseGeocodingResponse } from "./normalizers";
import { withRetry } from "../utils/retry";
import { env } from "process";

const GEOCODING_BASE_URL = "https://api-bdc.net/data/reverse-geocode";
const key = env.BIGDATACLOUD_API_KEY;

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
        requestJson<BigdatacloudReverseGeocodingResponse>(GEOCODING_BASE_URL, {
          signal,
          query: {
            latitude,
            longitude,
            localityLanguage: "en",
            key,            
          },
        }),
      {
        signal,
        shouldRetry: (error) => error instanceof AppError && error.retryable,
      },
    );

    return normalizeLocationName(response);
  } catch (error) {
console.log(error);
    // Geocoding failure is non-fatal; fall back to a generic label
    return "Current location";
  }
}
