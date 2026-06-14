import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthMeaningPanel } from "../organisms/HealthMeaningPanel";
import type { AirQualitySnapshot } from "../../types/airQuality";
 
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
 
const NOW_ISO = new Date().toISOString();
 
function makeSnapshot(
  overrides: Partial<AirQualitySnapshot> = {},
): AirQualitySnapshot {
  return {
    sourceProvider: "Open-Meteo",
    sourceUrl: "https://air-quality-api.open-meteo.com",
    fetchedAtIso: NOW_ISO,
    observedAtIso: NOW_ISO,
    latitude: 51.45,
    longitude: -2.59,
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
 
// ---------------------------------------------------------------------------
// Rendering – category label and plain-language content
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – category label and content", () => {
  it("renders the health category label for 'good'", () => {
    render(<HealthMeaningPanel snapshot={makeSnapshot({ categoryKey: "good" })} />);
    // Query by aria-label to target the badge specifically, not the summary text.
    expect(
      screen.getByLabelText(/category: good/i),
    ).toBeInTheDocument();
  });
 
  it("renders the healthSummary text from the snapshot", () => {
    render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    expect(
      screen.getByText("Air quality is good."),
    ).toBeInTheDocument();
  });
 
  it("renders the healthGuidance text from the snapshot", () => {
    render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    expect(
      screen.getByText("Most people can continue normal outdoor activities."),
    ).toBeInTheDocument();
  });
 
  it("renders category label for 'moderate'", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          aqiValue: 75,
          categoryKey: "moderate",
          healthSummary: "Air quality is acceptable for most people.",
          healthGuidance:
            "Unusually sensitive people may want to reduce prolonged outdoor exertion.",
        })}
      />,
    );
    expect(screen.getByText(/moderate/i)).toBeInTheDocument();
  });
 
  it("renders category label for 'unhealthy_sensitive'", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          aqiValue: 130,
          categoryKey: "unhealthy_sensitive",
          healthSummary: "Sensitive groups may experience health effects.",
          healthGuidance:
            "Children, older adults, and people with respiratory conditions should limit extended outdoor activity.",
        })}
      />,
    );
    expect(
      screen.getByText(/unhealthy for sensitive groups/i),
    ).toBeInTheDocument();
  });
 
  it("renders category label for 'unhealthy'", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          aqiValue: 175,
          categoryKey: "unhealthy",
          healthSummary: "Air pollution may affect everyone.",
          healthGuidance: "Reduce intense outdoor activity.",
        })}
      />,
    );
    expect(screen.getByText(/unhealthy/i)).toBeInTheDocument();
  });
 
  it("renders category label for 'very_unhealthy'", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          aqiValue: 250,
          categoryKey: "very_unhealthy",
          healthSummary: "Health alert conditions are likely.",
          healthGuidance: "Avoid prolonged or heavy outdoor exertion.",
        })}
      />,
    );
    expect(screen.getByText(/very unhealthy/i)).toBeInTheDocument();
  });
 
  it("renders category label for 'hazardous'", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          aqiValue: 350,
          categoryKey: "hazardous",
          healthSummary: "Emergency health conditions may be present.",
          healthGuidance: "Stay indoors when possible.",
        })}
      />,
    );
    expect(screen.getByText(/hazardous/i)).toBeInTheDocument();
  });
});
 
// ---------------------------------------------------------------------------
// Content updates when category changes
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – category change on refresh", () => {
  it("shows updated summary when snapshot changes to a worse category", () => {
    const { rerender } = render(
      <HealthMeaningPanel snapshot={makeSnapshot({ categoryKey: "good" })} />,
    );
 
    expect(screen.getByText("Air quality is good.")).toBeInTheDocument();
 
    rerender(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          aqiValue: 175,
          categoryKey: "unhealthy",
          healthSummary: "Air pollution may affect everyone.",
          healthGuidance: "Reduce intense outdoor activity.",
        })}
      />,
    );
 
    expect(
      screen.getByText("Air pollution may affect everyone."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Air quality is good."),
    ).not.toBeInTheDocument();
  });
 
  it("shows updated guidance when snapshot changes to a worse category", () => {
    const { rerender } = render(
      <HealthMeaningPanel snapshot={makeSnapshot({ categoryKey: "good" })} />,
    );
 
    rerender(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          aqiValue: 175,
          categoryKey: "unhealthy",
          healthSummary: "Air pollution may affect everyone.",
          healthGuidance: "Reduce intense outdoor activity.",
        })}
      />,
    );
 
    expect(
      screen.getByText("Reduce intense outdoor activity."),
    ).toBeInTheDocument();
  });
 
  it("shows updated guidance when snapshot improves to a better category", () => {
    const { rerender } = render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          aqiValue: 175,
          categoryKey: "unhealthy",
          healthSummary: "Air pollution may affect everyone.",
          healthGuidance: "Reduce intense outdoor activity.",
        })}
      />,
    );
 
    rerender(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          aqiValue: 30,
          categoryKey: "good",
          healthSummary: "Air quality is good.",
          healthGuidance: "Most people can continue normal outdoor activities.",
        })}
      />,
    );
 
    expect(
      screen.getByText("Most people can continue normal outdoor activities."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Reduce intense outdoor activity."),
    ).not.toBeInTheDocument();
  });
});
 
// ---------------------------------------------------------------------------
// Conservative guidance override for stale and expired data
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – conservative override for stale/expired", () => {
  it("shows a stale-data warning when freshnessState is 'stale'", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({ freshnessState: "stale" })}
      />,
    );
    // Query the alert element specifically — guidance text also contains "outdated"
    // when stale, so getByText would find multiple matches.
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/stale|outdated|older than/i);
  });
 
  it("does not present AQI guidance as current when freshnessState is 'expired'", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          freshnessState: "expired",
          aqiValue: 42,
          categoryKey: "good",
          healthGuidance: "Most people can continue normal outdoor activities.",
        })}
      />,
    );
    // Guidance from an expired snapshot must not be shown without qualification.
    // The panel must either hide the guidance or annotate it as expired.
    const guidanceEl = screen.queryByText(
      "Most people can continue normal outdoor activities.",
    );
    if (guidanceEl) {
      // If guidance is still rendered it must be accompanied by an expired warning.
      expect(
        screen.getByText(/expired|no longer current|data unavailable/i),
      ).toBeInTheDocument();
    } else {
      // Guidance is hidden entirely — also acceptable.
      expect(guidanceEl).toBeNull();
    }
  });
 
  it("shows an expired-data message when freshnessState is 'expired'", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({ freshnessState: "expired" })}
      />,
    );
    // Query the alert element specifically — the guidance fallback also contains
    // "unavailable", so getByText would find multiple matches.
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/expired|no longer current|data unavailable/i);
  });
 
  it("does not show stale/expired warning when freshnessState is 'fresh'", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({ freshnessState: "fresh" })}
      />,
    );
    expect(
      screen.queryByText(/stale|outdated|expired|no longer current/i),
    ).not.toBeInTheDocument();
  });
});
 
// ---------------------------------------------------------------------------
// AQI scale disclosure
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – AQI scale disclosure", () => {
  it("renders the aqiScaleLabel from the snapshot", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({ aqiScaleLabel: "US AQI" })}
      />,
    );
    expect(screen.getByText(/US AQI/i)).toBeInTheDocument();
  });
 
  it("renders EU CAQI scale label when that scale is in use", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({ aqiScaleLabel: "EU CAQI" })}
      />,
    );
    expect(screen.getByText(/EU CAQI/i)).toBeInTheDocument();
  });
 
  it("includes a non-medical disclaimer near the guidance", () => {
    // SH-003: guidance must not be interpreted as medical diagnosis.
    render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    expect(
      screen.getByText(
        /not a substitute for.*medical|informational.*only|not medical advice/i,
      ),
    ).toBeInTheDocument();
  });
});
 
// ---------------------------------------------------------------------------
// Accessibility: SR labels, no color-only meaning
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – accessibility", () => {
  it("has a region or section landmark with an accessible label", () => {
    render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    // Must have an accessible region so screen readers can navigate to it.
    const region = screen.getByRole("region", { name: /health/i });
    expect(region).toBeInTheDocument();
  });
 
  it("exposes the category key as a visible text label, not color alone", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({ categoryKey: "unhealthy" })}
      />,
    );
    // A11Y-004: information must not be conveyed by color alone.
    // Text label for category must be present in the DOM.
    expect(screen.getByText(/unhealthy/i)).toBeInTheDocument();
  });
 
  it("renders a data-freshness indicator with a text description for screen readers", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({ freshnessState: "stale" })}
      />,
    );
    // Stale state must have visible text — not only a color change.
    // Query the alert element to avoid matching the guidance note which also
    // contains "outdated" when stale.
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/stale|outdated|older than/i);
  });
 
  it("does not rely on placeholder or empty aria-label for the panel", () => {
    const { container } = render(
      <HealthMeaningPanel snapshot={makeSnapshot()} />,
    );
    const emptyAriaLabels = container.querySelectorAll('[aria-label=""]');
    expect(emptyAriaLabels.length).toBe(0);
  });
});
 
// ---------------------------------------------------------------------------
// Expired snapshot must not show AQI as current
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – expired data must not show AQI as current", () => {
  it("does not display the AQI value prominently as a current reading when expired", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          freshnessState: "expired",
          aqiValue: 42,
        })}
      />,
    );
    // If the AQI value appears, it must not be labelled as "current".
    const currentLabel = screen.queryByText(/current.*42|42.*current/i);
    expect(currentLabel).toBeNull();
  });
});