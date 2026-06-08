export type AQICategoryKey =
  | "good"
  | "moderate"
  | "unhealthy_sensitive"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous"
  | "unknown";

export type FreshnessState = "fresh" | "stale" | "expired";

export type UnavailableReason =
  | "none"
  | "network"
  | "rate_limit"
  | "invalid_payload"
  | "stale_over_limit";

export type PollutantCode = "pm2_5" | "pm10" | "o3" | "no2" | "so2" | "co";

export interface PollutantReading {
  pollutantCode: PollutantCode;
  displayName: string;
  value: number | null;
  unit: string;
  availability: "available" | "missing";
}

export interface AirQualitySnapshot {
  sourceProvider: string;
  sourceUrl: string;
  fetchedAtIso: string;
  observedAtIso: string;
  latitude: number;
  longitude: number;
  aqiValue: number | null;
  aqiScaleLabel: string;
  categoryKey: AQICategoryKey;
  healthSummary: string;
  healthGuidance: string;
  freshnessState: FreshnessState;
  unavailableReason: UnavailableReason;
  pollutants: PollutantReading[];
}

export interface AQICategoryDescriptor {
  key: AQICategoryKey;
  label: string;
  summary: string;
  guidance: string;
}
