/**
 * UseAQITrend tracks the two most recently fetched AQI values and returns
 * TrendSnapshot | null (null until a previous reading exists).
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAQITrend } from "../useAQITrend";
import type { AirQualitySnapshot } from "../../types/airQuality";

function makeSnapshot(aqiValue: number | null): AirQualitySnapshot {
  return {
    sourceProvider: "Open-Meteo",
    sourceUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
    fetchedAtIso: new Date().toISOString(),
    observedAtIso: new Date().toISOString(),
    latitude: 51.5074,
    longitude: -0.1278,
    aqiValue,
    aqiScaleLabel: "US AQI",
    categoryKey: aqiValue === null ? "unknown" : "moderate",
    healthSummary: "Air quality is acceptable.",
    healthGuidance: "Unusually sensitive people should consider limiting exertion.",
    freshnessState: "fresh",
    unavailableReason: "none",
    pollutants: [],
  };
}

function renderTrendHook(initialSnapshot: AirQualitySnapshot | null = null) {
  return renderHook(({ snapshot }) => useAQITrend(snapshot), {
    initialProps: { snapshot: initialSnapshot },
  });
}

describe("useAQITrend", () => {
  it("returns null before any reading arrives", () => {
    const { result } = renderTrendHook();
    expect(result.current).toBeNull();
  });

  it("returns null after only the first reading (no previous to compare)", () => {
    const { result, rerender } = renderTrendHook();
    rerender({ snapshot: makeSnapshot(50) });
    expect(result.current).toBeNull();
  });

  it("compares the two most recent readings once a second arrives", () => {
    const { result, rerender } = renderTrendHook();
    rerender({ snapshot: makeSnapshot(50) });
    rerender({ snapshot: makeSnapshot(100) });
    expect(result.current).toEqual({
      currentValue: 100,
      previousValue: 50,
      percentChange: 100,
      direction: "worsening",
    });
  });

  it("shifts readings on each subsequent fetch", () => {
    const { result, rerender } = renderTrendHook();
    rerender({ snapshot: makeSnapshot(50) });
    rerender({ snapshot: makeSnapshot(100) });
    rerender({ snapshot: makeSnapshot(80) });
    expect(result.current).toEqual({
      currentValue: 80,
      previousValue: 100,
      percentChange: -20,
      direction: "improving",
    });
  });

  it("ignores re-renders with the same snapshot object", () => {
    const { result, rerender } = renderTrendHook();
    const snapshot = makeSnapshot(50);
    rerender({ snapshot });
    rerender({ snapshot });
    // A repeated render of the same fetch must not become previous=current.
    expect(result.current).toBeNull();
  });

  it("ignores snapshots with an unavailable AQI value", () => {
    const { result, rerender } = renderTrendHook();
    rerender({ snapshot: makeSnapshot(50) });
    rerender({ snapshot: makeSnapshot(100) });
    rerender({ snapshot: makeSnapshot(null) });
    expect(result.current).toEqual({
      currentValue: 100,
      previousValue: 50,
      percentChange: 100,
      direction: "worsening",
    });
  });
});
