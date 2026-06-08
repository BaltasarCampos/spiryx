import type { AQICategoryDescriptor, AQICategoryKey } from "../types/airQuality";

interface AQIBoundary extends AQICategoryDescriptor {
  upperBound: number;
}

const AQI_BOUNDARIES: AQIBoundary[] = [
  {
    key: "good",
    label: "Good",
    upperBound: 50,
    summary: "Air quality is good.",
    guidance: "Most people can continue normal outdoor activities.",
  },
  {
    key: "moderate",
    label: "Moderate",
    upperBound: 100,
    summary: "Air quality is acceptable for most people.",
    guidance: "Unusually sensitive people may want to reduce prolonged outdoor exertion.",
  },
  {
    key: "unhealthy_sensitive",
    label: "Unhealthy for Sensitive Groups",
    upperBound: 150,
    summary: "Sensitive groups may experience health effects.",
    guidance: "Children, older adults, and people with respiratory conditions should limit extended outdoor activity.",
  },
  {
    key: "unhealthy",
    label: "Unhealthy",
    upperBound: 200,
    summary: "Air pollution may affect everyone.",
    guidance: "Reduce intense outdoor activity and consider moving exercise indoors.",
  },
  {
    key: "very_unhealthy",
    label: "Very Unhealthy",
    upperBound: 300,
    summary: "Health alert conditions are likely.",
    guidance: "Avoid prolonged or heavy outdoor exertion and follow local public-health guidance.",
  },
  {
    key: "hazardous",
    label: "Hazardous",
    upperBound: Number.POSITIVE_INFINITY,
    summary: "Emergency health conditions may be present.",
    guidance: "Stay indoors when possible and reduce outdoor exposure for everyone.",
  },
];

const UNKNOWN_CATEGORY: AQICategoryDescriptor = {
  key: "unknown",
  label: "Unavailable",
  summary: "Current air quality data is unavailable.",
  guidance: "Try refreshing again in a few minutes.",
};

export function getAQICategoryDescriptor(aqiValue: number | null | undefined): AQICategoryDescriptor {
  if (aqiValue === null || aqiValue === undefined || Number.isNaN(aqiValue)) {
    return UNKNOWN_CATEGORY;
  }

  return AQI_BOUNDARIES.find((boundary) => aqiValue <= boundary.upperBound) ?? UNKNOWN_CATEGORY;
}

export function getAQICategoryKey(aqiValue: number | null | undefined): AQICategoryKey {
  return getAQICategoryDescriptor(aqiValue).key;
}
