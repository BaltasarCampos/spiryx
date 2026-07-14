/**
 * useHourlyForecast – prefetch scheduling and stale-while-revalidate behaviour.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useHourlyForecast } from "../useHourlyForecast";
import { clearForecastCache } from "../../services/airQualityService";
import { FORECAST_CACHE_TTL_MS, FORECAST_PREFETCH_LEAD_MS } from "../../config/constants";

vi.mock("../../services/apiClient", () => ({
  requestJson: vi.fn(),
}));

import { requestJson } from "../../services/apiClient";

const LATITUDE = 51.5074;
const LONGITUDE = -0.1278;
const HOUR_MS = 3_600_000;

function makePayload() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  return {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    hourly: {
      time: Array.from({ length: 48 }, (_, i) =>
        new Date(start.getTime() + i * HOUR_MS).toISOString(),
      ),
      us_aqi: Array(48).fill(42),
    },
  };
}

describe("useHourlyForecast – prefetch before cache expiry", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    clearForecastCache();
    vi.mocked(requestJson).mockImplementation(() => Promise.resolve(makePayload()));
  });

  afterEach(() => {
    vi.useRealTimers();
    clearForecastCache();
  });

  it("fetches the forecast on mount", async () => {
    const { result } = renderHook(() =>
      useHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE }),
    );

    await waitFor(() => expect(result.current.loadState).toBe("success"));
    expect(result.current.forecast?.coveredHours).toBe(48);
    expect(requestJson).toHaveBeenCalledTimes(1);
  });

  it("prefetches a fresh forecast ~30 minutes before the 3h cache entry expires", async () => {
    renderHook(() => useHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE }));

    await waitFor(() => expect(requestJson).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FORECAST_CACHE_TTL_MS - FORECAST_PREFETCH_LEAD_MS);
    });

    // The prefetch bypasses the still-fresh cache entry and hits the network.
    await waitFor(() => expect(requestJson).toHaveBeenCalledTimes(2));
  });

  it("keeps showing the previous forecast when a background refresh fails (stale-while-revalidate)", async () => {
    const { result } = renderHook(() =>
      useHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE }),
    );

    await waitFor(() => expect(result.current.loadState).toBe("success"));

    vi.mocked(requestJson).mockRejectedValue(new Error("network down"));
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(vi.mocked(requestJson).mock.calls.length).toBeGreaterThan(1));
    expect(result.current.forecast).not.toBeNull();
    expect(result.current.loadState).toBe("success");
  });

  it("does not fetch when disabled", async () => {
    renderHook(() =>
      useHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE, enabled: false }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(requestJson).not.toHaveBeenCalled();
  });

  it("surfaces an isolated error state when no forecast has loaded yet", async () => {
    vi.mocked(requestJson).mockRejectedValue(new Error("forecast down"));
    const { result } = renderHook(() =>
      useHourlyForecast({ latitude: LATITUDE, longitude: LONGITUDE }),
    );

    await waitFor(() => expect(result.current.loadState).toBe("error"));
    expect(result.current.forecast).toBeNull();
    expect(result.current.errorMessage).toBeTruthy();
  });
});
