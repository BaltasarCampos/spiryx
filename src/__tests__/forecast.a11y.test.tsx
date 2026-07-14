/**
 * ForecastChart accessibility: the chart SVG is decorative
 * and the sr-only table fallback is the screen-reader navigation surface.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ForecastChart } from "../components/organisms/ForecastChart";
import type { ForecastWindow, HourlyForecastPoint } from "../types/activity";

const HOUR_MS = 3_600_000;
const BASE_TIME = Date.UTC(2026, 6, 14, 12);

function makeWindow(values: (number | null)[]): ForecastWindow {
  const points: HourlyForecastPoint[] = values.map((aqiValue, i) => {
    const isGood = aqiValue !== null && aqiValue <= 50;
    return {
      timeIso: new Date(BASE_TIME + i * HOUR_MS).toISOString(),
      aqiValue,
      categoryKey: aqiValue === null ? "unknown" : isGood ? "good" : "unhealthy_sensitive",
      isBestHour: isGood,
    };
  });
  return {
    points,
    requestedHours: 48,
    coveredHours: points.length,
    isIncomplete: points.length < 48,
    nextBestHourIso: null,
  };
}

const WINDOW = makeWindow([120, 42, null, 40]);
const FETCHED_AT_ISO = new Date(BASE_TIME).toISOString();

describe("ForecastChart – screen-reader table fallback", () => {
  it("exposes the table to assistive technology even while visually hidden", () => {
    render(<ForecastChart forecast={WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(table).not.toHaveAttribute("aria-hidden", "true");
  });

  it("gives the table an accessible name", () => {
    render(<ForecastChart forecast={WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    expect(screen.getByRole("table", { name: /forecast/i })).toBeInTheDocument();
  });

  it("provides column headers for time, AQI, and category", () => {
    render(<ForecastChart forecast={WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
    expect(headers.join(" ")).toMatch(/time/i);
    expect(headers.join(" ")).toMatch(/aqi/i);
    expect(headers.join(" ")).toMatch(/category/i);
  });

  it("uses row headers so each hour is announced with its values", () => {
    render(<ForecastChart forecast={WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("rowheader")).toHaveLength(WINDOW.points.length);
  });

  it("keeps the chart SVG hidden from assistive technology (decorative duplicate)", () => {
    render(<ForecastChart forecast={WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);
    const visual = screen.getByTestId("forecast-chart-visual");
    expect(visual).toHaveAttribute("aria-hidden", "true");
    expect(within(screen.getByRole("table")).queryByTestId("forecast-chart-visual")).toBeNull();
  });
});

describe("ForecastChart – keyboard operability", () => {
  it("the View as table toggle is reachable via Tab and operable with Enter", async () => {
    const user = userEvent.setup();
    render(<ForecastChart forecast={WINDOW} fetchedAtIso={FETCHED_AT_ISO} />);

    const toggle = screen.getByRole("button", { name: /view as table/i });
    expect(toggle).not.toBeDisabled();

    await user.tab();
    expect(toggle).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("table").className).not.toMatch(/sr-only/);
  });
});
