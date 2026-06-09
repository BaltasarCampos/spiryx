/**
 * T022 – US1 integration test: summary render journey.
 *
 * Verifies the full flow from location granted → services resolve → AQI summary visible.
 * Will fail until LocationGate, AQISummaryCard, useCurrentAQI, and App are implemented.
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
}));
vi.mock("../services/geocodingService", () => ({
  getLocationName: vi.fn(),
}));

import { useGeolocation } from "../hooks/useGeolocation";
import { getCurrentAQI } from "../services/airQualityService";
import { getLocationName } from "../services/geocodingService";
import App from "../App";
import type { UseGeolocationResult } from "../hooks/useGeolocation";

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
  pollutants: [],
};

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

const DENIED_LOCATION: UseGeolocationResult = {
  location: {
    permissionStatus: "denied",
    latitude: null,
    longitude: null,
    locationName: null,
    resolvedAtIso: null,
  },
  isLoading: false,
  errorMessage: "Location access was denied. Enable it in your browser settings.",
  requestLocation: vi.fn(),
  resetLocation: vi.fn(),
};

describe("US1 integration – permission granted flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getCurrentAQI).mockResolvedValue(MOCK_SNAPSHOT);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
  });

  it("renders the AQI value after services resolve", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });

  it("renders the location name after services resolve", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/london, uk/i)).toBeInTheDocument();
    });
  });

  it("renders the AQI scale label", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/us aqi/i)).toBeInTheDocument();
    });
  });

  it("renders a last-updated timestamp element", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("time")).toBeInTheDocument();
    });
  });

  it("does not show a location-denied message when granted", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.queryByText(/location access denied/i)).not.toBeInTheDocument();
    });
  });

  it("renders a manual refresh button", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
    });
  });
});

describe("US1 integration – permission denied flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGeolocation).mockReturnValue(DENIED_LOCATION);
  });

  it("shows the denied heading", () => {
    render(<App />);
    expect(screen.getByText(/location access denied/i)).toBeInTheDocument();
  });

  it("shows settings guidance text", () => {
    render(<App />);
    // "browser settings" appears in both the message and details nodes; match on
    // the unique part of the errorMessage string to avoid a multi-element error.
    expect(screen.getByText(/enable it in your browser settings/i)).toBeInTheDocument();
  });

  it("shows a retry button", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not show an AQI value when denied", () => {
    render(<App />);
    expect(screen.queryByText(/air quality index/i)).not.toBeInTheDocument();
  });

  it("calls requestLocation when retry button is clicked", async () => {
    const user = userEvent.setup();
    const requestLocation = vi.fn();
    vi.mocked(useGeolocation).mockReturnValue({ ...DENIED_LOCATION, requestLocation });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(requestLocation).toHaveBeenCalledTimes(1);
  });
});

describe("US1 integration – manual refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getCurrentAQI).mockResolvedValue(MOCK_SNAPSHOT);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
  });

  it("calls getCurrentAQI again when the refresh button is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /refresh/i }));
    await waitFor(() => {
      expect(getCurrentAQI).toHaveBeenCalledTimes(2);
    });
  });
});
