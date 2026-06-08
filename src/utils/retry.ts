import { MAX_RETRY_ATTEMPTS, RETRY_BASE_DELAY_MS } from "../config/constants";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

function createAbortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function getRetryDelayMs(attempt: number, baseDelayMs = RETRY_BASE_DELAY_MS): number {
  return baseDelayMs * 2 ** Math.max(attempt - 1, 0);
}

export async function sleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  await new Promise<void>((resolve, reject) => {
    const timerId = window.setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);

    function onAbort() {
      window.clearTimeout(timerId);
      cleanup();
      reject(createAbortError());
    }

    function cleanup() {
      signal?.removeEventListener("abort", onAbort);
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = MAX_RETRY_ATTEMPTS,
    baseDelayMs = RETRY_BASE_DELAY_MS,
    signal,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      throw createAbortError();
    }

    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      if (isAbortError(error)) {
        throw error;
      }

      const canRetry = attempt < maxAttempts && shouldRetry(error, attempt);
      if (!canRetry) {
        throw error;
      }

      const delayMs = getRetryDelayMs(attempt, baseDelayMs);
      onRetry?.(error, attempt, delayMs);
      await sleep(delayMs, signal);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Retry operation failed");
}
