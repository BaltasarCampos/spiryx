/**
 * Open-Meteo Air Quality API contract tests.
 *
 * These tests verify the normalization contract between the raw provider payload
 * and the internal AirQualitySnapshot domain model.
 * They will fail until normalizeAirQualityResponse covers all branches correctly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidPayloadError, NetworkError } from "../errors";
import {
  normalizeAirQualityResponse,
  normalizePollutants,
  type OpenMeteoAirQualityResponse,
} from "../normalizers";
import {
  clearAQICache,
  clearForecastCache,
  getCurrentAQI,
  getHourlyForecast,
} from "../airQualityService";
import {
  FORECAST_CACHE_TTL_MS,
  FORECAST_PREFETCH_LEAD_MS,
  RETRY_BASE_DELAY_MS,
} from "../../config/constants";

vi.mock("../apiClient", () => ({ requestJson: vi.fn() }));
import { requestJson } from "../apiClient";

// Keep the Z suffix so Node.js parses it as UTC regardless of system timezone.
const VALID_OBSERVED_AT = new Date(Date.now() - 30 * 60_000).toISOString();

const VALID_PAYLOAD: OpenMeteoAirQualityResponse = {
  latitude: 51.5074,
  longitude: -0.1278,
  current: {
    time: VALID_OBSERVED_AT,
    us_aqi: 42,
    pm2_5: 10,
    pm10: 20,
    ozone: 30,
    nitrogen_dioxide: null,
    sulphur_dioxide: null,
    carbon_monoxide: null,
  },
};

describe("normalizeAirQualityResponse – valid payload", () => {
  it("returns a snapshot with correct lat/lon from the payload", () => {
    const snapshot = normalizeAirQualityResponse(VALID_PAYLOAD);
    expect(snapshot.latitude).toBe(51.5074);
    expect(snapshot.longitude).toBe(-0.1278);
  });

  it("uses US AQI field and labels it correctly", () => {
    const snapshot = normalizeAirQualityResponse(VALID_PAYLOAD);
    expect(snapshot.aqiValue).toBe(42);
    expect(snapshot.aqiScaleLabel).toBe("US AQI");
  });

  it("falls back to EU AQI when US AQI is absent", () => {
    const payload: OpenMeteoAirQualityResponse = {
      ...VALID_PAYLOAD,
      current: { ...VALID_PAYLOAD.current, us_aqi: undefined, european_aqi: 35 },
    };
    const snapshot = normalizeAirQualityResponse(payload);
    expect(snapshot.aqiValue).toBe(35);
    expect(snapshot.aqiScaleLabel).toBe("EU CAQI");
  });

  it("sets sourceProvider to Open-Meteo", () => {
    expect(normalizeAirQualityResponse(VALID_PAYLOAD).sourceProvider).toBe("Open-Meteo");
  });

  it("sets freshnessState to 'fresh' for a recent observation time", () => {
    expect(normalizeAirQualityResponse(VALID_PAYLOAD).freshnessState).toBe("fresh");
  });

  it("sets unavailableReason to 'none' for a fresh valid payload", () => {
    expect(normalizeAirQualityResponse(VALID_PAYLOAD).unavailableReason).toBe("none");
  });

  it("sets a non-empty healthSummary and healthGuidance", () => {
    const snapshot = normalizeAirQualityResponse(VALID_PAYLOAD);
    expect(snapshot.healthSummary).toBeTruthy();
    expect(snapshot.healthGuidance).toBeTruthy();
  });

  it("maps the AQI value to the correct category key", () => {
    const snapshot = normalizeAirQualityResponse(VALID_PAYLOAD);
    // AQI 42 is <= 50 → 'good'
    expect(snapshot.categoryKey).toBe("good");
  });
});

describe("normalizeAirQualityResponse – invalid payloads", () => {
  it("throws InvalidPayloadError when latitude is missing", () => {
    const payload: OpenMeteoAirQualityResponse = { ...VALID_PAYLOAD, latitude: undefined };
    expect(() => normalizeAirQualityResponse(payload)).toThrow(InvalidPayloadError);
  });

  it("throws InvalidPayloadError when longitude is missing", () => {
    const payload: OpenMeteoAirQualityResponse = { ...VALID_PAYLOAD, longitude: undefined };
    expect(() => normalizeAirQualityResponse(payload)).toThrow(InvalidPayloadError);
  });

  it("throws InvalidPayloadError when current.time is missing", () => {
    const payload: OpenMeteoAirQualityResponse = {
      ...VALID_PAYLOAD,
      current: { ...VALID_PAYLOAD.current, time: undefined },
    };
    expect(() => normalizeAirQualityResponse(payload)).toThrow(InvalidPayloadError);
  });

  it("throws InvalidPayloadError when both AQI fields are absent", () => {
    const payload: OpenMeteoAirQualityResponse = {
      ...VALID_PAYLOAD,
      current: { ...VALID_PAYLOAD.current, us_aqi: undefined, european_aqi: undefined },
    };
    expect(() => normalizeAirQualityResponse(payload)).toThrow(InvalidPayloadError);
  });

  it("throws InvalidPayloadError when current block is absent entirely", () => {
    const payload: OpenMeteoAirQualityResponse = { latitude: 51.5, longitude: -0.1 };
    expect(() => normalizeAirQualityResponse(payload)).toThrow(InvalidPayloadError);
  });
});

describe("normalizeAirQualityResponse – expired data", () => {
  it("returns aqiValue null and unavailableReason 'stale_over_limit' for data older than 180 min", () => {
    const expiredTime = new Date(Date.now() - 200 * 60_000).toISOString().replace("Z", "");
    const payload: OpenMeteoAirQualityResponse = {
      ...VALID_PAYLOAD,
      current: { ...VALID_PAYLOAD.current, time: expiredTime },
    };
    const snapshot = normalizeAirQualityResponse(payload);
    expect(snapshot.aqiValue).toBeNull();
    expect(snapshot.unavailableReason).toBe("stale_over_limit");
    expect(snapshot.freshnessState).toBe("expired");
    expect(snapshot.categoryKey).toBe("unknown");
  });
});

describe("normalizePollutants", () => {
  it("marks pollutants with a numeric value as 'available'", () => {
    const result = normalizePollutants({ pm2_5: 12, pm10: 25 });
    const pm25 = result.find((r) => r.pollutantCode === "pm2_5");
    expect(pm25?.availability).toBe("available");
    expect(pm25?.value).toBe(12);
  });

  it("marks pollutants with null as 'missing'", () => {
    const result = normalizePollutants({ pm2_5: null });
    const pm25 = result.find((r) => r.pollutantCode === "pm2_5");
    expect(pm25?.availability).toBe("missing");
    expect(pm25?.value).toBeNull();
  });

  it("marks pollutants with undefined as 'missing'", () => {
    const result = normalizePollutants({});
    const pm25 = result.find((r) => r.pollutantCode === "pm2_5");
    expect(pm25?.availability).toBe("missing");
  });

  it("returns a reading for every defined pollutant code", () => {
    const result = normalizePollutants({});
    const codes = result.map((r) => r.pollutantCode);
    expect(codes).toContain("pm2_5");
    expect(codes).toContain("pm10");
    expect(codes).toContain("ozone");
    expect(codes).toContain("no2");
    expect(codes).toContain("so2");
    expect(codes).toContain("co");
  });
});

/**
 * Uses the real normalizers against a mocked apiClient, mirroring how the
 * current-conditions contract is exercised end to end within the service.
 */
const HOUR_MS = 3_600_000;
const LATITUDE = 51.5074;
const LONGITUDE = -0.1278;

function makeForecastPayload(hours = 48): OpenMeteoAirQualityResponse {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  return {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    hourly: {
      time: Array.from({ length: hours }, (_, i) =>
        new Date(start.getTime() + i * HOUR_MS).toISOString(),
      ),
      us_aqi: Array(hours).fill(42),
    },
  };
}

function makeCurrentPayload(): OpenMeteoAirQualityResponse {
  return {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    current: { time: new Date().toISOString(), us_aqi: 42, pm2_5: 10 },
  };
}

describe("getHourlyForecast – request and caching contract", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    clearForecastCache();
    clearAQICache();
    vi.mocked(requestJson).mockImplementation(() => Promise.resolve(makeForecastPayload()));
  });

  afterEach(() => {
    vi.useRealTimers();
    clearForecastCache();
    clearAQICache();
  });

  it("requests hourly us_aqi,european_aqi with forecast_days=2", async () => {
    await getHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE });
    const [, options] = vi.mocked(requestJson).mock.calls[0];
    expect(options?.query).toMatchObject({
      hourly: "us_aqi,european_aqi",
      forecast_days: 2,
    });
  });

  it("serves a second call within the 3h TTL from cache without a network request", async () => {
    const first = await getHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE });
    const second = await getHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE });
    expect(requestJson).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("fetches fresh data once the 3h TTL has expired", async () => {
    await getHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE });
    await vi.advanceTimersByTimeAsync(FORECAST_CACHE_TTL_MS + 60_000);
    await getHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE });
    expect(requestJson).toHaveBeenCalledTimes(2);
  });

  it("keeps the prefetch lead shorter than the cache TTL so prefetch lands before expiry", () => {
    expect(FORECAST_PREFETCH_LEAD_MS).toBeLessThan(FORECAST_CACHE_TTL_MS);
  });

  it("a bypassCache prefetch ~30min before expiry re-warms the cache past the original TTL", async () => {
    await getHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE });

    // Advance to the prefetch point: FORECAST_PREFETCH_LEAD_MS before expiry.
    await vi.advanceTimersByTimeAsync(FORECAST_CACHE_TTL_MS - FORECAST_PREFETCH_LEAD_MS);
    await getHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE, bypassCache: true });
    expect(requestJson).toHaveBeenCalledTimes(2);

    // Past the original entry's expiry the re-warmed entry still serves from cache.
    await vi.advanceTimersByTimeAsync(FORECAST_PREFETCH_LEAD_MS + 60_000);
    await getHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE });
    expect(requestJson).toHaveBeenCalledTimes(2);
  });
});

describe("getHourlyForecast – retry and failure isolation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    clearForecastCache();
    clearAQICache();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearForecastCache();
    clearAQICache();
  });

  it("retries retryable errors with backoff and resolves on a later attempt", async () => {
    vi.mocked(requestJson)
      .mockRejectedValueOnce(new NetworkError())
      .mockRejectedValueOnce(new NetworkError())
      .mockImplementation(() => Promise.resolve(makeForecastPayload()));

    const promise = getHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE });
    await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS * 4);
    const window = await promise;

    expect(window.coveredHours).toBe(48);
    expect(requestJson).toHaveBeenCalledTimes(3);
  });

  it("does not retry an InvalidPayloadError (malformed forecast payload)", async () => {
    vi.mocked(requestJson).mockResolvedValue({ latitude: LATITUDE, longitude: LONGITUDE });

    await expect(
      getHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE }),
    ).rejects.toBeInstanceOf(InvalidPayloadError);
    expect(requestJson).toHaveBeenCalledTimes(1);
  });

  it("forecast failure is isolated from getCurrentAQI", async () => {
    vi.mocked(requestJson).mockImplementation((_url, options) => {
      if (options?.query && "hourly" in options.query) {
        return Promise.reject(new InvalidPayloadError("forecast down"));
      }
      return Promise.resolve(makeCurrentPayload());
    });

    await expect(
      getHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE }),
    ).rejects.toBeInstanceOf(InvalidPayloadError);

    const snapshot = await getCurrentAQI({ latitude: LATITUDE, longitude: LONGITUDE });
    expect(snapshot.aqiValue).toBe(42);
  });
});
