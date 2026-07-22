/**
 * ComputeTrend contract cases: increase,
 * decrease, exact-zero change, and values just inside/outside
 * TREND_NEGLIGIBLE_PERCENT on both sides (no-flicker boundary).
 */
import { describe, expect, it } from "vitest";
import { computeTrend } from "../trend";
import { TREND_NEGLIGIBLE_PERCENT } from "../../config/constants";

const PREVIOUS = 100;

describe("computeTrend", () => {
  it("reports worsening with the signed percent increase", () => {
    const trend = computeTrend(150, PREVIOUS);
    expect(trend.direction).toBe("worsening");
    expect(trend.percentChange).toBeCloseTo(50);
    expect(trend.currentValue).toBe(150);
    expect(trend.previousValue).toBe(PREVIOUS);
  });

  it("reports improving with the signed percent decrease", () => {
    const trend = computeTrend(50, PREVIOUS);
    expect(trend.direction).toBe("improving");
    expect(trend.percentChange).toBeCloseTo(-50);
  });

  it("reports stable for an exact-zero change", () => {
    const trend = computeTrend(PREVIOUS, PREVIOUS);
    expect(trend.direction).toBe("stable");
    expect(trend.percentChange).toBe(0);
  });

  it("reports stable for an increase just inside the negligible threshold", () => {
    const current = PREVIOUS + TREND_NEGLIGIBLE_PERCENT - 0.1;
    expect(computeTrend(current, PREVIOUS).direction).toBe("stable");
  });

  it("reports stable for a decrease just inside the negligible threshold", () => {
    const current = PREVIOUS - TREND_NEGLIGIBLE_PERCENT + 0.1;
    expect(computeTrend(current, PREVIOUS).direction).toBe("stable");
  });

  it("reports worsening at exactly the negligible threshold", () => {
    const current = PREVIOUS + TREND_NEGLIGIBLE_PERCENT;
    const trend = computeTrend(current, PREVIOUS);
    expect(trend.direction).toBe("worsening");
    expect(trend.percentChange).toBeCloseTo(TREND_NEGLIGIBLE_PERCENT);
  });

  it("reports improving at exactly the negative negligible threshold", () => {
    const current = PREVIOUS - TREND_NEGLIGIBLE_PERCENT;
    const trend = computeTrend(current, PREVIOUS);
    expect(trend.direction).toBe("improving");
    expect(trend.percentChange).toBeCloseTo(-TREND_NEGLIGIBLE_PERCENT);
  });
});
