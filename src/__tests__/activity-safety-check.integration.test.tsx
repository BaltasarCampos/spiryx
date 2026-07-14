import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AirQualitySnapshot } from "../types/airQuality";

vi.mock("../hooks/useGeolocation", () => ({ useGeolocation: vi.fn() }));
vi.mock("../services/airQualityService", () => ({
  getCurrentAQI: vi.fn(),
  clearAQICache: vi.fn(),
}));
vi.mock("../services/geocodingService", () => ({ getLocationName: vi.fn() }));

import { useGeolocation } from "../hooks/useGeolocation";
import { getCurrentAQI } from "../services/airQualityService";
import { getLocationName } from "../services/geocodingService";
import App from "../App";
import type { UseGeolocationResult } from "../hooks/useGeolocation";

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

async function renderAppWithAqi(aqiValue: number) {
  vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
  vi.mocked(getCurrentAQI).mockResolvedValue(makeSnapshot(aqiValue));
  vi.mocked(getLocationName).mockResolvedValue("London, UK");
  render(<App />);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /safe to run\?/i })).toBeInTheDocument();
  });
}

describe("Activity Safety Check – Run/Cycle golden path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AQI 35: tapping Safe to Run? shows Go ahead with a plain-language reason", async () => {
    const user = userEvent.setup();
    await renderAppWithAqi(35);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    expect(screen.getByText(/go ahead/i)).toBeInTheDocument();
    expect(screen.getByText(/great time for a run/i)).toBeInTheDocument();
  });

  it("AQI 120: tapping Safe to Cycle? shows Limit activity with a plain-language reason", async () => {
    const user = userEvent.setup();
    await renderAppWithAqi(120);
    await user.click(screen.getByRole("button", { name: /safe to cycle\?/i }));
    expect(screen.getByText(/limit activity/i)).toBeInTheDocument();
  });

  it("AQI 175: tapping Safe to Run? shows Stay inside with a plain-language reason", async () => {
    const user = userEvent.setup();
    await renderAppWithAqi(175);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    expect(screen.getByText(/stay inside/i)).toBeInTheDocument();
  });

  it("switching between Run and Cycle at the same AQI updates the displayed result", async () => {
    const user = userEvent.setup();
    await renderAppWithAqi(35);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    expect(screen.getByText(/go ahead/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /safe to cycle\?/i }));
    expect(screen.getByText(/go ahead/i)).toBeInTheDocument();
  });
});

describe("Activity Safety Check – Kids golden path (US2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AQI 40: tapping Safe for Kids? shows Go ahead", async () => {
    const user = userEvent.setup();
    await renderAppWithAqi(40);
    await user.click(screen.getByRole("button", { name: /safe for kids\?/i }));
    expect(screen.getByText(/go ahead/i)).toBeInTheDocument();
  });

  it("AQI 75: tapping Safe for Kids? shows Limit activity with sensitive-group/children framing", async () => {
    const user = userEvent.setup();
    await renderAppWithAqi(75);
    await user.click(screen.getByRole("button", { name: /safe for kids\?/i }));
    expect(screen.getByText(/limit activity/i)).toBeInTheDocument();
    expect(screen.getByText(/child|sensitive/i)).toBeInTheDocument();
  });

  it("AQI 160: tapping Safe for Kids? shows Stay inside", async () => {
    const user = userEvent.setup();
    await renderAppWithAqi(160);
    await user.click(screen.getByRole("button", { name: /safe for kids\?/i }));
    expect(screen.getByText(/stay inside/i)).toBeInTheDocument();
  });
});
