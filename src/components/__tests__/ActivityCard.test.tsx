import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityCard } from "../organisms/ActivityCard";
import type { ActivitySafetyCheck } from "../../types/activity";

function makeCheck(overrides: Partial<ActivitySafetyCheck> = {}): ActivitySafetyCheck {
  return {
    activityType: "run",
    aqiValue: 35,
    recommendationLevel: "go_ahead",
    reason: "Air quality is good.",
    checkedAtIso: new Date().toISOString(),
    ...overrides,
  };
}

describe("ActivityCard – recommendation levels", () => {
  it("renders the Go ahead label for go_ahead", () => {
    render(<ActivityCard check={makeCheck({ recommendationLevel: "go_ahead" })} />);
    expect(screen.getByText(/go ahead/i)).toBeInTheDocument();
  });

  it("renders the Limit activity label for limit_activity", () => {
    render(<ActivityCard check={makeCheck({ recommendationLevel: "limit_activity" })} />);
    expect(screen.getByText(/limit activity/i)).toBeInTheDocument();
  });

  it("renders the Stay inside label for stay_inside", () => {
    render(<ActivityCard check={makeCheck({ recommendationLevel: "stay_inside" })} />);
    expect(screen.getByText(/stay inside/i)).toBeInTheDocument();
  });

  it("renders the plain-language reason text", () => {
    render(<ActivityCard check={makeCheck({ reason: "Custom reason text" })} />);
    expect(screen.getByText("Custom reason text")).toBeInTheDocument();
  });
});

describe("ActivityCard – icon + text, never color alone (A11Y-004/FR-005)", () => {
  it("pairs an aria-hidden icon with a visible text label for every level", () => {
    (["go_ahead", "limit_activity", "stay_inside"] as const).forEach((level) => {
      const { container, unmount } = render(
        <ActivityCard check={makeCheck({ recommendationLevel: level })} />,
      );
      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
      expect(icon?.textContent?.length ?? 0).toBeGreaterThan(0);
      unmount();
    });
  });

  it("the recommendation text is present outside the aria-hidden icon", () => {
    render(<ActivityCard check={makeCheck({ recommendationLevel: "stay_inside" })} />);
    const label = screen.getByText(/stay inside/i);
    expect(label).not.toHaveAttribute("aria-hidden", "true");
  });
});

describe("ActivityCard – large legible recommendation text (A11Y-005)", () => {
  it("renders the recommendation label with a large text size class", () => {
    render(<ActivityCard check={makeCheck({ recommendationLevel: "go_ahead" })} />);
    const label = screen.getByText(/go ahead/i);
    expect(label.className).toMatch(/text-(xl|2xl|3xl|4xl)/);
  });
});
