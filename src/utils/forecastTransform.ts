import type { HourlyForecastPoint, RecommendationLevel } from "../types/activity";

/** Hours in the forecast window whose AQI falls in the "good" category. */
export function getBestHours(points: HourlyForecastPoint[]): HourlyForecastPoint[] {
  return points.filter((point) => point.isBestHour);
}

/**
 * When the current recommendation restricts activity, the earliest upcoming
 * best hour. Null when conditions are already good — nothing to
 * announce — or when no best hour exists in the window.
 */
export function getNextBestHourIso(
  points: HourlyForecastPoint[],
  currentRecommendation: RecommendationLevel,
): string | null {
  if (currentRecommendation === "go_ahead") {
    return null;
  }

  return points.find((point) => point.isBestHour)?.timeIso ?? null;
}
