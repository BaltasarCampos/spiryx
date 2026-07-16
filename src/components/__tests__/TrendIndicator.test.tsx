import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrendIndicator } from "../organisms/TrendIndicator";
import type { TrendSnapshot } from "../../types/activity";

function makeTrend(overrides: Partial<TrendSnapshot> = {}): TrendSnapshot {
  return {
    currentValue: 112.5,
    previousValue: 100,
    percentChange: 12.5,
    direction: "worsening",
    ...overrides,
  };
}

describe("TrendIndicator", () => {
  it("renders the worsening direction as text with the percent change", () => {
    render(<TrendIndicator trend={makeTrend()} />);
    expect(screen.getByText("Worsening")).toBeInTheDocument();
    expect(
      screen.getByText(/up 12\.5% from the previous reading/i),
    ).toBeInTheDocument();
  });

  it("renders the improving direction with the unsigned percent change", () => {
    render(
      <TrendIndicator
        trend={makeTrend({ currentValue: 50, percentChange: -50, direction: "improving" })}
      />,
    );
    expect(screen.getByText("Improving")).toBeInTheDocument();
    expect(
      screen.getByText(/down 50% from the previous reading/i),
    ).toBeInTheDocument();
  });

  it("renders the stable direction with the percent change", () => {
    render(
      <TrendIndicator
        trend={makeTrend({ currentValue: 101, percentChange: 1, direction: "stable" })}
      />,
    );
    expect(screen.getByText("Stable")).toBeInTheDocument();
    expect(
      screen.getByText(/changed 1% from the previous reading/i),
    ).toBeInTheDocument();
  });

  it("marks the direction symbol as decorative for assistive technology", () => {
    render(<TrendIndicator trend={makeTrend()} />);
    expect(screen.getByText("▲")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a distinct symbol per direction", () => {
    const { rerender } = render(
      <TrendIndicator
        trend={makeTrend({ percentChange: -50, direction: "improving" })}
      />,
    );
    expect(screen.getByText("▼")).toBeInTheDocument();
    rerender(
      <TrendIndicator trend={makeTrend({ percentChange: 0, direction: "stable" })} />,
    );
    expect(screen.getByText("→")).toBeInTheDocument();
  });

  it("renders nothing when there is no previous reading yet", () => {
    const { container } = render(<TrendIndicator trend={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
