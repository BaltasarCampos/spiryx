import { TREND_NEGLIGIBLE_PERCENT } from "../config/constants";
import type { TrendDirection, TrendSnapshot } from "../types/activity";

/**
 * Compares the two most recently fetched AQI readings. Changes smaller than
 * TREND_NEGLIGIBLE_PERCENT in either direction report as "stable" so the
 * indicator does not flicker on measurement noise.
 *
 * Callers handle the "no previous reading yet" case by not calling this.
 */
export function computeTrend(current: number, previous: number): TrendSnapshot {
  const percentChange = ((current - previous) / previous) * 100;

  let direction: TrendDirection = "stable";
  if (percentChange >= TREND_NEGLIGIBLE_PERCENT) {
    direction = "worsening";
  } else if (percentChange <= -TREND_NEGLIGIBLE_PERCENT) {
    direction = "improving";
  }

  return {
    currentValue: current,
    previousValue: previous,
    percentChange,
    direction,
  };
}
