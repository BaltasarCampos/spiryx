import { describe, expect, it } from "vitest";
import {
  normalizePollutants,
  normalizeAirQualityResponse,
} from "../normalizers";
import type { OpenMeteoAirQualityResponse } from "../normalizers";
 
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
 
const RECENT_TIME = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
 
function makeFullPayload(
  overrides: Record<string, unknown> = {},
): Parameters<typeof normalizePollutants>[0] {
  return {
    time: RECENT_TIME,
    us_aqi: 42,
    pm2_5: 12.5,
    pm10: 20.0,
    ozone: 80.0,
    nitrogen_dioxide: 15.0,
    sulphur_dioxide: 5.0,
    carbon_monoxide: 200.0,
    ...overrides,
  };
}
 
function makeSnapshotPayload(
  currentOverrides: Record<string, unknown> = {},
): OpenMeteoAirQualityResponse {
  return {
    latitude: 51.5074,
    longitude: -0.1278,
    current: makeFullPayload(currentOverrides) as OpenMeteoAirQualityResponse["current"],
  };
}
 
// ---------------------------------------------------------------------------
// normalizePollutants – all fields present
// ---------------------------------------------------------------------------
 
describe("normalizePollutants – all fields present", () => {
  it("returns exactly 6 pollutant readings", () => {
    const result = normalizePollutants(makeFullPayload());
    expect(result).toHaveLength(6);
  });
 
  it("marks all readings as 'available' when all fields are present", () => {
    const result = normalizePollutants(makeFullPayload());
    result.forEach((r) => {
      expect(r.availability).toBe("available");
    });
  });
 
  it("returns correct value for pm2_5", () => {
    const result = normalizePollutants(makeFullPayload({ pm2_5: 12.5 }));
    const reading = result.find((r) => r.pollutantCode === "pm2_5");
    expect(reading?.value).toBe(12.5);
    expect(reading?.availability).toBe("available");
  });
 
  it("returns correct value for pm10", () => {
    const result = normalizePollutants(makeFullPayload({ pm10: 20.0 }));
    const reading = result.find((r) => r.pollutantCode === "pm10");
    expect(reading?.value).toBe(20.0);
    expect(reading?.availability).toBe("available");
  });
 
  it("returns correct value for ozone", () => {
    const result = normalizePollutants(makeFullPayload({ ozone: 80.0 }));
    const reading = result.find((r) => r.pollutantCode === "ozone");
    expect(reading?.value).toBe(80.0);
    expect(reading?.availability).toBe("available");
  });
 
  it("returns correct value for no2", () => {
    const result = normalizePollutants(makeFullPayload({ nitrogen_dioxide: 15.0 }));
    const reading = result.find((r) => r.pollutantCode === "no2");
    expect(reading?.value).toBe(15.0);
    expect(reading?.availability).toBe("available");
  });
 
  it("returns correct value for so2", () => {
    const result = normalizePollutants(makeFullPayload({ sulphur_dioxide: 5.0 }));
    const reading = result.find((r) => r.pollutantCode === "so2");
    expect(reading?.value).toBe(5.0);
    expect(reading?.availability).toBe("available");
  });
 
  it("returns correct value for co", () => {
    const result = normalizePollutants(makeFullPayload({ carbon_monoxide: 200.0 }));
    const reading = result.find((r) => r.pollutantCode === "co");
    expect(reading?.value).toBe(200.0);
    expect(reading?.availability).toBe("available");
  });
});
 
// ---------------------------------------------------------------------------
// normalizePollutants – missing and null fields → "missing" marker
// ---------------------------------------------------------------------------
 
describe("normalizePollutants – missing fields produce 'missing' markers", () => {
  it("marks pm2_5 as 'missing' when field is absent", () => {
    const payload = makeFullPayload();
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (payload as Record<string, unknown>)["pm2_5"];
    const result = normalizePollutants(payload);
    const reading = result.find((r) => r.pollutantCode === "pm2_5");
    expect(reading?.availability).toBe("missing");
    expect(reading?.value).toBeNull();
  });
 
  it("marks pm2_5 as 'missing' when field is null", () => {
    const result = normalizePollutants(makeFullPayload({ pm2_5: null }));
    const reading = result.find((r) => r.pollutantCode === "pm2_5");
    expect(reading?.availability).toBe("missing");
    expect(reading?.value).toBeNull();
  });
 
  it("marks ozone as 'missing' when field is null", () => {
    const result = normalizePollutants(makeFullPayload({ ozone: null }));
    const reading = result.find((r) => r.pollutantCode === "ozone");
    expect(reading?.availability).toBe("missing");
    expect(reading?.value).toBeNull();
  });
 
  it("marks no2 as 'missing' when field is absent", () => {
    const payload = makeFullPayload();
    delete (payload as Record<string, unknown>)["nitrogen_dioxide"];
    const result = normalizePollutants(payload);
    const reading = result.find((r) => r.pollutantCode === "no2");
    expect(reading?.availability).toBe("missing");
    expect(reading?.value).toBeNull();
  });
 
  it("marks all readings as 'missing' when current payload is empty", () => {
    const result = normalizePollutants({ time: RECENT_TIME });
    result.forEach((r) => {
      expect(r.availability).toBe("missing");
      expect(r.value).toBeNull();
    });
  });
 
  it("still returns 6 readings when all pollutant fields are absent", () => {
    const result = normalizePollutants({ time: RECENT_TIME });
    expect(result).toHaveLength(6);
  });
});
 
// ---------------------------------------------------------------------------
// normalizePollutants – edge values
// ---------------------------------------------------------------------------
 
describe("normalizePollutants – edge values", () => {
  it("treats value of 0 as 'available' (zero is a valid measurement)", () => {
    const result = normalizePollutants(makeFullPayload({ pm2_5: 0 }));
    const reading = result.find((r) => r.pollutantCode === "pm2_5");
    expect(reading?.availability).toBe("available");
    expect(reading?.value).toBe(0);
  });
 
  it("treats NaN as 'missing'", () => {
    const result = normalizePollutants(makeFullPayload({ pm2_5: NaN }));
    const reading = result.find((r) => r.pollutantCode === "pm2_5");
    expect(reading?.availability).toBe("missing");
    expect(reading?.value).toBeNull();
  });
 
  it("treats Infinity as 'missing'", () => {
    const result = normalizePollutants(
      makeFullPayload({ pm2_5: Number.POSITIVE_INFINITY }),
    );
    const reading = result.find((r) => r.pollutantCode === "pm2_5");
    expect(reading?.availability).toBe("missing");
    expect(reading?.value).toBeNull();
  });
 
  it("treats negative Infinity as 'missing'", () => {
    const result = normalizePollutants(
      makeFullPayload({ pm2_5: Number.NEGATIVE_INFINITY }),
    );
    const reading = result.find((r) => r.pollutantCode === "pm2_5");
    expect(reading?.availability).toBe("missing");
    expect(reading?.value).toBeNull();
  });
});
 
// ---------------------------------------------------------------------------
// normalizePollutants – partial payload
// ---------------------------------------------------------------------------
 
describe("normalizePollutants – partial payload", () => {
  it("marks available readings correctly when only some fields are present", () => {
    const result = normalizePollutants(
      makeFullPayload({ ozone: null, nitrogen_dioxide: null, sulphur_dioxide: null }),
    );
 
    const available = result.filter((r) => r.availability === "available");
    const missing = result.filter((r) => r.availability === "missing");
 
    expect(available).toHaveLength(3); // pm2_5, pm10, co
    expect(missing).toHaveLength(3);   // ozone, no2, so2
  });
 
  it("available readings still have correct values in a partial payload", () => {
    const result = normalizePollutants(
      makeFullPayload({ pm2_5: 12.5, pm10: 20.0, ozone: null }),
    );
    const pm25 = result.find((r) => r.pollutantCode === "pm2_5");
    const pm10 = result.find((r) => r.pollutantCode === "pm10");
    const ozone = result.find((r) => r.pollutantCode === "ozone");
 
    expect(pm25?.value).toBe(12.5);
    expect(pm10?.value).toBe(20.0);
    expect(ozone?.value).toBeNull();
    expect(ozone?.availability).toBe("missing");
  });
});
 
// ---------------------------------------------------------------------------
// normalizePollutants – output shape
// ---------------------------------------------------------------------------
 
describe("normalizePollutants – output shape", () => {
  it("every reading has required fields: pollutantCode, displayName, value, unit, availability", () => {
    const result = normalizePollutants(makeFullPayload());
    result.forEach((r) => {
      expect(typeof r.pollutantCode).toBe("string");
      expect(r.pollutantCode.length).toBeGreaterThan(0);
      expect(typeof r.displayName).toBe("string");
      expect(r.displayName.length).toBeGreaterThan(0);
      expect(typeof r.unit).toBe("string");
      expect(r.unit.length).toBeGreaterThan(0);
      expect(["available", "missing"]).toContain(r.availability);
      if (r.availability === "available") {
        expect(typeof r.value).toBe("number");
      } else {
        expect(r.value).toBeNull();
      }
    });
  });
 
  it("pollutant codes match the expected set", () => {
    const result = normalizePollutants(makeFullPayload());
    const codes = result.map((r) => r.pollutantCode);
    expect(codes).toEqual(
      expect.arrayContaining(["pm2_5", "pm10", "ozone", "no2", "so2", "co"]),
    );
  });
 
  it("each pollutant has a human-readable displayName", () => {
    const result = normalizePollutants(makeFullPayload());
    result.forEach((r) => {
      // displayName must not just be the pollutant code repeated
      expect(r.displayName).not.toBe(r.pollutantCode);
    });
  });
});
 
// ---------------------------------------------------------------------------
// normalizeAirQualityResponse – pollutants in snapshot
// ---------------------------------------------------------------------------
 
describe("normalizeAirQualityResponse – pollutants included in snapshot", () => {
  it("snapshot includes a pollutants array", () => {
    const snapshot = normalizeAirQualityResponse(makeSnapshotPayload());
    expect(Array.isArray(snapshot.pollutants)).toBe(true);
  });
 
  it("snapshot pollutants array has 6 entries", () => {
    const snapshot = normalizeAirQualityResponse(makeSnapshotPayload());
    expect(snapshot.pollutants).toHaveLength(6);
  });
 
  it("snapshot pollutants are available when payload has all fields", () => {
    const snapshot = normalizeAirQualityResponse(makeSnapshotPayload());
    snapshot.pollutants.forEach((r) => {
      expect(r.availability).toBe("available");
    });
  });
 
  it("snapshot pollutants include missing markers when payload is partial (DAR-004)", () => {
    const snapshot = normalizeAirQualityResponse(
      makeSnapshotPayload({ ozone: null, nitrogen_dioxide: null }),
    );
    const ozone = snapshot.pollutants.find((r) => r.pollutantCode === "ozone");
    const no2 = snapshot.pollutants.find((r) => r.pollutantCode === "no2");
    expect(ozone?.availability).toBe("missing");
    expect(no2?.availability).toBe("missing");
  });
 
  it("partial pollutants do not prevent snapshot from being returned (DAR-004)", () => {
    expect(() =>
      normalizeAirQualityResponse(makeSnapshotPayload({ pm2_5: null, ozone: null })),
    ).not.toThrow();
  });
 
  it("AQI value is preserved from provider without remapping (DAR-005)", () => {
    const snapshot = normalizeAirQualityResponse(
      makeSnapshotPayload({ us_aqi: 157 }),
    );
    expect(snapshot.aqiValue).toBe(157);
    expect(snapshot.aqiScaleLabel).toBe("US AQI");
  });
 
  it("EU CAQI value is preserved from provider without remapping (DAR-005)", () => {
    const snapshot = normalizeAirQualityResponse(
      makeSnapshotPayload({ us_aqi: undefined, european_aqi: 75 }),
    );
    expect(snapshot.aqiValue).toBe(75);
    expect(snapshot.aqiScaleLabel).toBe("EU CAQI");
  });
});
 