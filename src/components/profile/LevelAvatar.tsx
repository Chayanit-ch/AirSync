import type { UserType } from "../../types";
import { getBadgeTier } from "../../utils/gamification";
import { UserAvatar, type UserAvatarProps } from "../common/UserAvatar";
import {
  AUTHORITY_BADGE_BG_CLASSES,
  AUTHORITY_BADGE_ICONS,
  AUTHORITY_BADGE_RING_CLASSES,
  GOVERNMENT_BADGE_BG_CLASSES,
  GOVERNMENT_BADGE_ICONS,
  GOVERNMENT_BADGE_RING_CLASSES,
  GUARDIAN_BADGE_BG_CLASSES,
  GUARDIAN_BADGE_ICONS,
  GUARDIAN_BADGE_RING_CLASSES,
} from "./GuardianBadgeIcons";

interface LevelAvatarProps extends Pick<UserAvatarProps, "photoURL" | "displayName" | "size"> {
  level: number;
  userType: UserType;
}

/**
 * Wraps the existing `UserAvatar` (never replaces it — a real `photoURL`
 * still renders exactly as it always has) with a level-tiered ring and a
 * small corner badge. All account types progress through the same level
 * system, but each `userType` gets a completely separate badge set (see
 * `GuardianBadgeIcons`) so the three are immediately visually
 * distinguishable. This is purely cosmetic — it has no relationship to
 * `role`/Firestore permissions.
 */
export function LevelAvatar({ photoURL, displayName, size = "md", level, userType }: LevelAvatarProps) {
  const tier = getBadgeTier(level);
  const badgeSet =
    userType === "government"
      ? { ring: GOVERNMENT_BADGE_RING_CLASSES, icon: GOVERNMENT_BADGE_ICONS, bg: GOVERNMENT_BADGE_BG_CLASSES }
      : userType === "organization"
        ? { ring: AUTHORITY_BADGE_RING_CLASSES, icon: AUTHORITY_BADGE_ICONS, bg: AUTHORITY_BADGE_BG_CLASSES }
        : { ring: GUARDIAN_BADGE_RING_CLASSES, icon: GUARDIAN_BADGE_ICONS, bg: GUARDIAN_BADGE_BG_CLASSES };
  const ringClass = badgeSet.ring[tier];
  const BadgeIcon = badgeSet.icon[tier];
  const badgeBgClass = badgeSet.bg[tier];

  return (
    <div className={`relative mx-auto w-fit rounded-full border-4 ${ringClass}`}>
      <UserAvatar photoURL={photoURL} displayName={displayName} size={size} />
      <span
        className={`absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white ${badgeBgClass}`}
      >
        <BadgeIcon size={14} />
      </span>
    </div>
  );
}
