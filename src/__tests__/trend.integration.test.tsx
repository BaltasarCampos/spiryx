/**
 * Acceptance scenarios: two successive fetched AQI snapshots produce the
 * correct trend direction and magnitude display.
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

/** Renders App with a first reading, then refreshes into the second. */
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
  await waitFor(() => {
    expect(getCurrentAQI).toHaveBeenCalledTimes(2);
  });
}

describe("Integration – trend indicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
  });

  it("shows no trend indicator on the very first reading", async () => {
    vi.mocked(getCurrentAQI).mockResolvedValue(makeSnapshot(50));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("50")).toBeInTheDocument();
    });
    expect(screen.queryByText(/worsening|improving|stable/i)).not.toBeInTheDocument();
  });

  it("shows a worsening signal with the percent increase when the reading rises", async () => {
    await renderTwoReadings(50, 100);
    await waitFor(() => {
      expect(screen.getByText("Worsening")).toBeInTheDocument();
    });
    expect(screen.getByText(/up 100% from the previous reading/i)).toBeInTheDocument();
  });

  it("shows an improving signal with the percent decrease when the reading falls", async () => {
    await renderTwoReadings(100, 50);
    await waitFor(() => {
      expect(screen.getByText("Improving")).toBeInTheDocument();
    });
    expect(screen.getByText(/down 50% from the previous reading/i)).toBeInTheDocument();
  });

  it("shows a stable signal for a change within the negligible margin", async () => {
    await renderTwoReadings(100, 101);
    await waitFor(() => {
      expect(screen.getByText("Stable")).toBeInTheDocument();
    });
    expect(screen.getByText(/changed 1% from the previous reading/i)).toBeInTheDocument();
  });
});
