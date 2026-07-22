/**
 * Guardian level is always derived from `UserProfile.points` at render time —
 * never stored as its own Firestore field, and never written back to
 * Firestore as a "reset" — so there is no write path for it and therefore no
 * race condition to guard against (see `services/missions.ts` for how
 * `points` itself is safely incremented via `increment()`).
 *
 * Progression is a flat, uncapped XP-bar model: every 100 points is one
 * level, and `points % 100` — the remainder from a division that already
 * happens on every read — is exactly the "progress bar reset to 0 on
 * level-up" behavior, with no explicit reset logic anywhere.
 */

const POINTS_PER_LEVEL = 100;

/** We only have 5 badge/ring designs (see `GuardianBadgeIcons`) — levels beyond
 * that keep climbing numerically but visually stay at the level-5 "full
 * guardian gear" look. */
export const MAX_BADGE_TIER = 5;

/** The single source of truth for level — every place that displays a level must call this, not re-derive it. */
export function getLevelFromPoints(points: number): number {
  return Math.floor(points / POINTS_PER_LEVEL) + 1;
}

/** Points accumulated within the current level, 0-99 — display as "X/100". */
export function getProgressInCurrentLevel(points: number): number {
  return points % POINTS_PER_LEVEL;
}

/** Caps a numeric level at `MAX_BADGE_TIER` for badge/ring lookups. */
export function getBadgeTier(level: number): number {
  return Math.min(level, MAX_BADGE_TIER);
}
