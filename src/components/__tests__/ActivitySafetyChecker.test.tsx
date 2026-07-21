import { beforeEach, describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivitySafetyChecker } from "../organisms/ActivitySafetyChecker";

// Checks are recorded to localStorage; isolate each test's history.
beforeEach(() => {
  localStorage.clear();
});

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

describe("ActivitySafetyChecker – quick-access history", () => {
  it("omits the history section when no activity has been checked yet", () => {
    render(<ActivitySafetyChecker activities={["run", "cycle", "kids"]} aqiValue={35} />);
    expect(screen.queryByText(/recently checked/i)).not.toBeInTheDocument();
  });

  it("adds a quick-access entry after an activity is checked", async () => {
    const user = userEvent.setup();
    render(<ActivitySafetyChecker activities={["run", "cycle", "kids"]} aqiValue={35} />);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    const list = screen.getByRole("list", { name: /recently checked/i });
    expect(within(list).getByRole("button", { name: /running/i })).toBeInTheDocument();
  });

  it("does not add consecutive duplicate entries for the same activity", async () => {
    const user = userEvent.setup();
    render(<ActivitySafetyChecker activities={["run", "cycle", "kids"]} aqiValue={35} />);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    const list = screen.getByRole("list", { name: /recently checked/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  });

  it("shows one entry per checked activity, up to all three", async () => {
    const user = userEvent.setup();
    render(<ActivitySafetyChecker activities={["run", "cycle", "kids"]} aqiValue={35} />);
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    await user.click(screen.getByRole("button", { name: /safe to cycle\?/i }));
    await user.click(screen.getByRole("button", { name: /safe for kids\?/i }));
    const list = screen.getByRole("list", { name: /recently checked/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("re-evaluates a history entry against the latest AQI, not the stored result", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ActivitySafetyChecker activities={["run", "cycle", "kids"]} aqiValue={35} />,
    );
    await user.click(screen.getByRole("button", { name: /safe to run\?/i }));
    expect(screen.getByText(/go ahead/i)).toBeInTheDocument();

    // Air quality worsens before the user reopens the same check.
    rerender(<ActivitySafetyChecker activities={["run", "cycle", "kids"]} aqiValue={175} />);
    const list = screen.getByRole("list", { name: /recently checked/i });
    await user.click(within(list).getByRole("button", { name: /running/i }));
    expect(screen.getByText(/stay inside/i)).toBeInTheDocument();
    expect(screen.queryByText(/go ahead/i)).not.toBeInTheDocument();
  });
});
