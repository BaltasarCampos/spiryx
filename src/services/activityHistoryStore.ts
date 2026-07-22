import type { ActivityHistoryEntry, ActivityType } from "../types/activity";

const STORAGE_KEY = "spiryx.activityHistory";

const KNOWN_ACTIVITY_TYPES: ActivityType[] = ["run", "cycle", "kids"];

function isValidEntry(value: unknown): value is ActivityHistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<ActivityHistoryEntry>;
  return (
    typeof entry.lastCheckedIso === "string" &&
    KNOWN_ACTIVITY_TYPES.includes(entry.activityType as ActivityType)
  );
}

function sortMostRecentFirst(entries: ActivityHistoryEntry[]): ActivityHistoryEntry[] {
  return [...entries].sort((a, b) => b.lastCheckedIso.localeCompare(a.lastCheckedIso));
}

/**
 * Read failures — missing key, corrupt JSON, localStorage unavailable
 * (private browsing) — degrade to an empty history rather than crashing
 * the dashboard.
 */
export function readActivityHistory(): ActivityHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortMostRecentFirst(parsed.filter(isValidEntry));
  } catch {
    return [];
  }
}

/**
 * Upserts by activity type  and persists synchronously.
 * Returns the updated list even when the write fails, so the current
 * session keeps a working in-memory history.
 */
export function recordActivityCheck(
  activityType: ActivityType,
  whenIso: string = new Date().toISOString(),
): ActivityHistoryEntry[] {
  const entries = sortMostRecentFirst([
    ...readActivityHistory().filter((entry) => entry.activityType !== activityType),
    { activityType, lastCheckedIso: whenIso },
  ]);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Persistence is best-effort (private mode / quota); history still
    // works for the current session via the returned list.
  }

  return entries;
}

export function clearActivityHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
