import { describe, it, expect } from "vitest";
import { getActivitySafety } from "../activitySafety";
import type { ActivityType, RecommendationLevel } from "../../types/activity";

const ACTIVITIES: ActivityType[] = ["run", "cycle"];

const BOUNDARY_CASES: [number, RecommendationLevel][] = [
  [0, "go_ahead"],
  [50, "go_ahead"],
  [51, "limit_activity"],
  [100, "limit_activity"],
  [101, "limit_activity"],
  [150, "limit_activity"],
  [151, "stay_inside"],
];

describe.each(ACTIVITIES)("getActivitySafety – %s boundaries", (activity) => {
  it.each(BOUNDARY_CASES)("aqi %i maps to %s", (aqi, expected) => {
    expect(getActivitySafety(aqi, activity).recommendationLevel).toBe(expected);
  });

  it("maps null aqi to stay_inside (SH-001)", () => {
    expect(getActivitySafety(null, activity).recommendationLevel).toBe("stay_inside");
  });

  it("echoes back the input aqiValue and activityType", () => {
    const result = getActivitySafety(75, activity);
    expect(result.aqiValue).toBe(75);
    expect(result.activityType).toBe(activity);
  });

  it("returns a non-empty reason for every boundary and the null case", () => {
    const values = [...BOUNDARY_CASES.map(([aqi]) => aqi), null];
    for (const aqi of values) {
      expect(getActivitySafety(aqi, activity).reason.length).toBeGreaterThan(0);
    }
  });

  it("reason differs between the go_ahead, limit_activity, and stay_inside tiers", () => {
    const goAhead = getActivitySafety(30, activity).reason;
    const limit = getActivitySafety(75, activity).reason;
    const stayInside = getActivitySafety(200, activity).reason;
    expect(new Set([goAhead, limit, stayInside]).size).toBe(3);
  });

  it("null-data reason differs from the numeric stay_inside reason (cites data limitation)", () => {
    const nullReason = getActivitySafety(null, activity).reason;
    const numericStayInside = getActivitySafety(200, activity).reason;
    expect(nullReason).not.toBe(numericStayInside);
  });
});

describe("getActivitySafety – checkedAtIso clock injection", () => {
  it("derives checkedAtIso from the injected clock", () => {
    const fixed = new Date("2026-01-01T00:00:00.000Z");
    const result = getActivitySafety(10, "run", () => fixed);
    expect(result.checkedAtIso).toBe(fixed.toISOString());
  });

  it("defaults to the current time when no clock is injected", () => {
    const before = Date.now();
    const result = getActivitySafety(10, "run");
    const after = Date.now();
    const checkedAtMs = new Date(result.checkedAtIso).getTime();
    expect(checkedAtMs).toBeGreaterThanOrEqual(before);
    expect(checkedAtMs).toBeLessThanOrEqual(after);
  });
});
