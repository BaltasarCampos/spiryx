import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AQISummaryCard } from "../components/organisms/AQISummaryCard";
import { HealthMeaningPanel } from "../components/organisms/HealthMeaningPanel";
import type { AirQualitySnapshot } from "../types/airQuality";
 
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
 
const NOW_ISO = new Date().toISOString();
 
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
    pollutants: [],
    ...overrides,
  };
}
 
const FRESH_SNAPSHOT = makeSnapshot();
 
const STALE_SNAPSHOT = makeSnapshot({
  freshnessState: "stale",
  observedAtIso: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
});
 
const EXPIRED_SNAPSHOT = makeSnapshot({
  aqiValue: 42,
  freshnessState: "expired",
  unavailableReason: "stale_over_limit",
  observedAtIso: new Date(Date.now() - 185 * 60 * 1000).toISOString(),
});
 
// ---------------------------------------------------------------------------
// Fresh state — both components show full data, no warnings
// ---------------------------------------------------------------------------
 
describe("T049 – fresh state: full data, no warnings", () => {
  it("AQISummaryCard shows 'Live' badge for fresh data", () => {
    render(
      <AQISummaryCard snapshot={FRESH_SNAPSHOT} locationName="London" onRefresh={() => {}} />,
    );
    expect(screen.getByLabelText(/data freshness: live/i)).toBeInTheDocument();
  });
 
  it("AQISummaryCard shows AQI value for fresh data", () => {
    render(
      <AQISummaryCard snapshot={FRESH_SNAPSHOT} locationName="London" onRefresh={() => {}} />,
    );
    expect(screen.getByLabelText(/aqi value: 42/i)).toBeInTheDocument();
  });
 
  it("HealthMeaningPanel shows no stale/expired warning for fresh data", () => {
    render(<HealthMeaningPanel snapshot={FRESH_SNAPSHOT} />);
    expect(
      screen.queryByRole("alert"),
    ).not.toBeInTheDocument();
  });
 
  it("HealthMeaningPanel shows full guidance for fresh data", () => {
    render(<HealthMeaningPanel snapshot={FRESH_SNAPSHOT} />);
    expect(
      screen.getByText("Most people can continue normal outdoor activities."),
    ).toBeInTheDocument();
  });
});
 
// ---------------------------------------------------------------------------
// Stale state (>90 min) — both components warn, AQI still visible
// ---------------------------------------------------------------------------
 
describe("T049 – stale state (>90 min): warnings shown, AQI still visible", () => {
  it("AQISummaryCard shows 'Stale data' badge for stale data", () => {
    render(
      <AQISummaryCard snapshot={STALE_SNAPSHOT} locationName="London" onRefresh={() => {}} />,
    );
    expect(screen.getByLabelText(/data freshness: stale data/i)).toBeInTheDocument();
  });
 
  it("AQISummaryCard still shows AQI value for stale data (not yet expired)", () => {
    render(
      <AQISummaryCard snapshot={STALE_SNAPSHOT} locationName="London" onRefresh={() => {}} />,
    );
    // AQI value must still be shown — only expired hides it (DAR-003).
    expect(screen.getByLabelText(/aqi value: 42/i)).toBeInTheDocument();
  });
 
  it("HealthMeaningPanel shows stale warning alert for stale data", () => {
    render(<HealthMeaningPanel snapshot={STALE_SNAPSHOT} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/stale|outdated|older than/i);
  });
 
  it("HealthMeaningPanel still shows guidance for stale data (annotated)", () => {
    render(<HealthMeaningPanel snapshot={STALE_SNAPSHOT} />);
    // Guidance still present but annotated — not hidden entirely.
    expect(
      screen.getByText(/most people can continue|note:.*outdated/i),
    ).toBeInTheDocument();
  });
 
  it("both components consistently show stale state from the same snapshot", () => {
    const { container } = render(
      <div>
        <AQISummaryCard
          snapshot={STALE_SNAPSHOT}
          locationName="London"
          onRefresh={() => {}}
        />
        <HealthMeaningPanel snapshot={STALE_SNAPSHOT} />
      </div>,
    );
    // AQISummaryCard stale badge
    expect(screen.getByLabelText(/data freshness: stale data/i)).toBeInTheDocument();
    // HealthMeaningPanel stale alert
    const healthRegion = within(container).getByRole("region", { name: /health/i });
    expect(within(healthRegion).getByRole("alert")).toBeInTheDocument();
  });
});
 
// ---------------------------------------------------------------------------
// Expired state (>180 min) — AQI hidden, strong warnings in both
// ---------------------------------------------------------------------------
 
describe("T049 – expired state (>180 min): AQI hidden, strong warnings", () => {
  it("AQISummaryCard shows 'Data unavailable' badge for expired data", () => {
    render(
      <AQISummaryCard snapshot={EXPIRED_SNAPSHOT} locationName="London" onRefresh={() => {}} />,
    );
    expect(screen.getByLabelText(/data freshness: data unavailable/i)).toBeInTheDocument();
  });
 
  it("AQISummaryCard hides AQI value for expired data (DAR-003)", () => {
    render(
      <AQISummaryCard snapshot={EXPIRED_SNAPSHOT} locationName="London" onRefresh={() => {}} />,
    );
    // AQI value element must not be present as a current reading.
    expect(screen.queryByLabelText(/aqi value: 42/i)).not.toBeInTheDocument();
  });
 
  it("AQISummaryCard shows expired alert message", () => {
    render(
      <AQISummaryCard snapshot={EXPIRED_SNAPSHOT} locationName="London" onRefresh={() => {}} />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
 
  it("HealthMeaningPanel shows expired alert for expired data", () => {
    render(<HealthMeaningPanel snapshot={EXPIRED_SNAPSHOT} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/expired|no longer current/i);
  });
 
  it("HealthMeaningPanel hides guidance for expired data (DAR-003, SH-001)", () => {
    render(<HealthMeaningPanel snapshot={EXPIRED_SNAPSHOT} />);
    // Normal guidance must not appear as a current recommendation.
    expect(
      screen.queryByText("Most people can continue normal outdoor activities."),
    ).not.toBeInTheDocument();
  });
 
  it("refresh button remains available when data is expired (FR-012)", () => {
    render(
      <AQISummaryCard snapshot={EXPIRED_SNAPSHOT} locationName="London" onRefresh={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: /refresh/i }),
    ).not.toBeDisabled();
  });
 
  it("both components consistently show expired state from the same snapshot", () => {
    const { container } = render(
      <div>
        <AQISummaryCard
          snapshot={EXPIRED_SNAPSHOT}
          locationName="London"
          onRefresh={() => {}}
        />
        <HealthMeaningPanel snapshot={EXPIRED_SNAPSHOT} />
      </div>,
    );
    // AQISummaryCard expired alert
    const summaryRegion = within(container).getByRole("region", {
      name: /air quality index/i,
    });
    expect(within(summaryRegion).getByRole("alert")).toBeInTheDocument();
    // HealthMeaningPanel expired alert
    const healthRegion = within(container).getByRole("region", { name: /health/i });
    expect(within(healthRegion).getByRole("alert")).toBeInTheDocument();
  });
});
 