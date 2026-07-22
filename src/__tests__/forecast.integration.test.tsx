/**
 * 48-hour forecast golden path:
 * render, inspect an hour's AQI + category, best-hour highlight,
 * incomplete-forecast disclosure, and isolated forecast failure.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AirQualitySnapshot } from "../types/airQuality";
import type { ForecastWindow, HourlyForecastPoint } from "../types/activity";

vi.mock("../hooks/useGeolocation", () => ({ useGeolocation: vi.fn() }));
vi.mock("../services/airQualityService", () => ({
  getCurrentAQI: vi.fn(),
  clearAQICache: vi.fn(),
  getHourlyForecast: vi.fn(),
  clearForecastCache: vi.fn(),
}));
vi.mock("../services/geocodingService", () => ({ getLocationName: vi.fn() }));

import { useGeolocation } from "../hooks/useGeolocation";
import { getCurrentAQI, getHourlyForecast } from "../services/airQualityService";
import { getLocationName } from "../services/geocodingService";
import App from "../App";
import type { UseGeolocationResult } from "../hooks/useGeolocation";

const HOUR_MS = 3_600_000;

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
    categoryKey: "good",
    healthSummary: "Air quality is good.",
    healthGuidance: "Most people can continue normal outdoor activities.",
    freshnessState: "fresh",
    unavailableReason: "none",
    pollutants: [],
  };
}

function makeForecastWindow(values: (number | null)[]): ForecastWindow {
  const base = new Date();
  base.setMinutes(0, 0, 0);
  const points: HourlyForecastPoint[] = values.map((aqiValue, i) => {
    const isGood = aqiValue !== null && aqiValue <= 50;
    return {
      timeIso: new Date(base.getTime() + i * HOUR_MS).toISOString(),
      aqiValue,
      categoryKey: aqiValue === null ? "unknown" : isGood ? "good" : "unhealthy_sensitive",
      isBestHour: isGood,
    };
  });
  return {
    points,
    requestedHours: 48,
    coveredHours: points.length,
    isIncomplete: points.length < 48,
    nextBestHourIso: null,
  };
}

/** 6 poor hours, then good air for the rest of the 48h window. */
const IMPROVING_WINDOW = makeForecastWindow(
  Array.from({ length: 48 }, (_, i) => (i < 6 ? 120 : 42)),
);

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

async function renderApp(aqiValue: number, forecast: ForecastWindow | Error) {
  vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
  vi.mocked(getCurrentAQI).mockResolvedValue(makeSnapshot(aqiValue));
  vi.mocked(getLocationName).mockResolvedValue("London, UK");
  if (forecast instanceof Error) {
    vi.mocked(getHourlyForecast).mockRejectedValue(forecast);
  } else {
    vi.mocked(getHourlyForecast).mockResolvedValue(forecast);
  }
  render(<App />);
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /air quality index/i })).toBeInTheDocument();
  });
}

describe("48-hour forecast – golden path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the forecast section with up to 48 hours of data", async () => {
    await renderApp(120, IMPROVING_WINDOW);
    expect(
      await screen.findByRole("heading", { name: /48-hour forecast/i }),
    ).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(49);
  });

  // Rendering App plus the 48-row table can be slow on a loaded machine.
  it("lets the user inspect a specific hour's AQI value and category", { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    await renderApp(120, IMPROVING_WINDOW);
    await screen.findByRole("heading", { name: /48-hour forecast/i });

    await user.click(screen.getByRole("button", { name: /view as table/i }));
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    // Row 1 (after the header) is the first forecast hour: AQI 120.
    expect(within(rows[1]).getByText("120")).toBeInTheDocument();
    expect(within(rows[7]).getByText("42")).toBeInTheDocument();
    expect(within(rows[7]).getByText(/good/i)).toBeInTheDocument();
  });

  it("highlights best hours within the window", { timeout: 15_000 }, async () => {
    await renderApp(120, IMPROVING_WINDOW);
    await screen.findByRole("heading", { name: /48-hour forecast/i });
    expect(screen.getAllByText(/best hour/i).length).toBeGreaterThan(0);
  });

  it("announces when conditions next improve while current air requires limiting activity", async () => {
    await renderApp(120, IMPROVING_WINDOW);
    const message = await screen.findByText(/conditions next improve/i);
    expect(message).toBeInTheDocument();
    // First good hour is index 6 of the window.
    expect(
      document.querySelector(`time[datetime="${IMPROVING_WINDOW.points[6].timeIso}"]`),
    ).not.toBeNull();
  });

  it("omits the improvement message when current air quality is already good", async () => {
    await renderApp(35, IMPROVING_WINDOW);
    await screen.findByRole("heading", { name: /48-hour forecast/i });
    expect(screen.queryByText(/conditions next improve/i)).not.toBeInTheDocument();
  });
});

describe("48-hour forecast – degraded states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("discloses partial coverage when fewer than 48 hours are available", async () => {
    await renderApp(120, makeForecastWindow(Array.from({ length: 30 }, () => 42)));
    await screen.findByRole("heading", { name: /48-hour forecast/i });
    expect(screen.getByText(/30 of the next 48 hours/i)).toBeInTheDocument();
  });

  it("shows a forecast-unavailable panel on failure without affecting current AQI or safety checks", async () => {
    await renderApp(120, new Error("forecast fetch failed"));
    expect(await screen.findByText(/forecast unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /air quality index/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /safe to run\?/i })).toBeInTheDocument();
  });
});
