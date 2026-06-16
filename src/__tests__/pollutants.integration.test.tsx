import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AirQualitySnapshot, PollutantReading } from "../types/airQuality";
 
// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
 
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
 
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
 
const NOW_ISO = new Date().toISOString();
 
function makeReading(overrides: Partial<PollutantReading> = {}): PollutantReading {
  return {
    pollutantCode: "pm2_5",
    displayName: "PM2.5",
    value: 12.5,
    unit: "ug/m3",
    availability: "available",
    ...overrides,
  };
}
 
const ALL_AVAILABLE_POLLUTANTS: PollutantReading[] = [
  makeReading({ pollutantCode: "pm2_5", displayName: "PM2.5", value: 12.5 }),
  makeReading({ pollutantCode: "pm10", displayName: "PM10", value: 20.0 }),
  makeReading({ pollutantCode: "ozone", displayName: "Ozone", value: 80.0 }),
  makeReading({ pollutantCode: "no2", displayName: "Nitrogen dioxide", value: 15.0 }),
  makeReading({ pollutantCode: "so2", displayName: "Sulfur dioxide", value: 5.0 }),
  makeReading({ pollutantCode: "co", displayName: "Carbon monoxide", value: 200.0 }),
];
 
const PARTIAL_POLLUTANTS: PollutantReading[] = [
  makeReading({ pollutantCode: "pm2_5", displayName: "PM2.5", value: 12.5 }),
  makeReading({ pollutantCode: "pm10", displayName: "PM10", value: null, availability: "missing" }),
  makeReading({ pollutantCode: "ozone", displayName: "Ozone", value: 80.0 }),
  makeReading({ pollutantCode: "no2", displayName: "Nitrogen dioxide", value: null, availability: "missing" }),
  makeReading({ pollutantCode: "so2", displayName: "Sulfur dioxide", value: 5.0 }),
  makeReading({ pollutantCode: "co", displayName: "Carbon monoxide", value: null, availability: "missing" }),
];
 
const ALL_MISSING_POLLUTANTS: PollutantReading[] = ALL_AVAILABLE_POLLUTANTS.map((r) => ({
  ...r,
  value: null,
  availability: "missing" as const,
}));
 
function makeSnapshot(overrides: Partial<AirQualitySnapshot> = {}): AirQualitySnapshot {
  return {
    sourceProvider: "Open-Meteo",
    sourceUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
    fetchedAtIso: NOW_ISO,
    observedAtIso: NOW_ISO,
    latitude: 51.5074,
    longitude: -0.1278,
    aqiValue: 42,
    aqiScaleLabel: "US AQI",
    categoryKey: "good",
    healthSummary: "Air quality is good.",
    healthGuidance: "Most people can continue normal outdoor activities.",
    freshnessState: "fresh",
    unavailableReason: "none",
    pollutants: ALL_AVAILABLE_POLLUTANTS,
    ...overrides,
  };
}
 
const GRANTED_LOCATION: UseGeolocationResult = {
  location: {
    permissionStatus: "granted",
    latitude: 51.5074,
    longitude: -0.1278,
    locationName: null,
    resolvedAtIso: NOW_ISO,
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
 
// ---------------------------------------------------------------------------
// All pollutants available
// ---------------------------------------------------------------------------
 
describe("Integration – all pollutants available", () => {
  beforeEach(() => {
    vi.mocked(getCurrentAQI).mockReset();
    vi.mocked(getLocationName).mockReset();
    vi.mocked(useGeolocation).mockReset();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
    vi.mocked(getCurrentAQI).mockResolvedValue(makeSnapshot());
  });
 
  it("renders the pollutants region landmark", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /pollutants/i })).toBeInTheDocument();
    });
  });
 
  it("renders all pollutant display names", async () => {
    render(<App />);
    await waitFor(() => {
      const region = screen.getByRole("region", { name: /pollutants/i });
      expect(within(region).getByText("PM2.5")).toBeInTheDocument();
      expect(within(region).getByText("PM10")).toBeInTheDocument();
      expect(within(region).getByText("Ozone")).toBeInTheDocument();
      expect(within(region).getByText("Nitrogen dioxide")).toBeInTheDocument();
      expect(within(region).getByText("Sulfur dioxide")).toBeInTheDocument();
      expect(within(region).getByText("Carbon monoxide")).toBeInTheDocument();
    });
  });
 
  it("renders numeric values for available pollutants", async () => {
    render(<App />);
    await waitFor(() => {
      const region = screen.getByRole("region", { name: /pollutants/i });
      expect(within(region).getByText("12.5")).toBeInTheDocument();
      expect(within(region).getByText("20")).toBeInTheDocument();
    });
  });
 
  it("renders pollutant units", async () => {
    render(<App />);
    await waitFor(() => {
      const region = screen.getByRole("region", { name: /pollutants/i });
      expect(within(region).getAllByText(/ug\/m3/i).length).toBeGreaterThan(0);
    });
  });
});
 
// ---------------------------------------------------------------------------
// Partial pollutant payload: missing markers without breaking display
// ---------------------------------------------------------------------------
 
describe("Integration – partial pollutant payload", () => {
  beforeEach(() => {
    vi.mocked(getCurrentAQI).mockReset();
    vi.mocked(getLocationName).mockReset();
    vi.mocked(useGeolocation).mockReset();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
    vi.mocked(getCurrentAQI).mockResolvedValue(
      makeSnapshot({ pollutants: PARTIAL_POLLUTANTS }),
    );
  });
 
  it("renders the pollutants region even with partial data", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /pollutants/i })).toBeInTheDocument();
    });
  });
 
  it("renders explicit missing markers for missing pollutants", async () => {
    render(<App />);
    await waitFor(() => {
      const region = screen.getByRole("region", { name: /pollutants/i });
      const markers = within(region).getAllByText(/not available|missing|unavailable|—/i);
      expect(markers.length).toBeGreaterThanOrEqual(3);
    });
  });
 
  it("still renders available pollutant values alongside missing markers", async () => {
    render(<App />);
    await waitFor(() => {
      const region = screen.getByRole("region", { name: /pollutants/i });
      expect(within(region).getByText("12.5")).toBeInTheDocument();
      expect(within(region).getByText("80")).toBeInTheDocument();
      expect(within(region).getByText("5")).toBeInTheDocument();
    });
  });
 
  it("does not hide display names for missing pollutants", async () => {
    render(<App />);
    await waitFor(() => {
      const region = screen.getByRole("region", { name: /pollutants/i });
      expect(within(region).getByText("PM10")).toBeInTheDocument();
      expect(within(region).getByText("Nitrogen dioxide")).toBeInTheDocument();
      expect(within(region).getByText("Carbon monoxide")).toBeInTheDocument();
    });
  });
});
 
// ---------------------------------------------------------------------------
// All pollutants missing: no crash, panel remains
// ---------------------------------------------------------------------------
 
describe("Integration – all pollutants missing", () => {
  beforeEach(() => {
    vi.mocked(getCurrentAQI).mockReset();
    vi.mocked(getLocationName).mockReset();
    vi.mocked(useGeolocation).mockReset();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
    vi.mocked(getCurrentAQI).mockResolvedValue(
      makeSnapshot({ pollutants: ALL_MISSING_POLLUTANTS }),
    );
  });
 
  it("does not crash when all pollutant values are missing", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /pollutants/i })).toBeInTheDocument();
    });
  });
 
  it("renders the pollutants region even when all values are missing", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /pollutants/i })).toBeInTheDocument();
    });
  });
 
  it("renders missing markers for all pollutants", async () => {
    render(<App />);
    await waitFor(() => {
      const region = screen.getByRole("region", { name: /pollutants/i });
      const markers = within(region).getAllByText(/not available|missing|unavailable|—/i);
      expect(markers.length).toBeGreaterThanOrEqual(6);
    });
  });
});
 
// ---------------------------------------------------------------------------
// Pollutant panel absent when location denied
// ---------------------------------------------------------------------------
 
describe("Integration – pollutant panel absent when location denied", () => {
  beforeEach(() => {
    vi.mocked(getCurrentAQI).mockReset();
    vi.mocked(getLocationName).mockReset();
    vi.mocked(useGeolocation).mockReset();
    vi.mocked(useGeolocation).mockReturnValue(DENIED_LOCATION);
  });
 
  it("does not render the pollutants region when location is denied", () => {
    render(<App />);
    expect(
      screen.queryByRole("region", { name: /pollutants/i }),
    ).not.toBeInTheDocument();
  });
});
 