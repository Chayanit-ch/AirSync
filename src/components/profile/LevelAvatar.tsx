import { ShieldCheck } from "lucide-react";
import type { UserRole } from "../../types";
import { getBadgeTier } from "../../utils/gamification";
import { UserAvatar, type UserAvatarProps } from "../common/UserAvatar";
import {
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
 * small corner badge. Authority/admin accounts get a fixed org badge instead
 * of a numbered tier, since that's a role designation, not a progression
 * level.
 */
export function LevelAvatar({ photoURL, displayName, size = "md", level, role }: LevelAvatarProps) {
  const isOrg = role === "authority" || role === "admin";
  const tier = getBadgeTier(level);
  const ringClass = isOrg ? "border-brand-600" : GUARDIAN_BADGE_RING_CLASSES[tier];
  const BadgeIcon = GUARDIAN_BADGE_ICONS[tier];
  const badgeBgClass = isOrg ? "bg-brand-600 text-white" : GUARDIAN_BADGE_BG_CLASSES[tier];

  return (
    <div className={`relative mx-auto w-fit rounded-full border-4 ${ringClass}`}>
      <UserAvatar photoURL={photoURL} displayName={displayName} size={size} />
      <span
        className={`absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white ${badgeBgClass}`}
      >
        {isOrg ? <ShieldCheck size={14} /> : <BadgeIcon size={14} />}
      </span>
    </div>
  );
}
