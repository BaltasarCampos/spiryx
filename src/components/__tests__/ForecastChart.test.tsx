/**
 * ForecastChart component contract: chart + sr-only table fallback,
 * best-hour distinction, "View as table" toggle, and fetched-at/source
 * disclosure.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ForecastChart } from "../organisms/ForecastChart";
import type { ForecastWindow, HourlyForecastPoint } from "../../types/activity";

const HOUR_MS = 3_600_000;
const BASE_TIME = Date.UTC(2026, 6, 14, 12);
const FETCHED_AT_ISO = new Date(BASE_TIME).toISOString();

function makePoint(hourOffset: number, aqiValue: number | null): HourlyForecastPoint {
  const isGood = aqiValue !== null && aqiValue <= 50;
  return {
    timeIso: new Date(BASE_TIME + hourOffset * HOUR_MS).toISOString(),
    aqiValue,
    categoryKey: aqiValue === null ? "unknown" : isGood ? "good" : "unhealthy_sensitive",
    isBestHour: isGood,
  };
}

function makeWindow(values: (number | null)[], overrides: Partial<ForecastWindow> = {}): ForecastWindow {
  const points = values.map((value, i) => makePoint(i, value));
  return {
    points,
    requestedHours: 48,
    coveredHours: points.length,
    isIncomplete: points.length < 48,
    nextBestHourIso: null,
    ...overrides,
  };
}

const FULL_WINDOW = makeWindow(Array.from({ length: 48 }, (_, i) => (i < 6 ? 120 : 42)));

describe("ForecastChart – chart and table fallback", () => {
  it("renders a heading for the 48-hour forecast", () => {
    render(<ForecastChart forecast={FULL_WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    expect(screen.getByRole("heading", { name: /48-hour forecast/i })).toBeInTheDocument();
  });

  it("hides the chart visual from assistive technology", () => {
    render(<ForecastChart forecast={FULL_WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    expect(screen.getByTestId("forecast-chart-visual")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a screen-reader table fallback with one row per forecast hour", () => {
    render(<ForecastChart forecast={FULL_WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    const table = screen.getByRole("table");
    expect(table.className).toMatch(/sr-only/);
    // 48 data rows + 1 header row
    expect(within(table).getAllByRole("row")).toHaveLength(49);
  });

  it("exposes each hour's time, AQI value, and category in the table", () => {
    const window = makeWindow([120, 42, null]);
    render(<ForecastChart forecast={window} fetchedAtIso={FETCHED_AT_ISO} />);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");

    const goodRow = rows[2];
    expect(goodRow.querySelector(`time[datetime="${window.points[1].timeIso}"]`)).not.toBeNull();
    expect(within(goodRow).getByText("42")).toBeInTheDocument();
    expect(within(goodRow).getByText(/good/i)).toBeInTheDocument();
  });

  it("renders a null hour as unavailable rather than fabricating a value", () => {
    render(<ForecastChart forecast={makeWindow([120, null])} fetchedAtIso={FETCHED_AT_ISO} />);
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(within(rows[2]).getByText("—")).toBeInTheDocument();
    expect(within(rows[2]).getByText(/unavailable/i)).toBeInTheDocument();
  });

  it("marks best hours in the table", () => {
    render(<ForecastChart forecast={makeWindow([120, 42, 40, 130])} fetchedAtIso={FETCHED_AT_ISO} />);
    expect(screen.getAllByText(/best hour/i).length).toBeGreaterThanOrEqual(2);
  });
});

describe("ForecastChart – View as table toggle", () => {
  // Interacting with the 48-row table can be slow on a loaded machine.
  it("reveals the table visually when toggled and hides it again on a second press", { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    render(<ForecastChart forecast={FULL_WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);

    const toggle = screen.getByRole("button", { name: /view as table/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("table").className).not.toMatch(/sr-only/);

    await user.click(toggle);
    expect(screen.getByRole("table").className).toMatch(/sr-only/);
  });
});

describe("ForecastChart – incomplete forecast disclosure", () => {
  it("states the covered hours when fewer than 48 are available", () => {
    render(
      <ForecastChart
        forecast={makeWindow(Array.from({ length: 30 }, () => 42))}
        fetchedAtIso={FETCHED_AT_ISO}
      />,
    );
    expect(screen.getByText(/30 of the next 48 hours/i)).toBeInTheDocument();
  });

  it("shows no coverage caveat for a complete window", () => {
    render(<ForecastChart forecast={FULL_WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    expect(screen.queryByText(/of the next 48 hours/i)).not.toBeInTheDocument();
  });
});

describe("ForecastChart – next best hour", () => {
  it("announces when conditions next improve", () => {
    const nextBestHourIso = FULL_WINDOW.points[6].timeIso;
    render(
      <ForecastChart
        forecast={{ ...FULL_WINDOW, nextBestHourIso }}
        fetchedAtIso={FETCHED_AT_ISO}
      />,
    );
    const message = screen.getByText(/conditions next improve/i);
    expect(message).toBeInTheDocument();
    expect(document.querySelector(`time[datetime="${nextBestHourIso}"]`)).not.toBeNull();
  });

  it("omits the improvement message when there is nothing to announce", () => {
    render(<ForecastChart forecast={FULL_WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    expect(screen.queryByText(/conditions next improve/i)).not.toBeInTheDocument();
  });
});

describe("ForecastChart – fetched-at/source disclosure", () => {
  it("links to the Open-Meteo source", () => {
    render(<ForecastChart forecast={FULL_WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    const link = screen.getByRole("link", { name: /open-meteo/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("air-quality-api.open-meteo.com"),
    );
  });

  it("shows when the forecast was fetched", () => {
    render(<ForecastChart forecast={FULL_WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    expect(document.querySelector(`time[datetime="${FETCHED_AT_ISO}"]`)).not.toBeNull();
  });
});
