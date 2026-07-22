/**
 * Activity History quick-access list must be keyboard-operable and
 * screen-reader compatible: a named list of real buttons whose accessible
 * names identify the activity, activatable with Enter.
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
import { recordActivityCheck } from "../services/activityHistoryStore";
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

const MOCK_SNAPSHOT: AirQualitySnapshot = {
  sourceProvider: "Open-Meteo",
  sourceUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
  fetchedAtIso: new Date().toISOString(),
  observedAtIso: new Date().toISOString(),
  latitude: 51.5074,
  longitude: -0.1278,
  aqiValue: 35,
  aqiScaleLabel: "US AQI",
  categoryKey: "good",
  healthSummary: "Air quality is good.",
  healthGuidance: "Most people can continue normal outdoor activities.",
  freshnessState: "fresh",
  unavailableReason: "none",
  pollutants: [],
};

async function renderAppWithHistory() {
  // Seed persisted history from a "prior session" through the real store.
  recordActivityCheck("run", "2026-07-16T09:00:00.000Z");
  recordActivityCheck("kids", "2026-07-16T10:00:00.000Z");
  render(<App />);
  await waitFor(() => {
    expect(screen.getByRole("list", { name: /recently checked/i })).toBeInTheDocument();
  });
}

describe("A11y – activity history quick access", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getCurrentAQI).mockResolvedValue(MOCK_SNAPSHOT);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
  });

  it("exposes the history as a named list of list items", async () => {
    await renderAppWithHistory();
    const list = screen.getByRole("list", { name: /recently checked/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("exposes each entry as a button named for its activity", async () => {
    await renderAppWithHistory();
    const list = screen.getByRole("list", { name: /recently checked/i });
    expect(within(list).getByRole("button", { name: /running/i })).toBeInTheDocument();
    expect(within(list).getByRole("button", { name: /kids/i })).toBeInTheDocument();
  });

  it("marks each entry's last-checked timestamp as a time element", async () => {
    await renderAppWithHistory();
    const list = screen.getByRole("list", { name: /recently checked/i });
    const entryButton = within(list).getByRole("button", { name: /running/i });
    const time = entryButton.querySelector("time");
    expect(time).not.toBeNull();
    expect(time).toHaveAttribute("dateTime", "2026-07-16T09:00:00.000Z");
  });

  it("activates an entry with the keyboard alone", async () => {
    const user = userEvent.setup();
    await renderAppWithHistory();
    const list = screen.getByRole("list", { name: /recently checked/i });
    const entryButton = within(list).getByRole("button", { name: /running/i });

    // Real button semantics: focusable and Enter-activatable, no mouse.
    entryButton.focus();
    expect(entryButton).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/go ahead/i)).toBeInTheDocument();
  });
});
