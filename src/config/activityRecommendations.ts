import type { ActivityType } from "../types/activity";

export type ActivityReasonTier =
  | "go_ahead"
  | "limit_sensitive"
  | "limit_general"
  | "stay_inside"
  | "unavailable";

type ActivityReasonMap = Record<ActivityType, Record<ActivityReasonTier, string>>;

export const ACTIVITY_RECOMMENDATION_REASONS: ActivityReasonMap = {
  run: {
    go_ahead: "Air quality is good — it's a great time for a run.",
    limit_sensitive:
      "Air quality may affect sensitive groups. If you have asthma or another respiratory condition, consider a shorter or lighter run.",
    limit_general:
      "Air quality is unhealthy for sensitive groups and may affect everyone during sustained effort. Consider shortening your run or moving it indoors.",
    stay_inside: "Air quality is unhealthy. Move your run indoors or postpone it.",
    unavailable:
      "Current air quality data isn't available, so we default to the safest guidance: stay inside for now.",
  },
  cycle: {
    go_ahead: "Air quality is good — it's a great time to cycle.",
    limit_sensitive:
      "Air quality may affect sensitive groups. If you have asthma or another respiratory condition, consider a shorter or lighter ride.",
    limit_general:
      "Air quality is unhealthy for sensitive groups and may affect everyone during sustained effort. Consider shortening your ride or moving it indoors.",
    stay_inside: "Air quality is unhealthy. Move your ride indoors or postpone it.",
    unavailable:
      "Current air quality data isn't available, so we default to the safest guidance: stay inside for now.",
  },
  kids: {
    go_ahead: "Air quality is good — a great time for kids to play outside.",
    limit_sensitive:
      "Children are more sensitive to air pollution than adults. Consider shorter outdoor play or a lower-exertion activity.",
    limit_general:
      "Air quality is unhealthy for sensitive groups, and children are always in that group. Limit outdoor play or move it indoors.",
    stay_inside: "Air quality is unhealthy. Keep kids' play indoors for now.",
    unavailable:
      "Current air quality data isn't available, so we default to the safest guidance: keep kids inside for now.",
  },
};
