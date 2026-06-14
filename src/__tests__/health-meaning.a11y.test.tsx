import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HealthMeaningPanel } from "../components/organisms/HealthMeaningPanel";
import type { AirQualitySnapshot } from "../types/airQuality";
 
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
 
// ---------------------------------------------------------------------------
// A11Y-004 – category information not conveyed by color alone
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – A11Y-004: no color-only category communication", () => {
  const categories: Array<{
    categoryKey: AirQualitySnapshot["categoryKey"];
    labelPattern: RegExp;
    aqiValue: number;
  }> = [
    { categoryKey: "good", labelPattern: /good/i, aqiValue: 42 },
    { categoryKey: "moderate", labelPattern: /moderate/i, aqiValue: 75 },
    {
      categoryKey: "unhealthy_sensitive",
      labelPattern: /unhealthy for sensitive groups/i,
      aqiValue: 130,
    },
    { categoryKey: "unhealthy", labelPattern: /unhealthy/i, aqiValue: 175 },
    {
      categoryKey: "very_unhealthy",
      labelPattern: /very unhealthy/i,
      aqiValue: 250,
    },
    { categoryKey: "hazardous", labelPattern: /hazardous/i, aqiValue: 350 },
  ];
 
  it.each(categories)(
    "renders visible text label '$categoryKey' — not color alone",
    ({ categoryKey, labelPattern, aqiValue }) => {
      render(
        <HealthMeaningPanel
          snapshot={makeSnapshot({ categoryKey, aqiValue })}
        />,
      );
      // Query the badge by its aria-label to avoid matching summary/guidance text
      // that may also contain words like "good" or "unhealthy".
      const badge = screen.getByLabelText(new RegExp(`category:`, "i"));
      expect(badge).toHaveTextContent(labelPattern);
    },
  );
 
  it("renders visible text label for 'unknown' / unavailable category", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          aqiValue: null,
          categoryKey: "unknown",
          freshnessState: "expired",
          unavailableReason: "stale_over_limit",
        })}
      />,
    );
    // "Unavailable" or equivalent must appear in the badge — not only a grayed-out color.
    const badge = screen.getByLabelText(/category:/i);
    expect(badge).toHaveTextContent(/unavailable|unknown/i);
  });
});
 
// ---------------------------------------------------------------------------
// A11Y-004 – freshness state not conveyed by color alone
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – A11Y-004: no color-only freshness communication", () => {
  it("renders visible text for stale state — not color alone", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          freshnessState: "stale",
          observedAtIso: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
        })}
      />,
    );
    // Query the alert element — guidance text also contains "outdated" when stale.
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/stale|outdated|older than/i);
  });
 
  it("renders visible text for expired state — not color alone", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({
          aqiValue: null,
          freshnessState: "expired",
          unavailableReason: "stale_over_limit",
          observedAtIso: new Date(Date.now() - 185 * 60 * 1000).toISOString(),
        })}
      />,
    );
    // Query the alert element — guidance fallback also contains "unavailable".
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/expired|no longer current|data unavailable/i);
  });
 
  it("does not render stale or expired text when data is fresh", () => {
    render(
      <HealthMeaningPanel snapshot={makeSnapshot({ freshnessState: "fresh" })} />,
    );
    expect(
      screen.queryByText(/stale|outdated|expired|no longer current/i),
    ).not.toBeInTheDocument();
  });
});
 
// ---------------------------------------------------------------------------
// A11Y-002 – landmark and screen-reader structure
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – A11Y-002: screen-reader structure", () => {
  it("is wrapped in a region landmark with an accessible name", () => {
    render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    expect(
      screen.getByRole("region", { name: /health/i }),
    ).toBeInTheDocument();
  });
 
  it("region landmark aria-label is non-empty", () => {
    const { container } = render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    const region = container.querySelector('[role="region"]');
    // Must have a non-empty aria-label or aria-labelledby so SR announces context.
    const label =
      region?.getAttribute("aria-label") ??
      region?.getAttribute("aria-labelledby") ??
      "";
    expect(label.trim().length).toBeGreaterThan(0);
  });
 
  it("category label is exposed as a heading or labelled element for SR navigation", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({ categoryKey: "moderate", aqiValue: 75 })}
      />,
    );
    // Category must be findable by SR — either as a heading or via aria-label.
    const heading = screen.queryByRole("heading", { name: /moderate/i });
    const labelledEl = screen.queryByLabelText(/category/i);
    expect(heading ?? labelledEl).not.toBeNull();
  });
 
  it("health summary text is in the DOM and not aria-hidden", () => {
    render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    const summaryEl = screen.getByText("Air quality is good.");
    expect(summaryEl).not.toHaveAttribute("aria-hidden", "true");
  });
 
  it("health guidance text is in the DOM and not aria-hidden", () => {
    render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    const guidanceEl = screen.getByText(
      "Most people can continue normal outdoor activities.",
    );
    expect(guidanceEl).not.toHaveAttribute("aria-hidden", "true");
  });
 
  it("stale warning text is not aria-hidden", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({ freshnessState: "stale" })}
      />,
    );
    // Query the alert element specifically — guidance note also contains "outdated".
    const staleEl = screen.getByRole("alert");
    expect(staleEl).toHaveTextContent(/stale|outdated|older than/i);
    expect(staleEl).not.toHaveAttribute("aria-hidden", "true");
  });
 
  it("no empty aria-label attributes are present in the panel", () => {
    const { container } = render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    const emptyAriaLabels = container.querySelectorAll('[aria-label=""]');
    expect(emptyAriaLabels.length).toBe(0);
  });
});
 
// ---------------------------------------------------------------------------
// A11Y-001 – keyboard navigability of interactive elements
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – A11Y-001: keyboard navigability", () => {
  it("any interactive elements within the panel are not keyboard-trapped", () => {
    render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    // All interactive elements must be reachable — none may have tabIndex < 0
    // unless they are intentionally decorative.
    const { container } = render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    const negativeTabIndex = container.querySelectorAll(
      'button[tabindex="-1"], a[tabindex="-1"]',
    );
    expect(negativeTabIndex.length).toBe(0);
  });
});
 
// ---------------------------------------------------------------------------
// FR-010 – AQI scale label present as visible text
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – FR-010: AQI scale label as visible text", () => {
  it("renders the aqiScaleLabel as visible text, not only a tooltip or aria attribute", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({ aqiScaleLabel: "US AQI" })}
      />,
    );
    // Must be in the DOM as readable text, not hidden.
    const scaleEl = screen.getByText(/US AQI/i);
    expect(scaleEl).toBeInTheDocument();
    expect(scaleEl).not.toHaveAttribute("aria-hidden", "true");
  });
 
  it("renders EU CAQI scale label as visible text", () => {
    render(
      <HealthMeaningPanel
        snapshot={makeSnapshot({ aqiScaleLabel: "EU CAQI" })}
      />,
    );
    const scaleEl = screen.getByText(/EU CAQI/i);
    expect(scaleEl).toBeInTheDocument();
    expect(scaleEl).not.toHaveAttribute("aria-hidden", "true");
  });
});
 
// ---------------------------------------------------------------------------
// SH-003 – non-medical disclaimer present as visible text
// ---------------------------------------------------------------------------
 
describe("HealthMeaningPanel – SH-003: non-medical disclaimer", () => {
  it("renders a disclaimer that guidance is not medical advice", () => {
    render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    expect(
      screen.getByText(
        /not a substitute for.*medical|informational.*only|not medical advice/i,
      ),
    ).toBeInTheDocument();
  });
 
  it("disclaimer text is not aria-hidden", () => {
    render(<HealthMeaningPanel snapshot={makeSnapshot()} />);
    const disclaimer = screen.getByText(
      /not a substitute for.*medical|informational.*only|not medical advice/i,
    );
    expect(disclaimer).not.toHaveAttribute("aria-hidden", "true");
  });
});
 