import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PollutantList } from "../organisms/PollutantList";
import type { PollutantReading } from "../../types/airQuality";
 
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
 
function makeReading(
  overrides: Partial<PollutantReading> = {},
): PollutantReading {
  return {
    pollutantCode: "pm2_5",
    displayName: "PM2.5",
    value: 12.5,
    unit: "ug/m3",
    availability: "available",
    ...overrides,
  };
}
 
const ALL_AVAILABLE: PollutantReading[] = [
  makeReading({ pollutantCode: "pm2_5", displayName: "PM2.5", value: 12.5 }),
  makeReading({ pollutantCode: "pm10", displayName: "PM10", value: 20.0 }),
  makeReading({ pollutantCode: "ozone", displayName: "Ozone", value: 80.0 }),
  makeReading({ pollutantCode: "no2", displayName: "Nitrogen dioxide", value: 15.0 }),
  makeReading({ pollutantCode: "so2", displayName: "Sulfur dioxide", value: 5.0 }),
  makeReading({ pollutantCode: "co", displayName: "Carbon monoxide", value: 200.0 }),
];
 
const PARTIAL: PollutantReading[] = [
  makeReading({ pollutantCode: "pm2_5", displayName: "PM2.5", value: 12.5 }),
  makeReading({ pollutantCode: "pm10", displayName: "PM10", value: null, availability: "missing" }),
  makeReading({ pollutantCode: "ozone", displayName: "Ozone", value: 80.0 }),
  makeReading({ pollutantCode: "no2", displayName: "Nitrogen dioxide", value: null, availability: "missing" }),
  makeReading({ pollutantCode: "so2", displayName: "Sulfur dioxide", value: 5.0 }),
  makeReading({ pollutantCode: "co", displayName: "Carbon monoxide", value: null, availability: "missing" }),
];
 
const ALL_MISSING: PollutantReading[] = ALL_AVAILABLE.map((r) => ({
  ...r,
  value: null,
  availability: "missing" as const,
}));
 
// ---------------------------------------------------------------------------
// Rendering – available readings
// ---------------------------------------------------------------------------
 
describe("PollutantList – available readings", () => {
  it("renders the display name for each pollutant", () => {
    render(<PollutantList pollutants={ALL_AVAILABLE} />);
    expect(screen.getByText("PM2.5")).toBeInTheDocument();
    expect(screen.getByText("PM10")).toBeInTheDocument();
    expect(screen.getByText("Ozone")).toBeInTheDocument();
    expect(screen.getByText("Nitrogen dioxide")).toBeInTheDocument();
    expect(screen.getByText("Sulfur dioxide")).toBeInTheDocument();
    expect(screen.getByText("Carbon monoxide")).toBeInTheDocument();
  });
 
  it("renders the numeric value for an available reading", () => {
    render(<PollutantList pollutants={[makeReading({ value: 12.5 })]} />);
    expect(screen.getByText("12.5")).toBeInTheDocument();
  });
 
  it("renders the unit for each available reading", () => {
    render(<PollutantList pollutants={[makeReading({ value: 12.5, unit: "ug/m3" })]} />);
    expect(screen.getByText(/ug\/m3/i)).toBeInTheDocument();
  });
 
  it("renders zero as a valid available value, not as missing", () => {
    render(
      <PollutantList pollutants={[makeReading({ value: 0, availability: "available" })]} />,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText(/not available|missing|unavailable/i)).not.toBeInTheDocument();
  });
});
 
// ---------------------------------------------------------------------------
// Rendering – missing values
// ---------------------------------------------------------------------------
 
describe("PollutantList – missing value markers", () => {
  it("renders an explicit missing marker when availability is 'missing'", () => {
    render(
      <PollutantList pollutants={[makeReading({ value: null, availability: "missing" })]} />,
    );
    expect(
      screen.getByText(/not available|missing|unavailable|—/i),
    ).toBeInTheDocument();
  });
 
  it("does not render a numeric value when availability is 'missing'", () => {
    render(
      <PollutantList pollutants={[makeReading({ value: null, availability: "missing" })]} />,
    );
    expect(screen.queryByText(/^\d+(\.\d+)?$/)).not.toBeInTheDocument();
  });
 
  it("renders missing marker for each missing reading in a partial payload", () => {
    render(<PollutantList pollutants={PARTIAL} />);
    const missingMarkers = screen.getAllByText(/not available|missing|unavailable|—/i);
    expect(missingMarkers.length).toBeGreaterThanOrEqual(3);
  });
 
  it("renders available values alongside missing markers in a partial payload", () => {
    render(<PollutantList pollutants={PARTIAL} />);
    expect(screen.getByText("12.5")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
 
  it("renders all missing markers when all readings are missing", () => {
    render(<PollutantList pollutants={ALL_MISSING} />);
    const missingMarkers = screen.getAllByText(/not available|missing|unavailable|—/i);
    expect(missingMarkers.length).toBeGreaterThanOrEqual(6);
  });
 
  it("does not crash when all readings are missing (DAR-004)", () => {
    expect(() => render(<PollutantList pollutants={ALL_MISSING} />)).not.toThrow();
  });
});
 
// ---------------------------------------------------------------------------
// Rendering – empty list
// ---------------------------------------------------------------------------
 
describe("PollutantList – empty pollutants array", () => {
  it("does not crash when pollutants array is empty", () => {
    expect(() => render(<PollutantList pollutants={[]} />)).not.toThrow();
  });
 
  it("renders an empty-state message when pollutants array is empty", () => {
    render(<PollutantList pollutants={[]} />);
    expect(
      screen.getByText(/no pollutant data|pollutant data unavailable/i),
    ).toBeInTheDocument();
  });
});
 
// ---------------------------------------------------------------------------
// Accessibility: screen-reader structure
// ---------------------------------------------------------------------------
 
describe("PollutantList: screen-reader structure", () => {
  it("is wrapped in a region landmark with an accessible name", () => {
    render(<PollutantList pollutants={ALL_AVAILABLE} />);
    expect(screen.getByRole("region", { name: /pollutants/i })).toBeInTheDocument();
  });
 
  it("region landmark aria-label is non-empty", () => {
    const { container } = render(<PollutantList pollutants={ALL_AVAILABLE} />);
    const region = container.querySelector('[role="region"]');
    const label =
      region?.getAttribute("aria-label") ??
      region?.getAttribute("aria-labelledby") ??
      "";
    expect(label.trim().length).toBeGreaterThan(0);
  });
 
  it("renders pollutant entries in a list structure", () => {
    render(<PollutantList pollutants={ALL_AVAILABLE} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });
 
  it("each pollutant is a list item", () => {
    render(<PollutantList pollutants={ALL_AVAILABLE} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(ALL_AVAILABLE.length);
  });
 
  it("missing marker text is not aria-hidden", () => {
    render(
      <PollutantList pollutants={[makeReading({ value: null, availability: "missing" })]} />,
    );
    const marker = screen.getByText(/not available|missing|unavailable|—/i);
    expect(marker).not.toHaveAttribute("aria-hidden", "true");
  });
 
  it("no empty aria-label attributes are present", () => {
    const { container } = render(<PollutantList pollutants={ALL_AVAILABLE} />);
    const emptyAriaLabels = container.querySelectorAll('[aria-label=""]');
    expect(emptyAriaLabels.length).toBe(0);
  });
});
 
// ---------------------------------------------------------------------------
// Accessibility: no color-only communication
// ---------------------------------------------------------------------------
 
describe("PollutantList: no color-only communication", () => {
  it("missing state communicated via text, not color alone", () => {
    render(
      <PollutantList pollutants={[makeReading({ value: null, availability: "missing" })]} />,
    );
    expect(
      screen.getByText(/not available|missing|unavailable|—/i),
    ).toBeInTheDocument();
  });
 
  it("available state shows a numeric value as text — not color alone", () => {
    render(<PollutantList pollutants={[makeReading({ value: 42 })]} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
 