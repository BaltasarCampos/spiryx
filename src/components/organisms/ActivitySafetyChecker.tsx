import { useState } from "react";
import { getActivitySafety } from "../../utils/activitySafety";
import { useActivityHistory } from "../../hooks/useActivityHistory";
import type { ActivityType } from "../../types/activity";
import { ActivityCard } from "./ActivityCard";

interface ActivitySafetyCheckerProps {
  activities: ActivityType[];
  aqiValue: number | null;
}

const ACTIVITY_BUTTON_LABEL: Record<ActivityType, string> = {
  run: "Safe to Run?",
  cycle: "Safe to Cycle?",
  kids: "Safe for Kids?",
};

// History entries use distinct wording so their accessible names never
// collide with the main check buttons above.
const HISTORY_ENTRY_LABEL: Record<ActivityType, string> = {
  run: "Running",
  cycle: "Cycling",
  kids: "Kids outside",
};

function formatCheckedAt(isoString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

export function ActivitySafetyChecker({ activities, aqiValue }: ActivitySafetyCheckerProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const { history, recordCheck } = useActivityHistory();

  // Both the main buttons and quick-access entries run the same live check
  // and record it.
  const handleCheck = (activity: ActivityType) => {
    setSelectedActivity(activity);
    recordCheck(activity);
  };

  const visibleHistory = history.filter((entry) => activities.includes(entry.activityType));

  return (
    <section aria-labelledby="activity-safety-heading" className="space-y-4">
      <h2 id="activity-safety-heading" className="text-base font-semibold text-slate-900">
        Activity Safety Check
      </h2>

      <div className="flex flex-wrap gap-2">
        {activities.map((activity) => (
          <button
            key={activity}
            type="button"
            onClick={() => handleCheck(activity)}
            className="inline-flex items-center justify-center rounded-full bg-tide px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tide"
          >
            {ACTIVITY_BUTTON_LABEL[activity]}
          </button>
        ))}
      </div>

      {visibleHistory.length > 0 && (
        <div className="space-y-2">
          <h3 id="activity-history-heading" className="text-sm font-semibold text-slate-700">
            Recently checked
          </h3>
          <ul aria-labelledby="activity-history-heading" className="flex flex-wrap gap-2">
            {visibleHistory.map((entry) => (
              <li key={entry.activityType}>
                <button
                  type="button"
                  onClick={() => handleCheck(entry.activityType)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tide"
                >
                  <span className="font-semibold">{HISTORY_ENTRY_LABEL[entry.activityType]}</span>
                  <time dateTime={entry.lastCheckedIso} className="text-slate-500">
                    {formatCheckedAt(entry.lastCheckedIso)}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedActivity && <ActivityCard check={getActivitySafety(aqiValue, selectedActivity)} />}
    </section>
  );
}
