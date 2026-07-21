import { useCallback, useState } from "react";
import { readActivityHistory, recordActivityCheck } from "../services/activityHistoryStore";
import type { ActivityHistoryEntry, ActivityType } from "../types/activity";

export interface UseActivityHistoryResult {
  history: ActivityHistoryEntry[];
  /** Persists a check for the activity and updates the in-memory list. */
  recordCheck: (activityType: ActivityType) => void;
}

/**
 * Persisted quick-access history: reads once on mount — a fresh
 * session sees prior sessions' checks — then mirrors every recorded check.
 */
export function useActivityHistory(): UseActivityHistoryResult {
  const [history, setHistory] = useState<ActivityHistoryEntry[]>(() => readActivityHistory());

  const recordCheck = useCallback((activityType: ActivityType) => {
    setHistory(recordActivityCheck(activityType));
  }, []);

  return { history, recordCheck };
}
