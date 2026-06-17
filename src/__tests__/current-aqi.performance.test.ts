/**
 * Performance budget tests.
 *
 * Verifies that AQI summary card and status panels render within acceptable
 * time budgets in the test environment as a smoke-test against catastrophically
 * slow renders..
 */
import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AQISummaryCard } from "../components/organisms/AQISummaryCard";
import { StatusPanel } from "../components/molecules/StatusPanel";
import type { AirQualitySnapshot } from "../types/airQuality";

/** Maximum acceptable component mount time in the test environment (ms). */
const MOUNT_BUDGET_MS = 200;

const MOCK_SNAPSHOT: AirQualitySnapshot = {
  sourceProvider: "Open-Meteo",
  sourceUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
  fetchedAtIso: new Date().toISOString(),
  observedAtIso: new Date().toISOString(),
  latitude: 51.5074,
  longitude: -0.1278,
  aqiValue: 42,
  aqiScaleLabel: "US AQI",
  categoryKey: "good",
  healthSummary: "Air quality is good.",
  healthGuidance: "Most people can continue normal outdoor activities.",
  freshnessState: "fresh",
  unavailableReason: "none",
  pollutants: [
    { pollutantCode: "pm2_5", displayName: "PM2.5", value: 10, unit: "ug/m3", availability: "available" },
    { pollutantCode: "pm10", displayName: "PM10", value: 20, unit: "ug/m3", availability: "available" },
    { pollutantCode: "ozone", displayName: "Ozone", value: null, unit: "ug/m3", availability: "missing" },
    { pollutantCode: "no2", displayName: "Nitrogen dioxide", value: null, unit: "ug/m3", availability: "missing" },
    { pollutantCode: "so2", displayName: "Sulfur dioxide", value: null, unit: "ug/m3", availability: "missing" },
    { pollutantCode: "co", displayName: "Carbon monoxide", value: null, unit: "ug/m3", availability: "missing" },
  ],
};

describe("AQISummaryCard render performance budget", () => {
  it(`mounts the summary card within ${MOUNT_BUDGET_MS}ms`, () => {
    const start = performance.now();
    render(
      React.createElement(AQISummaryCard, {
        snapshot: MOCK_SNAPSHOT,
        locationName: "London, UK",
        onRefresh: vi.fn(),
      }),
    );
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(MOUNT_BUDGET_MS);
  });

  it(`mounts the card with a stale snapshot within ${MOUNT_BUDGET_MS}ms`, () => {
    const staleSnapshot: AirQualitySnapshot = {
      ...MOCK_SNAPSHOT,
      freshnessState: "stale",
      observedAtIso: new Date(Date.now() - 100 * 60_000).toISOString(),
    };
    const start = performance.now();
    render(
      React.createElement(AQISummaryCard, {
        snapshot: staleSnapshot,
        locationName: null,
        onRefresh: vi.fn(),
      }),
    );
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(MOUNT_BUDGET_MS);
  });

  it(`mounts the card with an expired snapshot within ${MOUNT_BUDGET_MS}ms`, () => {
    const expiredSnapshot: AirQualitySnapshot = {
      ...MOCK_SNAPSHOT,
      aqiValue: null,
      freshnessState: "expired",
      unavailableReason: "stale_over_limit",
      observedAtIso: new Date(Date.now() - 200 * 60_000).toISOString(),
    };
    const start = performance.now();
    render(
      React.createElement(AQISummaryCard, {
        snapshot: expiredSnapshot,
        locationName: null,
        onRefresh: vi.fn(),
      }),
    );
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(MOUNT_BUDGET_MS);
  });
});

describe("StatusPanel render performance budget", () => {
  it(`mounts the loading status panel within ${MOUNT_BUDGET_MS}ms`, () => {
    const start = performance.now();
    render(
      React.createElement(StatusPanel, {
        tone: "loading",
        title: "Loading…",
        message: "Fetching air quality data for your location.",
      }),
    );
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(MOUNT_BUDGET_MS);
  });

  it(`mounts the error status panel within ${MOUNT_BUDGET_MS}ms`, () => {
    const start = performance.now();
    render(
      React.createElement(StatusPanel, {
        tone: "error",
        title: "Error",
        message: "Could not load air quality data.",
      }),
    );
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(MOUNT_BUDGET_MS);
  });
});
