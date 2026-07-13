import type { AQICategoryKey } from "./airQuality";

export type ActivityType = "run" | "cycle" | "kids";

export type RecommendationLevel = "go_ahead" | "limit_activity" | "stay_inside";

export interface ActivitySafetyCheck {
  activityType: ActivityType;
  aqiValue: number | null;
  recommendationLevel: RecommendationLevel;
  reason: string;
  checkedAtIso: string;
}

export interface HourlyForecastPoint {
  timeIso: string;
  aqiValue: number | null;
  categoryKey: AQICategoryKey;
  isBestHour: boolean;
}

export interface ForecastWindow {
  points: HourlyForecastPoint[];
  requestedHours: 48;
  coveredHours: number;
  isIncomplete: boolean;
  nextBestHourIso: string | null;
}

export type TrendDirection = "worsening" | "improving" | "stable";

export interface TrendSnapshot {
  currentValue: number;
  previousValue: number;
  percentChange: number;
  direction: TrendDirection;
}

export interface ActivityHistoryEntry {
  activityType: ActivityType;
  lastCheckedIso: string;
}
