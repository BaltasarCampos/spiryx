import {
  EXPIRED_DATA_THRESHOLD_MINUTES,
  STALE_DATA_THRESHOLD_MINUTES,
} from "../config/constants";
import type { FreshnessState } from "../types/airQuality";

export function getAgeInMinutes(observedAtIso: string, now = new Date()): number {
  const observedAt = new Date(observedAtIso);
  const observedAtMs = observedAt.getTime();

  if (Number.isNaN(observedAtMs)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (now.getTime() - observedAtMs) / 60_000);
}

export function getFreshnessState(observedAtIso: string, now = new Date()): FreshnessState {
  const ageInMinutes = getAgeInMinutes(observedAtIso, now);

  if (ageInMinutes <= STALE_DATA_THRESHOLD_MINUTES) {
    return "fresh";
  }

  if (ageInMinutes <= EXPIRED_DATA_THRESHOLD_MINUTES) {
    return "stale";
  }

  return "expired";
}

export function isExpired(observedAtIso: string, now = new Date()): boolean {
  return getFreshnessState(observedAtIso, now) === "expired";
}
