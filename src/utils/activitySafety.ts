import { ACTIVITY_RECOMMENDATION_REASONS, type ActivityReasonTier } from "../config/activityRecommendations";
import type { ActivitySafetyCheck, ActivityType, RecommendationLevel } from "../types/activity";

interface Tier {
  level: RecommendationLevel;
  reasonTier: ActivityReasonTier;
}

function getTier(aqiValue: number | null): Tier {
  if (aqiValue === null) {
    return { level: "stay_inside", reasonTier: "unavailable" };
  }

  if (aqiValue <= 50) {
    return { level: "go_ahead", reasonTier: "go_ahead" };
  }

  if (aqiValue <= 100) {
    return { level: "limit_activity", reasonTier: "limit_sensitive" };
  }

  if (aqiValue <= 150) {
    return { level: "limit_activity", reasonTier: "limit_general" };
  }

  return { level: "stay_inside", reasonTier: "stay_inside" };
}

export function getActivitySafety(
  aqiValue: number | null,
  activity: ActivityType,
  now: () => Date = () => new Date(),
): ActivitySafetyCheck {
  const { level, reasonTier } = getTier(aqiValue);

  return {
    activityType: activity,
    aqiValue,
    recommendationLevel: level,
    reason: ACTIVITY_RECOMMENDATION_REASONS[activity][reasonTier],
    checkedAtIso: now().toISOString(),
  };
}
