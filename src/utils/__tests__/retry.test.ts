import { afterEach, describe, expect, it, vi } from "vitest";
import { RETRY_BASE_DELAY_MS } from "../../config/constants";
import { getRetryDelayMs, isAbortError, sleep, withRetry } from "../retry";

describe("getRetryDelayMs", () => {
  it("returns base delay on attempt 1", () => {
    expect(getRetryDelayMs(1)).toBe(RETRY_BASE_DELAY_MS);
  });

  it("doubles delay on attempt 2", () => {
    expect(getRetryDelayMs(2)).toBe(RETRY_BASE_DELAY_MS * 2);
  });

  it("quadruples delay on attempt 3", () => {
    expect(getRetryDelayMs(3)).toBe(RETRY_BASE_DELAY_MS * 4);
  });

  it("accepts a custom base delay", () => {
    expect(getRetryDelayMs(1, 100)).toBe(100);
    expect(getRetryDelayMs(2, 100)).toBe(200);
  });
});

describe("isAbortError", () => {
  it("returns true for a DOMException named AbortError", () => {
    expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("returns false for a plain Error", () => {
    expect(isAbortError(new Error("other"))).toBe(false);
  });

  it("returns false for a DOMException with a different name", () => {
    expect(isAbortError(new DOMException("not found", "NotFoundError"))).toBe(false);
  });

  it("returns false for null and primitives", () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError(42)).toBe(false);
  });
});

describe("sleep", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves after the specified delay", async () => {
    vi.useFakeTimers();
    const promise = sleep(200);
    vi.advanceTimersByTime(200);
    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects with AbortError when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(sleep(100, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects with AbortError when signal fires during sleep", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const promise = sleep(1000, controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("withRetry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the value on first successful attempt", async () => {
    const op = vi.fn().mockResolvedValueOnce("ok");
    await expect(withRetry(op, { maxAttempts: 3, baseDelayMs: 1 })).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("retries after failure and resolves on a later attempt", async () => {
    vi.useFakeTimers();
    const op = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce("recovered");
    const promise = withRetry(op, { maxAttempts: 3, baseDelayMs: 10 });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("recovered");
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting maxAttempts", async () => {
    vi.useFakeTimers();
    const err = new Error("always fails");
    const op = vi.fn().mockRejectedValue(err);
    const promise = withRetry(op, { maxAttempts: 3, baseDelayMs: 10 });
    // Attach the rejection handler BEFORE advancing timers to prevent an
    // unhandled-rejection warning from firing between timer advancement and assertion.
    const check = expect(promise).rejects.toBe(err);
    await vi.runAllTimersAsync();
    await check;
    expect(op).toHaveBeenCalledTimes(3);
  });

  it("stops immediately when shouldRetry returns false", async () => {
    const err = new Error("non-retryable");
    const op = vi.fn().mockRejectedValue(err);
    await expect(
      withRetry(op, { maxAttempts: 3, baseDelayMs: 1, shouldRetry: () => false }),
    ).rejects.toBe(err);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("calls onRetry with error, attempt number, and delay", async () => {
    vi.useFakeTimers();
    const err = new Error("fail");
    const op = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce("ok");
    const onRetry = vi.fn();
    const promise = withRetry(op, { maxAttempts: 3, baseDelayMs: 10, onRetry });
    await vi.runAllTimersAsync();
    await promise;
    expect(onRetry).toHaveBeenCalledWith(err, 1, 10);
  });

  it("throws AbortError immediately when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const op = vi.fn();
    await expect(
      withRetry(op, { maxAttempts: 3, signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(op).not.toHaveBeenCalled();
  });

  it("stops retrying and re-throws AbortError when aborted mid-flight", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const err = new Error("fail");
    const op = vi.fn().mockRejectedValue(err);
    const promise = withRetry(op, { maxAttempts: 3, baseDelayMs: 100, signal: controller.signal });
    // First attempt fires → fails → enters sleep delay → abort during sleep
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });
});
