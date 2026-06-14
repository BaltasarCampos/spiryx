import { describe, expect, it } from "vitest";
import {
  EXPIRED_DATA_THRESHOLD_MINUTES,
  STALE_DATA_THRESHOLD_MINUTES,
} from "../../config/constants";
import { getAgeInMinutes, getFreshnessState, isExpired } from "../freshness";
 
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}
 
/**
 * Create a fixed (now, isoString) pair exactly `minutes` apart.
 * Passing the same `now` to both the timestamp and the function under test
 * eliminates sub-millisecond drift that makes exact boundary assertions racy.
 */
function fixedBoundary(minutes: number): { iso: string; now: Date } {
  const now = new Date();
  const iso = new Date(now.getTime() - minutes * 60_000).toISOString();
  return { iso, now };
}
 
describe("getAgeInMinutes", () => {
  it("returns 0 for a timestamp right now", () => {
    // Pass the same Date instance to both arguments to eliminate sub-millisecond drift.
    const now = new Date();
    expect(getAgeInMinutes(now.toISOString(), now)).toBe(0);
  });
 
  it("returns the correct age for a past timestamp", () => {
    const age = getAgeInMinutes(minutesAgo(45));
    expect(age).toBeCloseTo(45, 0);
  });
 
  it("returns Infinity for an invalid date string", () => {
    expect(getAgeInMinutes("not-a-date")).toBe(Number.POSITIVE_INFINITY);
  });
 
  it("returns Infinity for an empty string", () => {
    expect(getAgeInMinutes("")).toBe(Number.POSITIVE_INFINITY);
  });
});
 
describe("getFreshnessState", () => {
  it(`returns "fresh" when age is 0 minutes`, () => {
    expect(getFreshnessState(minutesAgo(0))).toBe("fresh");
  });
 
  it(`returns "fresh" when age equals the stale threshold (${STALE_DATA_THRESHOLD_MINUTES} min)`, () => {
    // Use a fixed now so the boundary is exact — minutesAgo() drifts by
    // microseconds between timestamp creation and function evaluation.
    const { iso, now } = fixedBoundary(STALE_DATA_THRESHOLD_MINUTES);
    expect(getFreshnessState(iso, now)).toBe("fresh");
  });
 
  it(`returns "stale" when age is just over ${STALE_DATA_THRESHOLD_MINUTES} min`, () => {
    expect(getFreshnessState(minutesAgo(STALE_DATA_THRESHOLD_MINUTES + 1))).toBe("stale");
  });
 
  it(`returns "stale" when age equals ${EXPIRED_DATA_THRESHOLD_MINUTES} min`, () => {
    // Use fixed now for the same reason — exact boundary test.
    const { iso, now } = fixedBoundary(EXPIRED_DATA_THRESHOLD_MINUTES);
    expect(getFreshnessState(iso, now)).toBe("stale");
  });
 
  it(`returns "expired" when age is just over ${EXPIRED_DATA_THRESHOLD_MINUTES} min`, () => {
    expect(getFreshnessState(minutesAgo(EXPIRED_DATA_THRESHOLD_MINUTES + 1))).toBe("expired");
  });
 
  it(`returns "expired" for an invalid timestamp`, () => {
    expect(getFreshnessState("invalid")).toBe("expired");
  });
});
 
describe("isExpired", () => {
  it("returns false for fresh data", () => {
    expect(isExpired(minutesAgo(30))).toBe(false);
  });
 
  it("returns false for stale data", () => {
    expect(isExpired(minutesAgo(120))).toBe(false);
  });
 
  it("returns true when age exceeds the expired threshold", () => {
    expect(isExpired(minutesAgo(EXPIRED_DATA_THRESHOLD_MINUTES + 1))).toBe(true);
  });
});
 