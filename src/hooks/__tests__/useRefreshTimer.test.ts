import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRefreshTimer } from "../useRefreshTimer";
import { AUTO_REFRESH_INTERVAL_MS } from "../../config/constants";
 
const INTERVAL = 1_000; // 1 second — fast for tests, behaviour identical to 15 min
 
beforeEach(() => {
  vi.useFakeTimers();
});
 
afterEach(() => {
  vi.useRealTimers();
});
 
// ---------------------------------------------------------------------------
// Auto-refresh scheduling
// ---------------------------------------------------------------------------
 
describe("useRefreshTimer – auto-refresh scheduling", () => {
  it("does not call onRefresh immediately on mount", () => {
    const onRefresh = vi.fn();
    renderHook(() => useRefreshTimer({ onRefresh, intervalMs: INTERVAL }));
    expect(onRefresh).not.toHaveBeenCalled();
  });
 
  it("calls onRefresh once after one interval elapses", () => {
    const onRefresh = vi.fn();
    renderHook(() => useRefreshTimer({ onRefresh, intervalMs: INTERVAL }));
    act(() => { vi.advanceTimersByTime(INTERVAL); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
 
  it("calls onRefresh twice after two intervals elapse", () => {
    const onRefresh = vi.fn();
    renderHook(() => useRefreshTimer({ onRefresh, intervalMs: INTERVAL }));
    act(() => { vi.advanceTimersByTime(INTERVAL * 2); });
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });
 
  it("does not call onRefresh before the interval elapses", () => {
    const onRefresh = vi.fn();
    renderHook(() => useRefreshTimer({ onRefresh, intervalMs: INTERVAL }));
    act(() => { vi.advanceTimersByTime(INTERVAL - 1); });
    expect(onRefresh).not.toHaveBeenCalled();
  });
 
  it("uses AUTO_REFRESH_INTERVAL_MS as the default interval", () => {
    const onRefresh = vi.fn();
    renderHook(() => useRefreshTimer({ onRefresh }));
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_INTERVAL_MS - 1); });
    expect(onRefresh).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
 
// ---------------------------------------------------------------------------
// Manual trigger
// ---------------------------------------------------------------------------
 
describe("useRefreshTimer – manual triggerRefresh", () => {
  it("calls onRefresh immediately when triggerRefresh is called", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      useRefreshTimer({ onRefresh, intervalMs: INTERVAL }),
    );
    act(() => { result.current.triggerRefresh(); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
 
  it("resets the interval after triggerRefresh so next auto fires a full cycle later", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      useRefreshTimer({ onRefresh, intervalMs: INTERVAL }),
    );
 
    // Advance halfway through the interval, then manually trigger.
    act(() => { vi.advanceTimersByTime(INTERVAL / 2); });
    act(() => { result.current.triggerRefresh(); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
 
    // Advance another half interval — should NOT fire again yet.
    act(() => { vi.advanceTimersByTime(INTERVAL / 2); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
 
    // Advance the remaining half — now the full interval has elapsed since
    // the manual trigger, so it fires again.
    act(() => { vi.advanceTimersByTime(INTERVAL / 2); });
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });
 
  it("can be triggered multiple times independently", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      useRefreshTimer({ onRefresh, intervalMs: INTERVAL }),
    );
    act(() => { result.current.triggerRefresh(); });
    act(() => { result.current.triggerRefresh(); });
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });
});
 
// ---------------------------------------------------------------------------
// enabled flag
// ---------------------------------------------------------------------------
 
describe("useRefreshTimer – enabled flag", () => {
  it("does not start interval when enabled is false", () => {
    const onRefresh = vi.fn();
    renderHook(() =>
      useRefreshTimer({ onRefresh, intervalMs: INTERVAL, enabled: false }),
    );
    act(() => { vi.advanceTimersByTime(INTERVAL * 3); });
    expect(onRefresh).not.toHaveBeenCalled();
  });
 
  it("triggerRefresh is a no-op when enabled is false", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      useRefreshTimer({ onRefresh, intervalMs: INTERVAL, enabled: false }),
    );
    act(() => { result.current.triggerRefresh(); });
    expect(onRefresh).not.toHaveBeenCalled();
  });
 
  it("starts interval when enabled transitions from false to true", () => {
    const onRefresh = vi.fn();
    let enabled = false;
    const { rerender } = renderHook(() =>
      useRefreshTimer({ onRefresh, intervalMs: INTERVAL, enabled }),
    );
 
    act(() => { vi.advanceTimersByTime(INTERVAL); });
    expect(onRefresh).not.toHaveBeenCalled();
 
    enabled = true;
    rerender();
 
    act(() => { vi.advanceTimersByTime(INTERVAL); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
 
  it("stops interval when enabled transitions from true to false", () => {
    const onRefresh = vi.fn();
    let enabled = true;
    const { rerender } = renderHook(() =>
      useRefreshTimer({ onRefresh, intervalMs: INTERVAL, enabled }),
    );
 
    act(() => { vi.advanceTimersByTime(INTERVAL); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
 
    enabled = false;
    rerender();
 
    act(() => { vi.advanceTimersByTime(INTERVAL * 3); });
    // Should not fire any more after being disabled.
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
 
// ---------------------------------------------------------------------------
// Cleanup on unmount
// ---------------------------------------------------------------------------
 
describe("useRefreshTimer – cleanup on unmount", () => {
  it("clears the interval when the hook unmounts", () => {
    const onRefresh = vi.fn();
    const { unmount } = renderHook(() =>
      useRefreshTimer({ onRefresh, intervalMs: INTERVAL }),
    );
    unmount();
    act(() => { vi.advanceTimersByTime(INTERVAL * 5); });
    expect(onRefresh).not.toHaveBeenCalled();
  });
 
  it("does not call onRefresh after unmount even if interval would have fired", () => {
    const onRefresh = vi.fn();
    const { unmount } = renderHook(() =>
      useRefreshTimer({ onRefresh, intervalMs: INTERVAL }),
    );
    act(() => { vi.advanceTimersByTime(INTERVAL - 1); });
    unmount();
    act(() => { vi.advanceTimersByTime(INTERVAL); });
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
 