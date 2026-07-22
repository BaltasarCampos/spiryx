export const STALE_DATA_THRESHOLD_MINUTES = 90;
export const EXPIRED_DATA_THRESHOLD_MINUTES = 180;
export const AUTO_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 400;
// Kept below AUTO_REFRESH_INTERVAL_MS (15min) so every scheduled or manual
// refresh always misses the cache and hits the network.
export const SESSION_CACHE_TTL_MS = 10 * 60 * 1000;

export const GEOLOCATION_TIMEOUT_MS = 10 * 1000;
export const GEOLOCATION_MAXIMUM_AGE_MS = 5 * 60 * 1000;

export const FORECAST_CACHE_TTL_MS = 3 * 60 * 60 * 1000;
export const FORECAST_PREFETCH_LEAD_MS = 30 * 60 * 1000;
export const TREND_NEGLIGIBLE_PERCENT = 2;
