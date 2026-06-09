/**
 * T032 – Privacy constraint test: no coordinate persistence.
 *
 * Verifies that runtime location coordinates are held only in React state
 * and are never written to localStorage or sessionStorage.
 */
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import type { AirQualitySnapshot } from "../types/airQuality";
import type { UseGeolocationResult } from "../hooks/useGeolocation";

vi.mock("../hooks/useGeolocation", () => ({ useGeolocation: vi.fn() }));
vi.mock("../services/airQualityService", () => ({
  getCurrentAQI: vi.fn(),
  clearAQICache: vi.fn(),
}));
vi.mock("../services/geocodingService", () => ({ getLocationName: vi.fn() }));

import { useGeolocation } from "../hooks/useGeolocation";
import { getCurrentAQI } from "../services/airQualityService";
import { getLocationName } from "../services/geocodingService";

const LATITUDE = 51.5074;
const LONGITUDE = -0.1278;

const MOCK_SNAPSHOT: AirQualitySnapshot = {
  sourceProvider: "Open-Meteo",
  sourceUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
  fetchedAtIso: new Date().toISOString(),
  observedAtIso: new Date().toISOString(),
  latitude: LATITUDE,
  longitude: LONGITUDE,
  aqiValue: 42,
  aqiScaleLabel: "US AQI",
  categoryKey: "good",
  healthSummary: "Air quality is good.",
  healthGuidance: "Most people can continue normal outdoor activities.",
  freshnessState: "fresh",
  unavailableReason: "none",
  pollutants: [],
};

function setupGrantedMocks() {
  vi.mocked(useGeolocation).mockReturnValue({
    location: {
      permissionStatus: "granted",
      latitude: LATITUDE,
      longitude: LONGITUDE,
      locationName: null,
      resolvedAtIso: new Date().toISOString(),
    },
    isLoading: false,
    errorMessage: null,
    requestLocation: vi.fn(),
    resetLocation: vi.fn(),
  } satisfies UseGeolocationResult);
  vi.mocked(getCurrentAQI).mockResolvedValue(MOCK_SNAPSHOT);
  vi.mocked(getLocationName).mockResolvedValue("London, UK");
}

describe("Privacy: no coordinate persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setupGrantedMocks();
  });

  it("does not write any data to localStorage after a successful AQI fetch", async () => {
    render(React.createElement(App, null));
    await waitFor(() => {
      expect(getCurrentAQI).toHaveBeenCalled();
    });
    expect(localStorage.length).toBe(0);
  });

  it("does not write any data to sessionStorage after a successful AQI fetch", async () => {
    render(React.createElement(App, null));
    await waitFor(() => {
      expect(getCurrentAQI).toHaveBeenCalled();
    });
    expect(sessionStorage.length).toBe(0);
  });

  it("does not persist the latitude coordinate in localStorage", async () => {
    render(React.createElement(App, null));
    await waitFor(() => {
      expect(getCurrentAQI).toHaveBeenCalled();
    });
    const allKeys = Object.keys(localStorage);
    const allValues = allKeys.map((k) => localStorage.getItem(k) ?? "");
    const coordString = String(LATITUDE);
    expect(allValues.some((v) => v.includes(coordString))).toBe(false);
  });

  it("does not persist the longitude coordinate in localStorage", async () => {
    render(React.createElement(App, null));
    await waitFor(() => {
      expect(getCurrentAQI).toHaveBeenCalled();
    });
    const allKeys = Object.keys(localStorage);
    const allValues = allKeys.map((k) => localStorage.getItem(k) ?? "");
    const coordString = String(LONGITUDE);
    expect(allValues.some((v) => v.includes(coordString))).toBe(false);
  });
});
