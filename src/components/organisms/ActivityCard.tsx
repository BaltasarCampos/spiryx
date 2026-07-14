import type { ActivitySafetyCheck, RecommendationLevel } from "../../types/activity";

interface ActivityCardProps {
  check: ActivitySafetyCheck;
}

// Full class names must be literals so Tailwind's content scan includes them.
const LEVEL_META: Record<RecommendationLevel, { icon: string; label: string; className: string }> = {
  go_ahead: {
    icon: "✅",
    label: "Go ahead",
    className: "bg-emerald-50 text-emerald-900 ring-emerald-400",
  },
  limit_activity: {
    icon: "⚠️",
    label: "Limit activity",
    className: "bg-amber-50 text-amber-900 ring-amber-400",
  },
  stay_inside: {
    icon: "❌",
    label: "Stay inside",
    className: "bg-rose-50 text-rose-900 ring-rose-400",
  },
};

export function ActivityCard({ check }: ActivityCardProps) {
  const meta = LEVEL_META[check.recommendationLevel];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`space-y-2 rounded-2xl p-4 ring-2 ${meta.className}`}
    >
      <p className="flex items-center gap-2">
        <span aria-hidden="true" className="text-2xl">
          {meta.icon}
        </span>
        <span className="text-2xl font-bold">{meta.label}</span>
      </p>
      <p className="text-sm leading-6">{check.reason}</p>
    </div>
  );
}
