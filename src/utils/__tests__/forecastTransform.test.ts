/**
 * GetBestHours / getNextBestHourIso boundary cases.
 */
import { describe, expect, it } from "vitest";
import { getBestHours, getNextBestHourIso } from "../forecastTransform";
import type { HourlyForecastPoint } from "../../types/activity";

function makePoint(hourOffset: number, isBestHour: boolean): HourlyForecastPoint {
  return {
    timeIso: new Date(Date.UTC(2026, 0, 1, hourOffset)).toISOString(),
    aqiValue: isBestHour ? 40 : 120,
    categoryKey: isBestHour ? "good" : "unhealthy_sensitive",
    isBestHour,
  };
}

describe("getBestHours", () => {
  it("returns only best-hour points, preserving order", () => {
    const points = [makePoint(0, false), makePoint(1, true), makePoint(2, true)];
    const best = getBestHours(points);
    expect(best).toHaveLength(2);
    expect(best[0].timeIso).toBe(points[1].timeIso);
    expect(best[1].timeIso).toBe(points[2].timeIso);
  });

  it("returns an empty array when no hour is in the good category", () => {
    expect(getBestHours([makePoint(0, false), makePoint(1, false)])).toEqual([]);
  });
});

describe("getNextBestHourIso", () => {
  it("returns null when the current recommendation is already go_ahead", () => {
    const points = [makePoint(0, true), makePoint(1, true)];
    expect(getNextBestHourIso(points, "go_ahead")).toBeNull();
  });

  it("returns null when no point is a best hour", () => {
    const points = [makePoint(0, false), makePoint(1, false)];
    expect(getNextBestHourIso(points, "limit_activity")).toBeNull();
    expect(getNextBestHourIso(points, "stay_inside")).toBeNull();
  });

  it("returns the earliest best hour when activity is limited", () => {
    const points = [makePoint(0, false), makePoint(1, true), makePoint(2, true)];
    expect(getNextBestHourIso(points, "limit_activity")).toBe(points[1].timeIso);
  });

  it("returns the earliest best hour when the recommendation is stay_inside", () => {
    const points = [makePoint(0, false), makePoint(1, false), makePoint(2, true)];
    expect(getNextBestHourIso(points, "stay_inside")).toBe(points[2].timeIso);
  });

  it("returns null for an empty forecast", () => {
    expect(getNextBestHourIso([], "limit_activity")).toBeNull();
  });
});
