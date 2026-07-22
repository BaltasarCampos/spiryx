/**
 * Acceptance scenarios: checks recorded in a prior session appear as
 * quick-access entries on return, and reopening one re-evaluates against
 * the latest AQI rather than replaying a stored result.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
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
    categoryKey: "good",
    healthSummary: "Air quality is good.",
    healthGuidance: "Most people can continue normal outdoor activities.",
    freshnessState: "fresh",
    unavailableReason: "none",
    pollutants: [],
  };
}

async function renderApp(aqiValue: number) {
  vi.mocked(getCurrentAQI).mockResolvedValue(makeSnapshot(aqiValue));
  const view = render(<App />);
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /safe to run\?/i }),
    ).toBeInTheDocument();
  });
  return view;
}

describe("Integration – activity history", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
  });

  it("surfaces activities checked in a prior session as quick-access entries", async () => {
    const user = userEvent.setup();
    const firstSession = await renderApp(35);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    await user.click(screen.getByRole("button", { name: /safe for kids\?/i }));
    firstSession.unmount();

    // "Reload": a fresh App mount reads persisted history.
    await renderApp(35);
    const list = screen.getByRole("list", { name: /recently checked/i });
    expect(within(list).getByRole("button", { name: /running/i })).toBeInTheDocument();
    expect(within(list).getByRole("button", { name: /kids/i })).toBeInTheDocument();
  });

  it("shows no quick-access section when there is no history", async () => {
    await renderApp(35);
    expect(screen.queryByText(/recently checked/i)).not.toBeInTheDocument();
  });

  it("re-evaluates a reopened entry against the latest AQI, not the stored result", async () => {
    const user = userEvent.setup();
    const firstSession = await renderApp(35);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    expect(screen.getByText(/go ahead/i)).toBeInTheDocument();
    firstSession.unmount();

    // Air quality has worsened by the next visit.
    await renderApp(175);
    const list = screen.getByRole("list", { name: /recently checked/i });
    await user.click(within(list).getByRole("button", { name: /running/i }));
    expect(screen.getByText(/stay inside/i)).toBeInTheDocument();
    expect(screen.queryByText(/go ahead/i)).not.toBeInTheDocument();
  });

  it("persists a reopened check as the most recent entry", async () => {
    const user = userEvent.setup();
    const firstSession = await renderApp(35);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    await user.click(screen.getByRole("button", { name: /safe to cycle\?/i }));
    firstSession.unmount();

    await renderApp(35);
    const list = screen.getByRole("list", { name: /recently checked/i });
    await user.click(within(list).getByRole("button", { name: /running/i }));
    const entries = within(
      screen.getByRole("list", { name: /recently checked/i }),
    ).getAllByRole("listitem");
    expect(entries).toHaveLength(2);
    expect(within(entries[0]).getByRole("button", { name: /running/i })).toBeInTheDocument();
  });
});
