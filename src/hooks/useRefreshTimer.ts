import { useCallback, useEffect, useRef } from "react";
import { AUTO_REFRESH_INTERVAL_MS } from "../config/constants";
 
export interface UseRefreshTimerOptions {
  /** Called on every scheduled or manual refresh. Must be stable (memoised). */
  onRefresh: () => void;
  /** Interval in ms. Defaults to AUTO_REFRESH_INTERVAL_MS (15 min). */
  intervalMs?: number;
  /** When false the timer is not started. Defaults to true. */
  enabled?: boolean;
}
 
export interface UseRefreshTimerResult {
  /** Call to trigger an immediate refresh and reset the auto-refresh interval. */
  triggerRefresh: () => void;
}
 
export function useRefreshTimer({
  onRefresh,
  intervalMs = AUTO_REFRESH_INTERVAL_MS,
  enabled = true,
}: UseRefreshTimerOptions): UseRefreshTimerResult {
  const timerIdRef = useRef<number | null>(null);
  const onRefreshRef = useRef(onRefresh);
 
  // Keep the ref current without restarting the interval on every render.
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);
 
  const startInterval = useCallback(() => {
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
    }
    timerIdRef.current = window.setInterval(() => {
      onRefreshRef.current();
    }, intervalMs);
  }, [intervalMs]);
 
  // Start / stop interval when enabled changes.
  useEffect(() => {
    if (!enabled) {
      if (timerIdRef.current !== null) {
        window.clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      return;
    }
 
    startInterval();
 
    return () => {
      if (timerIdRef.current !== null) {
        window.clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [enabled, startInterval]);
 
  // Manual trigger: fire immediately and reset the interval.
  const triggerRefresh = useCallback(() => {
    if (!enabled) return;
    onRefreshRef.current();
    startInterval();
  }, [enabled, startInterval]);
 
  return { triggerRefresh };
}