import { describe, it, expect } from "vitest";
import {
  getAQICategoryDescriptor,
  getAQICategoryKey,
} from "../aqiMapping";
 
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
 
/** Assert all required descriptor fields are non-empty strings. */
function expectDescriptorShape(
  descriptor: ReturnType<typeof getAQICategoryDescriptor>,
) {
  expect(descriptor).toBeDefined();
  expect(typeof descriptor.key).toBe("string");
  expect(descriptor.key.length).toBeGreaterThan(0);
  expect(typeof descriptor.label).toBe("string");
  expect(descriptor.label.length).toBeGreaterThan(0);
  expect(typeof descriptor.summary).toBe("string");
  expect(descriptor.summary.length).toBeGreaterThan(0);
  expect(typeof descriptor.guidance).toBe("string");
  expect(descriptor.guidance.length).toBeGreaterThan(0);
}
 
// ---------------------------------------------------------------------------
// getAQICategoryDescriptor – boundary tests
// ---------------------------------------------------------------------------
 
describe("getAQICategoryDescriptor – category boundaries", () => {
  // Good: 0 – 50
  it("returns 'good' for AQI value 0 (lower floor)", () => {
    const result = getAQICategoryDescriptor(0);
    expect(result.key).toBe("good");
    expectDescriptorShape(result);
  });
 
  it("returns 'good' for AQI value 25 (mid-range)", () => {
    expect(getAQICategoryDescriptor(25).key).toBe("good");
  });
 
  it("returns 'good' for AQI value 50 (exact upper bound)", () => {
    expect(getAQICategoryDescriptor(50).key).toBe("good");
  });
 
  it("returns 'moderate' for AQI value 51 (one above good upper bound)", () => {
    expect(getAQICategoryDescriptor(51).key).toBe("moderate");
  });
 
  // Moderate: 51 – 100
  it("returns 'moderate' for AQI value 75 (mid-range)", () => {
    expect(getAQICategoryDescriptor(75).key).toBe("moderate");
  });
 
  it("returns 'moderate' for AQI value 100 (exact upper bound)", () => {
    expect(getAQICategoryDescriptor(100).key).toBe("moderate");
  });
 
  it("returns 'unhealthy_sensitive' for AQI value 101 (one above moderate upper bound)", () => {
    expect(getAQICategoryDescriptor(101).key).toBe("unhealthy_sensitive");
  });
 
  // Unhealthy for Sensitive Groups: 101 – 150
  it("returns 'unhealthy_sensitive' for AQI value 125 (mid-range)", () => {
    expect(getAQICategoryDescriptor(125).key).toBe("unhealthy_sensitive");
  });
 
  it("returns 'unhealthy_sensitive' for AQI value 150 (exact upper bound)", () => {
    expect(getAQICategoryDescriptor(150).key).toBe("unhealthy_sensitive");
  });
 
  it("returns 'unhealthy' for AQI value 151 (one above unhealthy_sensitive upper bound)", () => {
    expect(getAQICategoryDescriptor(151).key).toBe("unhealthy");
  });
 
  // Unhealthy: 151 – 200
  it("returns 'unhealthy' for AQI value 175 (mid-range)", () => {
    expect(getAQICategoryDescriptor(175).key).toBe("unhealthy");
  });
 
  it("returns 'unhealthy' for AQI value 200 (exact upper bound)", () => {
    expect(getAQICategoryDescriptor(200).key).toBe("unhealthy");
  });
 
  it("returns 'very_unhealthy' for AQI value 201 (one above unhealthy upper bound)", () => {
    expect(getAQICategoryDescriptor(201).key).toBe("very_unhealthy");
  });
 
  // Very Unhealthy: 201 – 300
  it("returns 'very_unhealthy' for AQI value 250 (mid-range)", () => {
    expect(getAQICategoryDescriptor(250).key).toBe("very_unhealthy");
  });
 
  it("returns 'very_unhealthy' for AQI value 300 (exact upper bound)", () => {
    expect(getAQICategoryDescriptor(300).key).toBe("very_unhealthy");
  });
 
  it("returns 'hazardous' for AQI value 301 (one above very_unhealthy upper bound)", () => {
    expect(getAQICategoryDescriptor(301).key).toBe("hazardous");
  });
 
  // Hazardous: 301+
  it("returns 'hazardous' for AQI value 400 (deep hazardous range)", () => {
    expect(getAQICategoryDescriptor(400).key).toBe("hazardous");
  });
 
  it("returns 'hazardous' for AQI value 500 (maximum common scale value)", () => {
    expect(getAQICategoryDescriptor(500).key).toBe("hazardous");
  });
 
  it("returns 'hazardous' for very large AQI values", () => {
    expect(getAQICategoryDescriptor(9999).key).toBe("hazardous");
  });
});
 
// ---------------------------------------------------------------------------
// getAQICategoryDescriptor – invalid / sentinel inputs -> "unknown"
// ---------------------------------------------------------------------------
 
describe("getAQICategoryDescriptor – invalid and sentinel inputs", () => {
  it("returns 'unknown' for null", () => {
    const result = getAQICategoryDescriptor(null);
    expect(result.key).toBe("unknown");
    expectDescriptorShape(result);
  });
 
  it("returns 'unknown' for undefined", () => {
    const result = getAQICategoryDescriptor(undefined);
    expect(result.key).toBe("unknown");
    expectDescriptorShape(result);
  });
 
  it("returns 'unknown' for NaN", () => {
    const result = getAQICategoryDescriptor(NaN);
    expect(result.key).toBe("unknown");
    expectDescriptorShape(result);
  });
 
  it("returns 'unknown' with non-empty label, summary, and guidance for degraded display", () => {
    const result = getAQICategoryDescriptor(null);
    expect(result.label).toBeTruthy();
    expect(result.summary).toBeTruthy();
    expect(result.guidance).toBeTruthy();
  });
});
 
// ---------------------------------------------------------------------------
// getAQICategoryDescriptor – descriptor shape completeness
// ---------------------------------------------------------------------------
 
describe("getAQICategoryDescriptor – descriptor shape for each category", () => {
  const representativeValues: [number, string][] = [
    [0, "good"],
    [75, "moderate"],
    [125, "unhealthy_sensitive"],
    [175, "unhealthy"],
    [250, "very_unhealthy"],
    [400, "hazardous"],
  ];
 
  it.each(representativeValues)(
    "descriptor for AQI %i (category '%s') has all required fields",
    (aqiValue, expectedKey) => {
      const result = getAQICategoryDescriptor(aqiValue);
      expect(result.key).toBe(expectedKey);
      expectDescriptorShape(result);
    },
  );
});
 
// ---------------------------------------------------------------------------
// getAQICategoryKey – convenience wrapper
// ---------------------------------------------------------------------------
 
describe("getAQICategoryKey", () => {
  it("returns 'good' key for AQI 50", () => {
    expect(getAQICategoryKey(50)).toBe("good");
  });
 
  it("returns 'moderate' key for AQI 100", () => {
    expect(getAQICategoryKey(100)).toBe("moderate");
  });
 
  it("returns 'unhealthy_sensitive' key for AQI 150", () => {
    expect(getAQICategoryKey(150)).toBe("unhealthy_sensitive");
  });
 
  it("returns 'unhealthy' key for AQI 200", () => {
    expect(getAQICategoryKey(200)).toBe("unhealthy");
  });
 
  it("returns 'very_unhealthy' key for AQI 300", () => {
    expect(getAQICategoryKey(300)).toBe("very_unhealthy");
  });
 
  it("returns 'hazardous' key for AQI 301", () => {
    expect(getAQICategoryKey(301)).toBe("hazardous");
  });
 
  it("returns 'unknown' key for null", () => {
    expect(getAQICategoryKey(null)).toBe("unknown");
  });
 
  it("returns 'unknown' key for undefined", () => {
    expect(getAQICategoryKey(undefined)).toBe("unknown");
  });
 
  it("returns 'unknown' key for NaN", () => {
    expect(getAQICategoryKey(NaN)).toBe("unknown");
  });
});
 
// ---------------------------------------------------------------------------
// Conservative guidance under uncertainty
// ---------------------------------------------------------------------------
 
describe("Conservative guidance for unknown/stale states", () => {
  it("unknown descriptor guidance prompts the user to retry, not to go outdoors", () => {
    const result = getAQICategoryDescriptor(null);
    // Guidance must not suggest outdoor activity when data is unavailable.
    const guidanceLower = result.guidance.toLowerCase();
    expect(guidanceLower).not.toMatch(/safe.*outdoor|go outside|normal.*outdoor/);
  });
 
  it("unknown descriptor does not claim conditions are good or safe", () => {
    const result = getAQICategoryDescriptor(undefined);
    const summaryLower = result.summary.toLowerCase();
    expect(summaryLower).not.toMatch(/good|safe|clean/);
  });
});
 