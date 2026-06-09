/**
 * T023 – US1 accessibility tests.
 *
 * Verifies ARIA roles, labels, and live-region announcements for the
 * AQI summary card, status panels, and retry controls.
 * Will fail until AQISummaryCard and LocationGate are implemented.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AQISummaryCard } from "../components/organisms/AQISummaryCard";
import { LocationGate } from "../components/organisms/LocationGate";
import { StatusPanel } from "../components/molecules/StatusPanel";
import type { AirQualitySnapshot } from "../types/airQuality";

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

describe("AQISummaryCard – ARIA and roles", () => {
  it("is wrapped in a landmark section", () => {
    render(
      <AQISummaryCard
        snapshot={MOCK_SNAPSHOT}
        locationName="London, UK"
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole("region", { name: /air quality index/i })).toBeInTheDocument();
  });

  it("heading is accessible by role", () => {
    render(
      <AQISummaryCard
        snapshot={MOCK_SNAPSHOT}
        locationName="London, UK"
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: /air quality index/i })).toBeInTheDocument();
  });

  it("AQI value element has an accessible label that includes the value", () => {
    render(
      <AQISummaryCard
        snapshot={MOCK_SNAPSHOT}
        locationName="London, UK"
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/aqi value: 42/i)).toBeInTheDocument();
  });

  it("the observed timestamp is a <time> element", () => {
    render(
      <AQISummaryCard
        snapshot={MOCK_SNAPSHOT}
        locationName="London, UK"
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole("time")).toBeInTheDocument();
  });

  it("the <time> element has a dateTime attribute matching observedAtIso", () => {
    render(
      <AQISummaryCard
        snapshot={MOCK_SNAPSHOT}
        locationName="London, UK"
        onRefresh={vi.fn()}
      />,
    );
    const timeEl = screen.getByRole("time");
    expect(timeEl).toHaveAttribute("dateTime", MOCK_SNAPSHOT.observedAtIso);
  });

  it("refresh button has an accessible label", () => {
    render(
      <AQISummaryCard
        snapshot={MOCK_SNAPSHOT}
        locationName="London, UK"
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /refresh air quality data/i })).toBeInTheDocument();
  });

  it("freshness badge has an accessible label that communicates freshness state", () => {
    render(
      <AQISummaryCard
        snapshot={MOCK_SNAPSHOT}
        locationName="London, UK"
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/data freshness/i)).toBeInTheDocument();
  });

  it("location name has an accessible label", () => {
    render(
      <AQISummaryCard
        snapshot={MOCK_SNAPSHOT}
        locationName="London, UK"
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/location:/i)).toBeInTheDocument();
  });

  it("health information is not conveyed by color alone (text is present)", () => {
    render(
      <AQISummaryCard
        snapshot={MOCK_SNAPSHOT}
        locationName="London, UK"
        onRefresh={vi.fn()}
      />,
    );
    // Category label or health summary text must be present alongside the color ring
    expect(screen.getByText(/air quality is good/i)).toBeInTheDocument();
  });

  it("source link has visible text (not icon-only)", () => {
    render(
      <AQISummaryCard
        snapshot={MOCK_SNAPSHOT}
        locationName="London, UK"
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /open-meteo/i })).toBeInTheDocument();
  });
});

describe("LocationGate – denied state ARIA", () => {
  it("denied panel has role='alert' for immediate announcement", () => {
    render(
      <LocationGate
        permissionStatus="denied"
        isLoading={false}
        errorMessage={null}
        onRetry={vi.fn()}
      >
        <p>content</p>
      </LocationGate>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("retry button is keyboard-focusable (not disabled by default)", () => {
    render(
      <LocationGate
        permissionStatus="denied"
        isLoading={false}
        errorMessage={null}
        onRetry={vi.fn()}
      >
        <p>content</p>
      </LocationGate>,
    );
    const button = screen.getByRole("button", { name: /try again/i });
    expect(button).not.toBeDisabled();
  });
});

describe("StatusPanel – ARIA live regions", () => {
  it("renders role='status' for informational tone", () => {
    render(<StatusPanel title="Info" message="All good" tone="info" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders role='alert' for error tone", () => {
    render(<StatusPanel title="Error" message="Something went wrong" tone="error" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders role='alert' for warning tone", () => {
    render(<StatusPanel title="Warning" message="Stale data" tone="warning" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
