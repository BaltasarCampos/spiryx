/**
 * T019 – Open-Meteo Air Quality API contract tests.
 *
 * These tests verify the normalization contract between the raw provider payload
 * and the internal AirQualitySnapshot domain model.
 * They will fail until normalizeAirQualityResponse covers all branches correctly.
 */
import { describe, expect, it } from "vitest";
import { InvalidPayloadError } from "../errors";
import {
  normalizeAirQualityResponse,
  normalizePollutants,
  type OpenMeteoAirQualityResponse,
} from "../normalizers";

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
    o3: 30,
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
    expect(codes).toContain("o3");
    expect(codes).toContain("no2");
    expect(codes).toContain("so2");
    expect(codes).toContain("co");
  });
});
