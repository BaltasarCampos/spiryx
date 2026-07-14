/**
 * Accessibility tests for the Run/Cycle Activity Safety Check flow
 * (A11Y-001 keyboard operability, A11Y-002 screen-reader compatibility).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ActivitySafetyChecker } from "../components/organisms/ActivitySafetyChecker";
import { ActivityCard } from "../components/organisms/ActivityCard";
import type { ActivitySafetyCheck } from "../types/activity";

describe("ActivitySafetyChecker – keyboard operability (A11Y-001)", () => {
  it("activity buttons are not disabled and are reachable via Tab", async () => {
    const user = userEvent.setup();
    render(<ActivitySafetyChecker activities={["run", "cycle"]} aqiValue={35} />);

    const runButton = screen.getByRole("button", { name: /safe to run\?/i });
    const cycleButton = screen.getByRole("button", { name: /safe to cycle\?/i });
    expect(runButton).not.toBeDisabled();
    expect(cycleButton).not.toBeDisabled();

    await user.tab();
    expect(runButton).toHaveFocus();
    await user.tab();
    expect(cycleButton).toHaveFocus();
  });

  it("a button can be activated via the keyboard (Enter)", async () => {
    const user = userEvent.setup();
    render(<ActivitySafetyChecker activities={["run", "cycle"]} aqiValue={35} />);

    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/go ahead/i)).toBeInTheDocument();
  });
});

describe("ActivitySafetyChecker – screen-reader compatible result (A11Y-002)", () => {
  it("the result region is announced via a live region", async () => {
    const user = userEvent.setup();
    render(<ActivitySafetyChecker activities={["run"]} aqiValue={35} />);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("ActivitySafetyChecker – Kids check flow (US2)", () => {
  it("the Kids button is not disabled and is reachable via Tab", async () => {
    const user = userEvent.setup();
    render(<ActivitySafetyChecker activities={["run", "cycle", "kids"]} aqiValue={75} />);

    const kidsButton = screen.getByRole("button", { name: /safe for kids\?/i });
    expect(kidsButton).not.toBeDisabled();

    await user.tab();
    await user.tab();
    await user.tab();
    expect(kidsButton).toHaveFocus();
  });

  it("the Kids button can be activated via the keyboard and announces its result via a live region", async () => {
    const user = userEvent.setup();
    render(<ActivitySafetyChecker activities={["kids"]} aqiValue={75} />);

    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/limit activity/i)).toBeInTheDocument();
  });
});

describe("ActivityCard – screen-reader compatible result (A11Y-002)", () => {
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

  it("uses a live region so assistive tech announces the result without focus change", () => {
    render(<ActivityCard check={makeCheck()} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("the reason text is not aria-hidden", () => {
    render(<ActivityCard check={makeCheck({ reason: "Some reason" })} />);
    expect(screen.getByText("Some reason")).not.toHaveAttribute("aria-hidden", "true");
  });
});
