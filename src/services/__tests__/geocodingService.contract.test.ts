/**
 * T020 – Open-Meteo Reverse Geocoding API contract tests.
 *
 * Verifies the normalization contract between the geocoding provider response
 * and the location name string used by the UI.
 */
import { describe, expect, it } from "vitest";
import { normalizeLocationName, type OpenMeteoReverseGeocodingResponse } from "../normalizers";

describe("normalizeLocationName", () => {
  it('returns "name, country" when both fields are present', () => {
    const payload: OpenMeteoReverseGeocodingResponse = {
      results: [{ name: "London", country: "United Kingdom" }],
    };
    expect(normalizeLocationName(payload)).toBe("London, United Kingdom");
  });

  it("returns only the name when country is absent", () => {
    const payload: OpenMeteoReverseGeocodingResponse = {
      results: [{ name: "London" }],
    };
    expect(normalizeLocationName(payload)).toBe("London");
  });

  it("returns only the country when name is absent", () => {
    const payload: OpenMeteoReverseGeocodingResponse = {
      results: [{ country: "United Kingdom" }],
    };
    expect(normalizeLocationName(payload)).toBe("United Kingdom");
  });

  it('returns "Current location" when the results array is empty', () => {
    const payload: OpenMeteoReverseGeocodingResponse = { results: [] };
    expect(normalizeLocationName(payload)).toBe("Current location");
  });

  it('returns "Current location" when results is missing', () => {
    const payload: OpenMeteoReverseGeocodingResponse = {};
    expect(normalizeLocationName(payload)).toBe("Current location");
  });

  it('returns "Current location" when name and country are both empty strings', () => {
    const payload: OpenMeteoReverseGeocodingResponse = {
      results: [{ name: "", country: "" }],
    };
    expect(normalizeLocationName(payload)).toBe("Current location");
  });
});
