export type AppErrorCode =
  | "NETWORK_ERROR"
  | "RATE_LIMIT_ERROR"
  | "INVALID_PAYLOAD_ERROR";

export interface AppErrorOptions {
  cause?: unknown;
  retryable?: boolean;
  status?: number;
}

export class AppError extends Error {
  code: AppErrorCode;
  retryable: boolean;
  status?: number;
  cause?: unknown;

  constructor(message: string, code: AppErrorCode, options: AppErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
    this.cause = options.cause;
  }
}

export class NetworkError extends AppError {
  constructor(message = "Network request failed", options: AppErrorOptions = {}) {
    super(message, "NETWORK_ERROR", { ...options, retryable: true });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded", options: AppErrorOptions = {}) {
    super(message, "RATE_LIMIT_ERROR", { ...options, retryable: true, status: options.status ?? 429 });
  }
}

export class InvalidPayloadError extends AppError {
  constructor(message = "Received invalid payload", options: AppErrorOptions = {}) {
    super(message, "INVALID_PAYLOAD_ERROR", { ...options, retryable: false });
  }
}
