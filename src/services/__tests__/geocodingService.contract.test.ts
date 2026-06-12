/**
 * T020 – BigDataCloud Reverse Geocoding API contract tests.
 *
 * Verifies the normalization contract between the geocoding provider response
 * and the location name string used by the UI.
 */
import { describe, expect, it } from "vitest";
import { normalizeLocationName, type NominatimReverseGeocodingResponse } from "../normalizers";

describe("normalizeLocationName", () => {
  it('returns "city, country" when all fields are present', () => {
    const payload: NominatimReverseGeocodingResponse = {
      features: [{ properties: { geocoding: { name: "London", country: "United Kingdom" } }, geometry: { type: "Point", coordinates: [0, 0] }, type: "Feature" }],
      type: "FeatureCollection"
    };
    expect(normalizeLocationName(payload)).toBe("London, United Kingdom");
  });

  it("returns only the city when country is absent", () => {
    const payload: NominatimReverseGeocodingResponse = {
      features: [{ properties: { geocoding: { name: "London", country: "" } }, geometry: { type: "Point", coordinates: [0, 0] }, type: "Feature" }],
      type: "FeatureCollection"
    };
    expect(normalizeLocationName(payload)).toBe("London");
  });

  it("returns only the country when city is absent", () => {
    const payload: NominatimReverseGeocodingResponse = {
      features: [{ properties: { geocoding: { name: "", country: "United Kingdom" } }, geometry: { type: "Point", coordinates: [0, 0] }, type: "Feature" }],
      type: "FeatureCollection"
    };
    expect(normalizeLocationName(payload)).toBe("United Kingdom");
  });

  it('returns "Current location" when the results array is empty', () => {
    const payload: NominatimReverseGeocodingResponse = { features: [], type: "FeatureCollection" };
    expect(normalizeLocationName(payload)).toBe("Current location");
  });

  it('returns "Current location" when results is missing', () => {
    const payload: NominatimReverseGeocodingResponse = { features: [], type: "FeatureCollection" };
    expect(normalizeLocationName(payload)).toBe("Current location");
  });

  it('returns "Current location" when name and country are all empty strings', () => {
    const payload: NominatimReverseGeocodingResponse = {
      features: [{ properties: { geocoding: { name: "", country: "" } }, geometry: { type: "Point", coordinates: [0, 0] }, type: "Feature" }],
      type: "FeatureCollection"
    };
    expect(normalizeLocationName(payload)).toBe("Current location");
  });
});
