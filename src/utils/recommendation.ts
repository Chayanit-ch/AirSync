import type { AQISeverityLevel, RiskGroup } from "../types";
import type { th } from "../locales/th";

type Dict = typeof th;

/** Falls back to `"general"` for profiles saved before `riskGroup` existed, or when the user hasn't chosen one yet. */
export function resolveRiskGroup(riskGroup: RiskGroup | undefined): RiskGroup {
  return riskGroup ?? "general";
}

/**
 * Combines AQI severity + the user's risk group into one specific
 * recommendation, for the Home hero card. `"general"` reuses the existing
 * `common.severityRecommendation` text instead of a duplicate copy under
 * `home.recommendationsByRiskGroup.general` — every other risk group has its
 * own full severity-level set there (`th.ts`/`en.ts`).
 */
export function getPersonalizedRecommendation(
  dict: Dict,
  severity: AQISeverityLevel,
  riskGroup: RiskGroup,
): string {
  if (riskGroup === "general") return dict.common.severityRecommendation[severity];
  return dict.home.recommendationsByRiskGroup[riskGroup][severity];
}
