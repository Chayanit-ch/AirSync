import { User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";

export interface UserAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-9 w-9 border-2 border-gray-100 text-sm",
  md: "h-12 w-12 border-2 border-gray-100 text-base",
  lg: "h-24 w-24 border-4 border-white text-2xl shadow",
};

const FALLBACK_ICON_SIZES: Record<NonNullable<UserAvatarProps["size"]>, number> = {
  sm: 16,
  md: 20,
  lg: 36,
};

/**
 * "Chayanit Chansuttikanok" -> "CC", "John" -> "J". First letter of the
 * first word, plus the first letter of the second word if there is one —
 * never more, so long names still fit inside the circle.
 */
function getInitials(displayName?: string | null): string {
  const words = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/**
 * Single source of truth for rendering a user's profile picture. Falls back
 * to initials (or a generic icon, if there's no name either) instead of
 * letting the browser render alt text when `photoURL` is empty — which is
 * the normal case for email/password accounts. Also recovers from a
 * `photoURL` that 404s or times out at runtime (e.g. a stale Google photo
 * URL), not just a missing one, via the img's `onError`.
 */
export function UserAvatar({ photoURL, displayName, size = "md" }: UserAvatarProps) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);

  // A changed photoURL (new sign-in, different account) deserves a fresh
  // attempt to load rather than staying stuck on a previous failure.
  useEffect(() => {
    setImageFailed(false);
  }, [photoURL]);

  const sizeClasses = SIZE_CLASSES[size];
  const label = displayName?.trim() || t("common.userProfile");

  if (photoURL && !imageFailed) {
    return (
      <img
        src={photoURL}
        alt={label}
        onError={() => setImageFailed(true)}
        className={`shrink-0 rounded-full object-cover ${sizeClasses}`}
      />
    );
  }

  const initials = getInitials(displayName);

  return (
    <div
      role="img"
      aria-label={label}
      className={`from-brand-500 flex shrink-0 items-center justify-center rounded-full bg-linear-to-br to-emerald-500 font-semibold text-white ${sizeClasses}`}
    >
      {initials || <UserIcon size={FALLBACK_ICON_SIZES[size]} />}
    </div>
  );
}
