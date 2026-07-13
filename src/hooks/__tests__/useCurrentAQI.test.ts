/**
 * T002a – Regression test for /speckit-analyze finding C1.
 *
 * SESSION_CACHE_TTL_MS (10min) must stay below AUTO_REFRESH_INTERVAL_MS
 * (15min) so scheduled auto-refresh always misses the cache. Manual refresh
 * must also always issue a fresh network request even if triggered before
 * the cache TTL has elapsed — a "Refresh" click that silently returns a
 * stale cached snapshot would be a real-time data accuracy regression.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCurrentAQI } from "../useCurrentAQI";
import { clearAQICache } from "../../services/airQualityService";
import { AUTO_REFRESH_INTERVAL_MS, SESSION_CACHE_TTL_MS } from "../../config/constants";

vi.mock("../../services/apiClient", () => ({
  requestJson: vi.fn(),
}));
vi.mock("../../services/geocodingService", () => ({
  getLocationName: vi.fn().mockResolvedValue("Test City"),
}));

import { requestJson } from "../../services/apiClient";

const LATITUDE = 51.5074;
const LONGITUDE = -0.1278;

function makePayload() {
  return {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    current: {
      time: new Date().toISOString(),
      us_aqi: 42,
      pm2_5: 10,
    },
  };
}

describe("useCurrentAQI – cache TTL vs refresh interval (C1 regression)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    clearAQICache();
    vi.mocked(requestJson).mockResolvedValue(makePayload());
  });

  afterEach(() => {
    vi.useRealTimers();
    clearAQICache();
  });

  it("keeps SESSION_CACHE_TTL_MS strictly below AUTO_REFRESH_INTERVAL_MS", () => {
    expect(SESSION_CACHE_TTL_MS).toBeLessThan(AUTO_REFRESH_INTERVAL_MS);
  });

  it("issues a fresh network request on scheduled auto-refresh", async () => {
    renderHook(() => useCurrentAQI({ latitude: LATITUDE, longitude: LONGITUDE }));

    await waitFor(() => expect(requestJson).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTO_REFRESH_INTERVAL_MS);
    });

    await waitFor(() => expect(requestJson).toHaveBeenCalledTimes(2));
  });

  it("issues a fresh network request on manual refresh even when the cache TTL has not expired", async () => {
    const { result } = renderHook(() =>
      useCurrentAQI({ latitude: LATITUDE, longitude: LONGITUDE }),
    );

    await waitFor(() => expect(requestJson).toHaveBeenCalledTimes(1));

    // Well within the 10-minute cache TTL.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(requestJson).toHaveBeenCalledTimes(2));
  });
});