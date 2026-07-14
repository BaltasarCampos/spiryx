/**
 * NormalizeForecastResponse contract tests.
 *
 * Covers the 48h happy path, incomplete (<48h) forecasts, malformed
 * payloads, and preservation (not fabrication) of null hour values.
 */
import { describe, expect, it } from "vitest";
import { InvalidPayloadError } from "../errors";
import { normalizeForecastResponse, type OpenMeteoAirQualityResponse } from "../normalizers";

const HOUR_MS = 3_600_000;

function startOfCurrentHour(): number {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.getTime();
}

/** ISO hour strings starting `offsetHours` from the current hour. */
function makeTimes(count: number, offsetHours = 0): string[] {
  const base = startOfCurrentHour() + offsetHours * HOUR_MS;
  return Array.from({ length: count }, (_, i) => new Date(base + i * HOUR_MS).toISOString());
}

function makePayload(
  hourly: OpenMeteoAirQualityResponse["hourly"],
): OpenMeteoAirQualityResponse {
  return { latitude: 51.5074, longitude: -0.1278, hourly };
}

describe("normalizeForecastResponse – 48h happy path", () => {
  it("returns 48 points covering the full window", () => {
    const window = normalizeForecastResponse(
      makePayload({ time: makeTimes(48), us_aqi: Array(48).fill(42) }),
    );
    expect(window.points).toHaveLength(48);
    expect(window.requestedHours).toBe(48);
    expect(window.coveredHours).toBe(48);
    expect(window.isIncomplete).toBe(false);
  });

  it("slices to the first 48 entries when the provider returns more", () => {
    const window = normalizeForecastResponse(
      makePayload({ time: makeTimes(60), us_aqi: Array(60).fill(42) }),
    );
    expect(window.points).toHaveLength(48);
  });

  it("excludes trailing hours before the current hour (timezone rounding)", () => {
    const times = makeTimes(50, -2); // 2 past hours + 48 from the current hour
    const window = normalizeForecastResponse(
      makePayload({ time: times, us_aqi: Array(50).fill(42) }),
    );
    expect(window.points).toHaveLength(48);
    expect(window.points[0].timeIso).toBe(times[2]);
    expect(new Date(window.points[0].timeIso).getTime()).toBeGreaterThanOrEqual(
      startOfCurrentHour(),
    );
  });

  it("prefers european_aqi over us_aqi, matching current-conditions scale preference", () => {
    const window = normalizeForecastResponse(
      makePayload({
        time: makeTimes(48),
        us_aqi: Array(48).fill(120),
        european_aqi: Array(48).fill(30),
      }),
    );
    expect(window.points[0].aqiValue).toBe(30);
  });

  it("falls back to us_aqi when european_aqi is absent", () => {
    const window = normalizeForecastResponse(
      makePayload({ time: makeTimes(48), us_aqi: Array(48).fill(120) }),
    );
    expect(window.points[0].aqiValue).toBe(120);
  });

  it("marks hours in the 'good' category as best hours", () => {
    const values = Array(48).fill(80);
    values[5] = 40;
    values[6] = 50;
    const window = normalizeForecastResponse(
      makePayload({ time: makeTimes(48), us_aqi: values }),
    );
    expect(window.points[5].isBestHour).toBe(true);
    expect(window.points[5].categoryKey).toBe("good");
    expect(window.points[6].isBestHour).toBe(true);
    expect(window.points[4].isBestHour).toBe(false);
  });

  it("leaves nextBestHourIso null (derived at display time from the current tier)", () => {
    const window = normalizeForecastResponse(
      makePayload({ time: makeTimes(48), us_aqi: Array(48).fill(42) }),
    );
    expect(window.nextBestHourIso).toBeNull();
  });
});

describe("normalizeForecastResponse – incomplete forecast", () => {
  it("flags a window shorter than 48 hours as incomplete", () => {
    const window = normalizeForecastResponse(
      makePayload({ time: makeTimes(30), us_aqi: Array(30).fill(42) }),
    );
    expect(window.points).toHaveLength(30);
    expect(window.coveredHours).toBe(30);
    expect(window.isIncomplete).toBe(true);
  });
});

describe("normalizeForecastResponse – malformed payloads (DAR-002)", () => {
  it("throws InvalidPayloadError when hourly is absent", () => {
    expect(() => normalizeForecastResponse(makePayload(undefined))).toThrow(InvalidPayloadError);
  });

  it("throws InvalidPayloadError when hourly.time is empty", () => {
    expect(() =>
      normalizeForecastResponse(makePayload({ time: [], us_aqi: [] })),
    ).toThrow(InvalidPayloadError);
  });

  it("throws InvalidPayloadError when no AQI array matches time's length", () => {
    expect(() =>
      normalizeForecastResponse(
        makePayload({ time: makeTimes(48), us_aqi: Array(10).fill(42) }),
      ),
    ).toThrow(InvalidPayloadError);
  });

  it("throws InvalidPayloadError when both AQI arrays are absent", () => {
    expect(() => normalizeForecastResponse(makePayload({ time: makeTimes(48) }))).toThrow(
      InvalidPayloadError,
    );
  });

  it("falls back to a matching us_aqi array when european_aqi has the wrong length", () => {
    const window = normalizeForecastResponse(
      makePayload({
        time: makeTimes(48),
        european_aqi: Array(3).fill(30),
        us_aqi: Array(48).fill(120),
      }),
    );
    expect(window.points[0].aqiValue).toBe(120);
  });
});

describe("normalizeForecastResponse – null hour values preserved", () => {
  it("keeps a null hour as aqiValue null with 'unknown' category, not a fabricated number", () => {
    const values: (number | null)[] = Array(48).fill(42);
    values[10] = null;
    const window = normalizeForecastResponse(
      makePayload({ time: makeTimes(48), us_aqi: values }),
    );
    expect(window.points).toHaveLength(48);
    expect(window.points[10].aqiValue).toBeNull();
    expect(window.points[10].categoryKey).toBe("unknown");
    expect(window.points[10].isBestHour).toBe(false);
  });
});
