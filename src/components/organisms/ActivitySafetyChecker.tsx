import { useState } from "react";
import { getActivitySafety } from "../../utils/activitySafety";
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

export function ActivitySafetyChecker({ activities, aqiValue }: ActivitySafetyCheckerProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);

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
            onClick={() => setSelectedActivity(activity)}
            className="inline-flex items-center justify-center rounded-full bg-tide px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tide"
          >
            {ACTIVITY_BUTTON_LABEL[activity]}
          </button>
        ))}
      </div>

      {selectedActivity && <ActivityCard check={getActivitySafety(aqiValue, selectedActivity)} />}
    </section>
  );
}
