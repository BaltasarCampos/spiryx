import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivitySafetyChecker } from "../organisms/ActivitySafetyChecker";

describe("ActivitySafetyChecker – buttons", () => {
  it("renders a button for each provided activity", () => {
    render(<ActivitySafetyChecker activities={["run", "cycle"]} aqiValue={35} />);
    expect(screen.getByRole("button", { name: /safe to run\?/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /safe to cycle\?/i })).toBeInTheDocument();
  });

  it("does not render a button for an activity not in the list", () => {
    render(<ActivitySafetyChecker activities={["run"]} aqiValue={35} />);
    expect(screen.queryByRole("button", { name: /safe to cycle\?/i })).not.toBeInTheDocument();
  });

  it("does not show a result before any button is tapped", () => {
    render(<ActivitySafetyChecker activities={["run", "cycle"]} aqiValue={35} />);
    expect(screen.queryByText(/go ahead|limit activity|stay inside/i)).not.toBeInTheDocument();
  });
});

describe("ActivitySafetyChecker – tapping a button renders the matching result", () => {
  it("shows the Go ahead result after tapping Safe to Run? at a good AQI", async () => {
    const user = userEvent.setup();
    render(<ActivitySafetyChecker activities={["run", "cycle"]} aqiValue={35} />);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    expect(screen.getByText(/go ahead/i)).toBeInTheDocument();
  });

  it("shows the Stay inside result after tapping Safe to Cycle? at a high AQI", async () => {
    const user = userEvent.setup();
    render(<ActivitySafetyChecker activities={["run", "cycle"]} aqiValue={175} />);
    await user.click(screen.getByRole("button", { name: /safe to cycle\?/i }));
    expect(screen.getByText(/stay inside/i)).toBeInTheDocument();
  });

  it("switches the displayed result when a different activity button is tapped", async () => {
    const user = userEvent.setup();
    render(<ActivitySafetyChecker activities={["run", "cycle"]} aqiValue={120} />);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    expect(screen.getByText(/limit activity/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /safe to cycle\?/i }));
    expect(screen.getByText(/limit activity/i)).toBeInTheDocument();
  });
});
