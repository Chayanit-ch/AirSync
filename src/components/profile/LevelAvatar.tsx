import type { UserRole } from "../../types";
import { getBadgeTier } from "../../utils/gamification";
import { UserAvatar, type UserAvatarProps } from "../common/UserAvatar";
import {
  AUTHORITY_BADGE_BG_CLASSES,
  AUTHORITY_BADGE_ICONS,
  AUTHORITY_BADGE_RING_CLASSES,
  GUARDIAN_BADGE_BG_CLASSES,
  GUARDIAN_BADGE_ICONS,
  GUARDIAN_BADGE_RING_CLASSES,
} from "./GuardianBadgeIcons";

interface LevelAvatarProps extends Pick<UserAvatarProps, "photoURL" | "displayName" | "size"> {
  level: number;
  role: UserRole;
}

/**
 * Wraps the existing `UserAvatar` (never replaces it — a real `photoURL`
 * still renders exactly as it always has) with a level-tiered ring and a
 * small corner badge. Authority/admin accounts progress through the same
 * level system as citizens, but with a completely separate gold/orange
 * institutional badge set (see `GuardianBadgeIcons`) so the two account
 * types are immediately visually distinguishable.
 */
export function LevelAvatar({ photoURL, displayName, size = "md", level, role }: LevelAvatarProps) {
  const isOrg = role === "authority" || role === "admin";
  const tier = getBadgeTier(level);
  const ringClass = isOrg ? AUTHORITY_BADGE_RING_CLASSES[tier] : GUARDIAN_BADGE_RING_CLASSES[tier];
  const BadgeIcon = isOrg ? AUTHORITY_BADGE_ICONS[tier] : GUARDIAN_BADGE_ICONS[tier];
  const badgeBgClass = isOrg ? AUTHORITY_BADGE_BG_CLASSES[tier] : GUARDIAN_BADGE_BG_CLASSES[tier];

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
