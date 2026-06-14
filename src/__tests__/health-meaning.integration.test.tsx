import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AirQualitySnapshot } from "../types/airQuality";
 
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
 
function makeSnapshot(
  overrides: Partial<AirQualitySnapshot> = {},
): AirQualitySnapshot {
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
    pollutants: [],
    ...overrides,
  };
}
 
const GOOD_SNAPSHOT = makeSnapshot();
 
const UNHEALTHY_SNAPSHOT = makeSnapshot({
  aqiValue: 175,
  categoryKey: "unhealthy",
  healthSummary: "Air pollution may affect everyone.",
  healthGuidance: "Reduce intense outdoor activity and consider moving exercise indoors.",
});
 
const HAZARDOUS_SNAPSHOT = makeSnapshot({
  aqiValue: 350,
  categoryKey: "hazardous",
  healthSummary: "Emergency health conditions may be present.",
  healthGuidance: "Stay indoors when possible and reduce outdoor exposure for everyone.",
});
 
const STALE_SNAPSHOT = makeSnapshot({
  freshnessState: "stale",
  observedAtIso: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
});
 
const EXPIRED_SNAPSHOT = makeSnapshot({
  // aqiValue kept non-null so useCurrentAQI reaches loadState "success" and
  // both AQISummaryCard and HealthMeaningPanel render. The expired state is
  // communicated via freshnessState, not by nulling the value at the hook level.
  aqiValue: 42,
  freshnessState: "expired",
  unavailableReason: "stale_over_limit",
  observedAtIso: new Date(Date.now() - 185 * 60 * 1000).toISOString(),
});
 
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
 
// ---------------------------------------------------------------------------
// US2 AC1 – initial render shows health category and guidance
// ---------------------------------------------------------------------------
 
describe("US2 integration – initial health meaning render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getCurrentAQI).mockResolvedValue(GOOD_SNAPSHOT);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
  });
 
  it("renders the health category label after load", async () => {
    render(<App />);
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(within(healthRegion).getByLabelText(/category: good/i)).toBeInTheDocument();
    });
  });
 
  it("renders the health summary text after load", async () => {
    render(<App />);
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(within(healthRegion).getByText("Air quality is good.")).toBeInTheDocument();
    });
  });
 
  it("renders the health guidance text after load", async () => {
    render(<App />);
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(
        within(healthRegion).getByText("Most people can continue normal outdoor activities."),
      ).toBeInTheDocument();
    });
  });
 
  it("renders the AQI scale label near the health panel", async () => {
    render(<App />);
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      // Scale label appears in both AQISummaryCard and HealthMeaningPanel —
      // scope to health region to confirm it's present there specifically.
      expect(within(healthRegion).getByText(/US AQI/i)).toBeInTheDocument();
    });
  });
 
  it("renders the health region landmark", async () => {
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: /health/i }),
      ).toBeInTheDocument();
    });
  });
});
 
// ---------------------------------------------------------------------------
// US2 AC2 – health meaning updates when category worsens on refresh
// ---------------------------------------------------------------------------
 
describe("US2 integration – category worsens after manual refresh (US2 AC2)", () => {
  beforeEach(() => {
    // mockReset clears both call history AND queued mockResolvedValueOnce values,
    // preventing mock bleed between tests in this describe block.
    vi.mocked(getCurrentAQI).mockReset();
    vi.mocked(getLocationName).mockReset();
    vi.mocked(useGeolocation).mockReset();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
  });
 
  it("updates health summary when category changes from good to unhealthy", async () => {
    const user = userEvent.setup();
    vi.mocked(getCurrentAQI)
      .mockResolvedValueOnce(GOOD_SNAPSHOT)
      .mockResolvedValueOnce(UNHEALTHY_SNAPSHOT);
 
    render(<App />);
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(within(healthRegion).getByText("Air quality is good.")).toBeInTheDocument();
    });
 
    await user.click(screen.getByRole("button", { name: /refresh/i }));
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(
        within(healthRegion).getByText("Air pollution may affect everyone."),
      ).toBeInTheDocument();
    });
 
    const healthRegion = screen.getByRole("region", { name: /health/i });
    expect(
      within(healthRegion).queryByText("Air quality is good."),
    ).not.toBeInTheDocument();
  });
 
  it("updates health guidance when category changes from good to unhealthy", async () => {
    const user = userEvent.setup();
    vi.mocked(getCurrentAQI)
      .mockResolvedValueOnce(GOOD_SNAPSHOT)
      .mockResolvedValueOnce(UNHEALTHY_SNAPSHOT);
 
    render(<App />);
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(
        within(healthRegion).getByText("Most people can continue normal outdoor activities."),
      ).toBeInTheDocument();
    });
 
    await user.click(screen.getByRole("button", { name: /refresh/i }));
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(
        within(healthRegion).getByText(
          "Reduce intense outdoor activity and consider moving exercise indoors.",
        ),
      ).toBeInTheDocument();
    });
  });
 
  it("updates health category label when category changes to hazardous", async () => {
    const user = userEvent.setup();
    vi.mocked(getCurrentAQI)
      .mockResolvedValueOnce(GOOD_SNAPSHOT)
      .mockResolvedValueOnce(HAZARDOUS_SNAPSHOT);
 
    render(<App />);
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(within(healthRegion).getByLabelText(/category: good/i)).toBeInTheDocument();
    });
 
    await user.click(screen.getByRole("button", { name: /refresh/i }));
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(within(healthRegion).getByLabelText(/category: hazardous/i)).toBeInTheDocument();
    });
  });
 
  it("updates health summary when category improves after refresh", async () => {
    const user = userEvent.setup();
    vi.mocked(getCurrentAQI)
      .mockResolvedValueOnce(UNHEALTHY_SNAPSHOT)
      .mockResolvedValueOnce(GOOD_SNAPSHOT);
 
    render(<App />);
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(
        within(healthRegion).getByText("Air pollution may affect everyone."),
      ).toBeInTheDocument();
    });
 
    await user.click(screen.getByRole("button", { name: /refresh/i }));
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(within(healthRegion).getByText("Air quality is good.")).toBeInTheDocument();
    });
 
    const healthRegion = screen.getByRole("region", { name: /health/i });
    expect(
      within(healthRegion).queryByText("Air pollution may affect everyone."),
    ).not.toBeInTheDocument();
  });
});
 
// ---------------------------------------------------------------------------
// SH-001 / T039 – stale and expired freshness reflected in health panel
// ---------------------------------------------------------------------------
 
describe("US2 integration – stale and expired freshness states (SH-001)", () => {
  beforeEach(() => {
    // mockReset prevents queued mockResolvedValueOnce values from the previous
    // describe block bleeding into these tests.
    vi.mocked(getCurrentAQI).mockReset();
    vi.mocked(getLocationName).mockReset();
    vi.mocked(useGeolocation).mockReset();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
  });
 
  it("shows a stale warning in the health panel when data is stale", async () => {
    vi.mocked(getCurrentAQI).mockResolvedValue(STALE_SNAPSHOT);
 
    render(<App />);
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      const alert = within(healthRegion).getByRole("alert");
      expect(alert).toHaveTextContent(/stale|outdated|older than/i);
    });
  });
 
  it("shows an expired message in the health panel when data is expired", async () => {
    vi.mocked(getCurrentAQI).mockResolvedValue(EXPIRED_SNAPSHOT);
 
    render(<App />);
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      const alert = within(healthRegion).getByRole("alert");
      expect(alert).toHaveTextContent(/expired|no longer current|data unavailable/i);
    });
  });
 
  it("does not show stale or expired warning when data is fresh", async () => {
    vi.mocked(getCurrentAQI).mockResolvedValue(GOOD_SNAPSHOT);
 
    render(<App />);
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(within(healthRegion).getByText("Air quality is good.")).toBeInTheDocument();
    });
 
    const healthRegion = screen.getByRole("region", { name: /health/i });
    expect(
      within(healthRegion).queryByRole("alert"),
    ).not.toBeInTheDocument();
  });
 
  it("updates from fresh to stale warning after refresh returns stale data", async () => {
    const user = userEvent.setup();
    vi.mocked(getCurrentAQI)
      .mockResolvedValueOnce(GOOD_SNAPSHOT)
      .mockResolvedValueOnce(STALE_SNAPSHOT);
 
    render(<App />);
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      expect(within(healthRegion).getByText("Air quality is good.")).toBeInTheDocument();
    });
 
    const healthRegionBefore = screen.getByRole("region", { name: /health/i });
    expect(within(healthRegionBefore).queryByRole("alert")).not.toBeInTheDocument();
 
    await user.click(screen.getByRole("button", { name: /refresh/i }));
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      const alert = within(healthRegion).getByRole("alert");
      expect(alert).toHaveTextContent(/stale|outdated|older than/i);
    });
  });
});
 
// ---------------------------------------------------------------------------
// DAR-003 – expired snapshot: AQI not shown as current
// ---------------------------------------------------------------------------
 
describe("US2 integration – expired snapshot handling (DAR-003)", () => {
  beforeEach(() => {
    vi.mocked(getCurrentAQI).mockReset();
    vi.mocked(getLocationName).mockReset();
    vi.mocked(useGeolocation).mockReset();
    vi.mocked(useGeolocation).mockReturnValue(GRANTED_LOCATION);
    vi.mocked(getLocationName).mockResolvedValue("London, UK");
  });
 
  it("does not label any value as current AQI when snapshot is expired", async () => {
    vi.mocked(getCurrentAQI).mockResolvedValue(EXPIRED_SNAPSHOT);
 
    render(<App />);
 
    await waitFor(() => {
      const healthRegion = screen.getByRole("region", { name: /health/i });
      const alert = within(healthRegion).getByRole("alert");
      expect(alert).toHaveTextContent(/expired|no longer current|data unavailable/i);
    });
 
    expect(screen.queryByText(/current.*aqi|aqi.*current/i)).not.toBeInTheDocument();
  });
});
 