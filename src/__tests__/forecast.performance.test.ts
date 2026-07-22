/**
 * Forecast render performance budget (forecast available
 * within 2 seconds). In jsdom the network is mocked away, so this smoke-tests
 * that mounting a full 48-point chart stays well inside the interactive
 * budget rather than measuring real fetch latency.
 */
import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ForecastChart } from "../components/organisms/ForecastChart";
import type { ForecastWindow, HourlyForecastPoint } from "../types/activity";

/** End-to-end budget; component mount must fit comfortably inside it. */
const MOUNT_BUDGET_MS = 2_000;

const HOUR_MS = 3_600_000;
const BASE_TIME = Date.UTC(2026, 6, 14, 12);

function makeFullWindow(): ForecastWindow {
  const points: HourlyForecastPoint[] = Array.from({ length: 48 }, (_, i) => {
    const aqiValue = i % 7 === 0 ? 42 : 90 + (i % 30);
    const isGood = aqiValue <= 50;
    return {
      timeIso: new Date(BASE_TIME + i * HOUR_MS).toISOString(),
      aqiValue,
      categoryKey: isGood ? "good" : "moderate",
      isBestHour: isGood,
    };
  });
  return {
    points,
    requestedHours: 48,
    coveredHours: 48,
    isIncomplete: false,
    nextBestHourIso: points[7].timeIso,
  };
}

describe("ForecastChart render performance budget", () => {
  it(`mounts a full 48-point forecast within ${MOUNT_BUDGET_MS}ms`, () => {
    const start = performance.now();
    render(
      React.createElement(ForecastChart, {
        forecast: makeFullWindow(),
        fetchedAtIso: new Date(BASE_TIME).toISOString(),
      }),
    );
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(MOUNT_BUDGET_MS);
  });
});
