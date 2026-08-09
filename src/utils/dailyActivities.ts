import type { AQISeverityLevel, RiskGroup } from "../types";
import { SEVERITY_ORDER } from "./aqi";

/**
 * Static daily-activity checklist config for the Home hero card. Thresholds
 * are deliberately anchored to the exact milestones already used by this
 * app's own rule-based copy (`dict.common.severityRecommendation` in
 * `locales/*.ts`) rather than invented numbers, so this checklist can never
 * silently contradict the AI/rule-based recommendation shown right above
 * it:
 *   - moderate:       "sensitive groups should limit strenuous outdoor activity"
 *   - sensitive (USG): "sensitive groups should wear a mask outdoors"
 *   - unhealthy:      "wear a mask and avoid outdoor activity" (general public)
 *   - veryUnhealthy:  "avoid all outdoor activity"
 *   - hazardous:      "stay indoors ... avoid going outside entirely"
 */
export interface DailyActivity {
  id: string;
  /**
   * `true` means a green check reads as "you should do this", not "this is
   * fine to keep doing" — currently only `wearMaskOutdoors` (checking the
   * box happens as conditions worsen, not the reverse).
   */
  reversed?: boolean;
  /** First severity level (see `SEVERITY_ORDER`) at which this activity's status flips for the general public. */
  generalCutoff: AQISeverityLevel;
  /** Same, but for the four specific risk groups — always the same tier or one earlier than `generalCutoff`, never later. */
  riskGroupCutoff: AQISeverityLevel;
}

export const DAILY_ACTIVITIES: DailyActivity[] = [
  // Matches the task brief's own example exactly: strenuous outdoor
  // activity becomes not-recommended starting at "sensitive" (Unhealthy for
  // Sensitive Groups) for the general public, one tier earlier for risk
  // groups.
  { id: "outdoorExercise", generalCutoff: "sensitive", riskGroupCutoff: "moderate" },
  { id: "openWindows", generalCutoff: "unhealthy", riskGroupCutoff: "sensitive" },
  { id: "childrenOutdoors", generalCutoff: "sensitive", riskGroupCutoff: "moderate" },
  { id: "dryClothesOutdoors", generalCutoff: "veryUnhealthy", riskGroupCutoff: "unhealthy" },
  { id: "longOutdoorActivities", generalCutoff: "sensitive", riskGroupCutoff: "moderate" },
  // Reversed: turns into a green check (recommended) once the general
  // public should start masking up, per `severityRecommendation.unhealthy`
  // above — one tier earlier for risk groups, matching
  // `severityRecommendation.sensitive`'s "sensitive groups should wear a
  // mask outdoors".
  { id: "wearMaskOutdoors", reversed: true, generalCutoff: "unhealthy", riskGroupCutoff: "sensitive" },
];

/**
 * `true` = green check, `false` = red X — see `DailyActivity.reversed` for
 * what each means for a given activity. `riskGroup` should already be
 * resolved via `resolveRiskGroup()` (see `utils/recommendation.ts`), the
 * same helper the AI/rule-based recommendation above this checklist uses,
 * so "no risk group set" consistently means "general" everywhere in the app.
 */
export function isActivityRecommended(
  activity: DailyActivity,
  severity: AQISeverityLevel,
  riskGroup: RiskGroup,
): boolean {
  const cutoff = riskGroup === "general" ? activity.generalCutoff : activity.riskGroupCutoff;
  const reached = SEVERITY_ORDER.indexOf(severity) >= SEVERITY_ORDER.indexOf(cutoff);
  return activity.reversed ? reached : !reached;
}
