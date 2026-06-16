import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PollutantList } from "../components/organisms/PollutantList";
import type { PollutantReading } from "../types/airQuality";
 
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
 
function makeReading(overrides: Partial<PollutantReading> = {}): PollutantReading {
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
 
const ALL_MISSING: PollutantReading[] = ALL_AVAILABLE.map((r) => ({
  ...r,
  value: null,
  availability: "missing" as const,
}));
 
const PARTIAL: PollutantReading[] = [
  makeReading({ pollutantCode: "pm2_5", displayName: "PM2.5", value: 12.5 }),
  makeReading({ pollutantCode: "pm10", displayName: "PM10", value: null, availability: "missing" }),
  makeReading({ pollutantCode: "ozone", displayName: "Ozone", value: 80.0 }),
];
 
// ---------------------------------------------------------------------------
// Landmark and list structure
// ---------------------------------------------------------------------------
 
describe("PollutantList – Landmark and list structure", () => {
  it("is wrapped in a region landmark with an accessible name", () => {
    render(<PollutantList pollutants={ALL_AVAILABLE} />);
    expect(screen.getByRole("region", { name: /pollutants/i })).toBeInTheDocument();
  });
 
  it("region landmark has a non-empty aria-label or aria-labelledby", () => {
    const { container } = render(<PollutantList pollutants={ALL_AVAILABLE} />);
    const region = container.querySelector('[role="region"]');
    const label =
      region?.getAttribute("aria-label") ??
      region?.getAttribute("aria-labelledby") ??
      "";
    expect(label.trim().length).toBeGreaterThan(0);
  });
 
  it("renders a list element for SR navigation", () => {
    render(<PollutantList pollutants={ALL_AVAILABLE} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });
 
  it("renders correct number of list items matching pollutant count", () => {
    render(<PollutantList pollutants={ALL_AVAILABLE} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(ALL_AVAILABLE.length);
  });
 
  it("renders one list item per pollutant in a partial payload", () => {
    render(<PollutantList pollutants={PARTIAL} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(PARTIAL.length);
  });
 
  it("each list item contains the pollutant display name", () => {
    render(<PollutantList pollutants={ALL_AVAILABLE} />);
    const items = screen.getAllByRole("listitem");
    const names = items.map((item) => item.textContent ?? "");
    expect(names.some((n) => n.includes("PM2.5"))).toBe(true);
    expect(names.some((n) => n.includes("Ozone"))).toBe(true);
  });
 
  it("has a heading or label identifying the section for SR users", () => {
    render(<PollutantList pollutants={ALL_AVAILABLE} />);
    // Must have either a heading inside the region or an aria-label on the region.
    const heading = screen.queryByRole("heading", { name: /pollutants/i });
    const region = screen.getByRole("region", { name: /pollutants/i });
    expect(heading ?? region).toBeInTheDocument();
  });
});
 
// ---------------------------------------------------------------------------
// Screen-reader content not hidden
// ---------------------------------------------------------------------------
 
describe("PollutantList – Screen-reader content not hidden", () => {
  it("pollutant display names are not aria-hidden", () => {
    render(<PollutantList pollutants={ALL_AVAILABLE} />);
    const pm25 = screen.getByText("PM2.5");
    expect(pm25).not.toHaveAttribute("aria-hidden", "true");
  });
 
  it("available values are not aria-hidden", () => {
    render(<PollutantList pollutants={[makeReading({ value: 12.5 })]} />);
    const value = screen.getByText("12.5");
    expect(value).not.toHaveAttribute("aria-hidden", "true");
  });
 
  it("missing markers are not aria-hidden", () => {
    render(
      <PollutantList
        pollutants={[makeReading({ value: null, availability: "missing" })]}
      />,
    );
    const marker = screen.getByText(/not available|missing|unavailable|—/i);
    expect(marker).not.toHaveAttribute("aria-hidden", "true");
  });
 
  it("units are not aria-hidden", () => {
    render(<PollutantList pollutants={[makeReading({ value: 12.5, unit: "ug/m3" })]} />);
    const unit = screen.getByText(/ug\/m3/i);
    expect(unit).not.toHaveAttribute("aria-hidden", "true");
  });
});
 
// ---------------------------------------------------------------------------
// No empty or invalid ARIA attributes
// ---------------------------------------------------------------------------
 
describe("PollutantList – No empty or invalid ARIA attributes", () => {
  it("no empty aria-label attributes are present", () => {
    const { container } = render(<PollutantList pollutants={ALL_AVAILABLE} />);
    const emptyAriaLabels = container.querySelectorAll('[aria-label=""]');
    expect(emptyAriaLabels.length).toBe(0);
  });
 
  it("no empty aria-label attributes when all values are missing", () => {
    const { container } = render(<PollutantList pollutants={ALL_MISSING} />);
    const emptyAriaLabels = container.querySelectorAll('[aria-label=""]');
    expect(emptyAriaLabels.length).toBe(0);
  });
});
 
// ---------------------------------------------------------------------------
// Keyboard navigability
// ---------------------------------------------------------------------------
 
describe("PollutantList – Keyboard navigability", () => {
  it("no interactive elements have negative tabIndex", () => {
    const { container } = render(<PollutantList pollutants={ALL_AVAILABLE} />);
    const trapped = container.querySelectorAll(
      'button[tabindex="-1"], a[tabindex="-1"]',
    );
    expect(trapped.length).toBe(0);
  });
});
 
// ---------------------------------------------------------------------------
// No color-only communication
// ---------------------------------------------------------------------------
 
describe("PollutantList – No color-only communication", () => {
  it("missing availability communicated via visible text, not color alone", () => {
    render(
      <PollutantList
        pollutants={[makeReading({ value: null, availability: "missing" })]}
      />,
    );
    expect(
      screen.getByText(/not available|missing|unavailable|—/i),
    ).toBeInTheDocument();
  });
 
  it("available value shown as visible text, not color alone", () => {
    render(<PollutantList pollutants={[makeReading({ value: 99 })]} />);
    expect(screen.getByText("99")).toBeInTheDocument();
  });
 
  it("each pollutant name is visible text in the DOM", () => {
    render(<PollutantList pollutants={ALL_AVAILABLE} />);
    expect(screen.getByText("PM2.5")).toBeInTheDocument();
    expect(screen.getByText("Carbon monoxide")).toBeInTheDocument();
  });
 
  it("missing markers present for all missing readings in all-missing state", () => {
    render(<PollutantList pollutants={ALL_MISSING} />);
    const markers = screen.getAllByText(/not available|missing|unavailable|—/i);
    expect(markers.length).toBeGreaterThanOrEqual(ALL_MISSING.length);
  });
});
 
// ---------------------------------------------------------------------------
// Partial data resilience
// ---------------------------------------------------------------------------
 
describe("PollutantList – Partial data resilience", () => {
  it("renders without error when some readings are missing", () => {
    expect(() => render(<PollutantList pollutants={PARTIAL} />)).not.toThrow();
  });
 
  it("renders without error when all readings are missing", () => {
    expect(() => render(<PollutantList pollutants={ALL_MISSING} />)).not.toThrow();
  });
 
  it("renders without error when pollutants array is empty", () => {
    expect(() => render(<PollutantList pollutants={[]} />)).not.toThrow();
  });
 
  it("does not render a list when pollutants array is empty", () => {
    render(<PollutantList pollutants={[]} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
 