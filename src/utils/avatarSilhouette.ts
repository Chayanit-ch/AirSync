/**
 * Level-based silhouette evolution for `CharacterAvatar` (see its `level`
 * prop) — "broader shoulders at higher levels" without a redesign, so only
 * 3 numeric dimensions move: torso width, arm sleeve width, and arm
 * x-offset. Keyed off `getBadgeTier` (caps at 5, same tier language as
 * `GuardianBadgeIcons`) rather than raw level, so this never exceeds the
 * "strongest build" look even for very high uncapped levels.
 *
 * Torso stays horizontally centered on x=50 at every tier
 * (`torsoX = 50 - torsoWidth/2`), and arm x-offset is always derived as
 * `torsoX - armWidth - GAP` / `torsoX + torsoWidth + GAP` rather than
 * independently-chosen per-tier coordinates — `GAP=1` reproduces today's
 * exact baseline (torso x=30 w=40, arms at x=16/x=71) with zero drift at
 * tier 1-2, so growing the silhouette at higher tiers can never
 * accidentally break the "arms stay outside the torso's x-range" invariant
 * `characterParts.tsx` depends on.
 */

const GAP = 1;

export interface SilhouetteMetrics {
  torsoX: number;
  torsoWidth: number;
  armWidth: number;
  armLeftX: number;
  armRightX: number;
  /** Fraction of `torsoWidth` tapered away from each side at the waist (see `characterParts.tsx`'s `torsoOutline`) — barely tapered at tier 1-2 for a plain/casual silhouette, more pronounced at higher tiers for a more "armored" V-taper build. */
  waistTaperRatio: number;
}

const TORSO_WIDTH_BY_TIER: Record<number, number> = {
  1: 40,
  2: 40,
  3: 44,
  4: 44,
  5: 48,
};

const ARM_WIDTH_BY_TIER: Record<number, number> = {
  1: 13,
  2: 13,
  3: 14,
  4: 14,
  5: 15,
};

const WAIST_TAPER_RATIO_BY_TIER: Record<number, number> = {
  1: 0.05,
  2: 0.05,
  3: 0.14,
  4: 0.16,
  5: 0.2,
};

/** Same as tier 1-2's ratio — exported so `CharacterAvatar` can fall back to this exact "plain shirt" taper when the jacket layer is unequipped, regardless of the wearer's actual badge tier, instead of duplicating the magic number. */
export const CASUAL_WAIST_TAPER_RATIO = WAIST_TAPER_RATIO_BY_TIER[1];

/** `badgeTier` should already be `getBadgeTier(level)`-capped (1-5). */
export function getSilhouetteMetrics(badgeTier: number): SilhouetteMetrics {
  const torsoWidth = TORSO_WIDTH_BY_TIER[badgeTier] ?? TORSO_WIDTH_BY_TIER[1];
  const armWidth = ARM_WIDTH_BY_TIER[badgeTier] ?? ARM_WIDTH_BY_TIER[1];
  const torsoX = 50 - torsoWidth / 2;
  return {
    torsoX,
    torsoWidth,
    armWidth,
    armLeftX: torsoX - armWidth - GAP,
    armRightX: torsoX + torsoWidth + GAP,
    waistTaperRatio: WAIST_TAPER_RATIO_BY_TIER[badgeTier] ?? WAIST_TAPER_RATIO_BY_TIER[1],
  };
}
