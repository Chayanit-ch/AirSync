/**
 * Guardian level is always derived from `UserProfile.points` at render time —
 * never stored as its own Firestore field — so there is no write path for it
 * and therefore no race condition to guard against (see `services/missions.ts`
 * for how `points` itself is safely incremented).
 *
 * Progression is flat and uncapped: every 100 points is one more level.
 */

const POINTS_PER_LEVEL = 100;

/** We only have 5 badge/ring designs (see `GuardianBadgeIcons`) — levels beyond
 * that keep climbing numerically but visually stay at the level-5 "full
 * guardian gear" look. */
export const MAX_BADGE_TIER = 5;

export function getGuardianLevel(points: number): number {
  return Math.floor(points / POINTS_PER_LEVEL) + 1;
}

/** Points still needed to reach the next level. Progression is uncapped, so this is never null. */
export function pointsToNextLevel(points: number): number {
  return POINTS_PER_LEVEL - (points % POINTS_PER_LEVEL);
}

/** Caps a numeric level at `MAX_BADGE_TIER` for badge/ring lookups. */
export function getBadgeTier(level: number): number {
  return Math.min(level, MAX_BADGE_TIER);
}
