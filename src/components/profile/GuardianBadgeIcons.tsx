/**
 * Five simple, flat line-art badges marking guardian-level progression
 * (see `LevelAvatar`). Deliberately built from plain geometric strokes,
 * matching lucide-react's 24x24 / stroke-width-2 convention so they sit
 * visually consistent with the rest of the app's iconography, rather than a
 * full custom character-art system.
 */

interface BadgeIconProps {
  size?: number;
  className?: string;
}

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Level 1 — plain guardian silhouette. */
function GuardianBadgeLevel1({ size = 14, className }: BadgeIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </svg>
  );
}

/** Level 2 — silhouette wearing a mask. */
function GuardianBadgeLevel2({ size = 14, className }: BadgeIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      <rect x="9.5" y="8.5" width="5" height="2.5" rx="1" />
    </svg>
  );
}

/** Level 3 — light armor chest plate. */
function GuardianBadgeLevel3({ size = 14, className }: BadgeIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps}>
      <circle cx="12" cy="6" r="2.5" />
      <path d="M6 20l6-3 6 3v-4.5L12 12l-6 3.5z" />
    </svg>
  );
}

/** Level 4 — shield. */
function GuardianBadgeLevel4({ size = 14, className }: BadgeIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps}>
      <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z" />
    </svg>
  );
}

/** Level 5 — full guardian gear (shield with star accent). */
function GuardianBadgeLevel5({ size = 14, className }: BadgeIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps}>
      <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z" />
      <path d="M12 8.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 10.6l2-.3z" />
    </svg>
  );
}

export const GUARDIAN_BADGE_ICONS: Record<number, typeof GuardianBadgeLevel1> = {
  1: GuardianBadgeLevel1,
  2: GuardianBadgeLevel2,
  3: GuardianBadgeLevel3,
  4: GuardianBadgeLevel4,
  5: GuardianBadgeLevel5,
};

export const GUARDIAN_BADGE_RING_CLASSES: Record<number, string> = {
  1: "border-gray-300",
  2: "border-amber-600",
  3: "border-slate-400",
  4: "border-yellow-500",
  5: "border-emerald-500",
};

export const GUARDIAN_BADGE_BG_CLASSES: Record<number, string> = {
  1: "bg-gray-300 text-gray-700",
  2: "bg-amber-600 text-white",
  3: "bg-slate-400 text-white",
  4: "bg-yellow-500 text-white",
  5: "bg-emerald-500 text-white",
};

/**
 * Authority/admin badge set — deliberately institutional (medal/insignia
 * shapes, not the citizen set's rounded person silhouette) in a gold/orange
 * palette, so the two account types are visually distinguishable at a
 * glance, not just by a different color on the same shape.
 */

/** Authority tier 1 — official badge. */
function AuthorityBadgeTier1({ size = 14, className }: BadgeIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

/** Authority tier 2 — reinforced badge (medal with ribbon). */
function AuthorityBadgeTier2({ size = 14, className }: BadgeIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps}>
      <circle cx="12" cy="8" r="5" />
      <path d="M9 12.5L7 21l5-3 5 3-2-8.5" />
    </svg>
  );
}

/** Authority tier 3 — shield insignia. */
function AuthorityBadgeTier3({ size = 14, className }: BadgeIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps}>
      <path d="M12 3l7 3.5v6c0 4.7-2.8 8-7 9-4.2-1-7-4.3-7-9v-6z" />
      <path d="M8.5 12h7" />
    </svg>
  );
}

/** Authority tier 4 — advanced authority crest (shield + star). */
function AuthorityBadgeTier4({ size = 14, className }: BadgeIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps}>
      <path d="M12 3l7 3.5v6c0 4.7-2.8 8-7 9-4.2-1-7-4.3-7-9v-6z" />
      <path d="M12 8.2l1 2 2.2.3-1.6 1.55.4 2.2-2-1.05-2 1.05.4-2.2-1.6-1.55 2.2-.3z" />
    </svg>
  );
}

/** Authority tier 5 — elite authority emblem (crest + rank ticks). */
function AuthorityBadgeTier5({ size = 14, className }: BadgeIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps}>
      <path d="M12 3l7 3.5v6c0 4.7-2.8 8-7 9-4.2-1-7-4.3-7-9v-6z" />
      <path d="M12 8.2l1 2 2.2.3-1.6 1.55.4 2.2-2-1.05-2 1.05.4-2.2-1.6-1.55 2.2-.3z" />
      <path d="M3.5 9l2 1M20.5 9l-2 1" />
    </svg>
  );
}

export const AUTHORITY_BADGE_ICONS: Record<number, typeof AuthorityBadgeTier1> = {
  1: AuthorityBadgeTier1,
  2: AuthorityBadgeTier2,
  3: AuthorityBadgeTier3,
  4: AuthorityBadgeTier4,
  5: AuthorityBadgeTier5,
};

export const AUTHORITY_BADGE_RING_CLASSES: Record<number, string> = {
  1: "border-amber-300",
  2: "border-amber-500",
  3: "border-orange-500",
  4: "border-orange-600",
  5: "border-amber-700",
};

export const AUTHORITY_BADGE_BG_CLASSES: Record<number, string> = {
  1: "bg-amber-300 text-amber-900",
  2: "bg-amber-500 text-white",
  3: "bg-orange-500 text-white",
  4: "bg-orange-600 text-white",
  5: "bg-amber-700 text-white",
};
