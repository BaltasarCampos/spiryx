/**
 * Trend direction must be announced to assistive technology via
 * text or symbols, not color or icon rotation alone.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AirQualitySnapshot } from "../types/airQuality";

// --- Mocks ---

vi.mock("../hooks/useGeolocation", () => ({
  useGeolocation: vi.fn(),
}));
vi.mock("../services/airQualityService", () => ({
  getCurrentAQI: vi.fn(),
  clearAQICache: vi.fn(),
  getHourlyForecast: vi.fn(),
  clearForecastCache: vi.fn(),
}));
vi.mock("../services/geocodingService", () => ({
  getLocationName: vi.fn(),
}));

import { useGeolocation } from "../hooks/useGeolocation";
import { getCurrentAQI } from "../services/airQualityService";
import { getLocationName } from "../services/geocodingService";
import App from "../App";
import type { UseGeolocationResult } from "../hooks/useGeolocation";

const GRANTED_LOCATION: UseGeolocationResult = {
  location: {
    permissionStatus: "granted",
    latitude: 51.5074,
    longitude: -0.1278,
    locationName: null,
    resolvedAtIso: new Date().toISOString(),
  },
  isLoading: false,
  errorMessage: null,
  requestLocation: vi.fn(),
  resetLocation: vi.fn(),
};

function makeSnapshot(aqiValue: number): AirQualitySnapshot {
  return {
    sourceProvider: "Open-Meteo",
    sourceUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
    fetchedAtIso: new Date().toISOString(),
    observedAtIso: new Date().toISOString(),
    latitude: 51.5074,
    longitude: -0.1278,
    aqiValue,
    aqiScaleLabel: "US AQI",
    categoryKey: "moderate",
    healthSummary: "Air quality is acceptable.",
    healthGuidance: "Unusually sensitive people should consider limiting exertion.",
    freshnessState: "fresh",
    unavailableReason: "none",
    pollutants: [],
  };
}

async function renderTwoReadings(firstAqi: number, secondAqi: number) {
  const user = userEvent.setup();
  vi.mocked(getCurrentAQI)
    .mockResolvedValueOnce(makeSnapshot(firstAqi))
    .mockResolvedValueOnce(makeSnapshot(secondAqi));

  render(<App />);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /refresh air quality data/i })).toBeInTheDocument();
  });
  await user.click(screen.getByRole("button", { name: /refresh air quality data/i }));
}

describe("A11y – trend indicator (A11Y-006)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
  });

  it("announces a worsening direction as visible text, not color alone", async () => {
    await renderTwoReadings(50, 100);
    const label = await screen.findByText("Worsening");
    // The direction word itself must be in the accessibility tree.
    expect(label.closest("[aria-hidden='true']")).toBeNull();
    // The magnitude is part of the announced text too.
    const magnitude = screen.getByText(/up 100% from the previous reading/i);
    expect(magnitude.closest("[aria-hidden='true']")).toBeNull();
  });

  it("hides the decorative direction symbol from assistive technology", async () => {
    await renderTwoReadings(50, 100);
    await screen.findByText("Worsening");
    expect(screen.getByText("▲")).toHaveAttribute("aria-hidden", "true");
  });

  it("announces a stable direction as visible text", async () => {
    await renderTwoReadings(100, 101);
    const label = await screen.findByText("Stable");
    expect(label.closest("[aria-hidden='true']")).toBeNull();
  });

  it("announces an improving direction as visible text", async () => {
    await renderTwoReadings(100, 50);
    const label = await screen.findByText("Improving");
    expect(label.closest("[aria-hidden='true']")).toBeNull();
  });
});
