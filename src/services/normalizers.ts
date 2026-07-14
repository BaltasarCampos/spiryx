import { getAQICategoryDescriptor } from "../utils/aqiMapping";
import { getFreshnessState } from "../utils/freshness";
import { InvalidPayloadError } from "./errors";
import type { AirQualitySnapshot, PollutantCode, PollutantReading } from "../types/airQuality";
import type { ForecastWindow, HourlyForecastPoint } from "../types/activity";

interface OpenMeteoCurrentPayload {
  time?: string;
  us_aqi?: number | null;
  european_aqi?: number | null;
  pm2_5?: number | null;
  pm10?: number | null;
  ozone?: number | null;
  nitrogen_dioxide?: number | null;
  sulphur_dioxide?: number | null;
  carbon_monoxide?: number | null;
}

export interface OpenMeteoHourlyPayload {
  time?: string[];
  us_aqi?: (number | null)[];
  european_aqi?: (number | null)[];
}

export interface OpenMeteoAirQualityResponse {
  latitude?: number;
  longitude?: number;
  current?: OpenMeteoCurrentPayload;
  hourly?: OpenMeteoHourlyPayload;
}

interface GeocodingFeature {
  name: string;
  country: string;
}

interface GeocodingProperties {
  geocoding: GeocodingFeature;
}

interface Feature {
  type: "Feature";
  properties: GeocodingProperties;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

export interface NominatimReverseGeocodingResponse {
  type: "FeatureCollection";
  features: Feature[];
}

interface PollutantDefinition {
  displayName: string;
  payloadKey: keyof OpenMeteoCurrentPayload;
  pollutantCode: PollutantCode;
  unit: string;
}

const POLLUTANT_DEFINITIONS: PollutantDefinition[] = [
  { pollutantCode: "pm2_5", displayName: "PM2.5", payloadKey: "pm2_5", unit: "ug/m3" },
  { pollutantCode: "pm10", displayName: "PM10", payloadKey: "pm10", unit: "ug/m3" },
  { pollutantCode: "ozone", displayName: "Ozone", payloadKey: "ozone", unit: "ug/m3" },
  {
    pollutantCode: "no2",
    displayName: "Nitrogen dioxide",
    payloadKey: "nitrogen_dioxide",
    unit: "ug/m3",
  },
  {
    pollutantCode: "so2",
    displayName: "Sulfur dioxide",
    payloadKey: "sulphur_dioxide",
    unit: "ug/m3",
  },
  {
    pollutantCode: "co",
    displayName: "Carbon monoxide",
    payloadKey: "carbon_monoxide",
    unit: "ug/m3",
  },
];

function hasNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getAQIValue(current: OpenMeteoCurrentPayload): { value: number; scaleLabel: string } {
  if (hasNumber(current.european_aqi)) {
    return { value: current.european_aqi, scaleLabel: "EU CAQI" };
  }

  if (hasNumber(current.us_aqi)) {
    return { value: current.us_aqi, scaleLabel: "US AQI" };
  }

  throw new InvalidPayloadError("AQI payload did not include a supported AQI field");
}

export function normalizePollutants(current: OpenMeteoCurrentPayload): PollutantReading[] {
  return POLLUTANT_DEFINITIONS.map((definition) => {
    const value = current[definition.payloadKey];
    const isAvailable = hasNumber(value);

    return {
      pollutantCode: definition.pollutantCode,
      displayName: definition.displayName,
      value: isAvailable ? value : null,
      unit: definition.unit,
      availability: isAvailable ? "available" : "missing",
    };
  });
}

export function normalizeAirQualityResponse(payload: OpenMeteoAirQualityResponse): AirQualitySnapshot {
  const { latitude, longitude, current } = payload;

  if (!hasNumber(latitude) || !hasNumber(longitude) || !current?.time) {
    throw new InvalidPayloadError("AQI payload is missing required coordinates or observation time");
  }

  const observedAtIso = new Date(current.time).toISOString();
  const freshnessState = getFreshnessState(observedAtIso);
  const pollutants = normalizePollutants(current);

  if (freshnessState === "expired") {
    return {
      sourceProvider: "Open-Meteo",
      sourceUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
      fetchedAtIso: new Date().toISOString(),
      observedAtIso,
      latitude,
      longitude,
      aqiValue: null,
      aqiScaleLabel: "Unavailable",
      categoryKey: "unknown",
      healthSummary: "Current air quality data is too old to trust.",
      healthGuidance: "Wait for fresher data before making health decisions based on this dashboard.",
      freshnessState,
      unavailableReason: "stale_over_limit",
      pollutants,
    };
  }

  const { value: aqiValue, scaleLabel } = getAQIValue(current);
  const category = getAQICategoryDescriptor(aqiValue);

  return {
    sourceProvider: "Open-Meteo",
    sourceUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
    fetchedAtIso: new Date().toISOString(),
    observedAtIso,
    latitude,
    longitude,
    aqiValue,
    aqiScaleLabel: scaleLabel,
    categoryKey: category.key,
    healthSummary: category.summary,
    healthGuidance: category.guidance,
    freshnessState,
    unavailableReason: "none",
    pollutants,
  };
}

const FORECAST_WINDOW_HOURS = 48;

/**
 * Picks the hourly AQI series with the same scale preference as current
 * conditions (EU CAQI first, US AQI fallback) so a single snapshot never
 * mixes scales. Only a series matching `time`'s length is usable.
 */
function getHourlyAQISeries(hourly: OpenMeteoHourlyPayload): (number | null)[] {
  const { time, european_aqi, us_aqi } = hourly;

  if (Array.isArray(european_aqi) && european_aqi.length === time?.length) {
    return european_aqi;
  }

  if (Array.isArray(us_aqi) && us_aqi.length === time?.length) {
    return us_aqi;
  }

  throw new InvalidPayloadError("Forecast payload did not include a usable hourly AQI series");
}

export function normalizeForecastResponse(
  payload: OpenMeteoAirQualityResponse,
  now: () => Date = () => new Date(),
): ForecastWindow {
  const { hourly } = payload;

  if (!Array.isArray(hourly?.time) || hourly.time.length === 0) {
    throw new InvalidPayloadError("Forecast payload is missing hourly observation times");
  }

  const values = getHourlyAQISeries(hourly);

  // The provider returns whole days, so depending on timezone rounding a few
  // trailing hours of the prior day may precede "now" — exclude those.
  const startOfCurrentHour = now();
  startOfCurrentHour.setMinutes(0, 0, 0);
  const windowStartMs = startOfCurrentHour.getTime();

  const points: HourlyForecastPoint[] = [];
  for (let index = 0; index < hourly.time.length; index += 1) {
    const pointDate = new Date(hourly.time[index]);
    if (pointDate.getTime() < windowStartMs) {
      continue;
    }
    if (points.length >= FORECAST_WINDOW_HOURS) {
      break;
    }

    // A null hour is preserved as-is (category "unknown"), never fabricated.
    const value = values[index];
    const aqiValue = hasNumber(value) ? value : null;
    const categoryKey = getAQICategoryDescriptor(aqiValue).key;

    points.push({
      timeIso: pointDate.toISOString(),
      aqiValue,
      categoryKey,
      isBestHour: categoryKey === "good",
    });
  }

  return {
    points,
    requestedHours: FORECAST_WINDOW_HOURS,
    coveredHours: points.length,
    isIncomplete: points.length < FORECAST_WINDOW_HOURS,
    // Depends on the current AQI tier, which is not part of this payload —
    // derived at display time via getNextBestHourIso (forecastTransform.ts).
    nextBestHourIso: null,
  };
}

export function normalizeLocationName(payload: NominatimReverseGeocodingResponse): string {
  const firstResult = payload.features[0]?.properties?.geocoding;

  if (!firstResult) {
    return "Current location";
  }

  const parts = [firstResult.name, firstResult.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Current location";
}
