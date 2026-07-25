import { useState } from "react";
import type { UserType } from "../../types";
import { getBadgeTier } from "../../utils/gamification";
import {
  ArmorEquipment,
  CapeEquipment,
  CitizenBody,
  GovernmentBody,
  MaskEquipment,
  OrganizationBody,
  ShieldEquipment,
} from "./characterParts";

interface CharacterAvatarProps {
  userType: UserType;
  level: number;
  size?: number;
  /** Off for compact contexts (e.g. a leaderboard row) where a floating/blinking character would be distracting at small size. */
  animate?: boolean;
  className?: string;
}

const BODY_BY_TYPE: Record<UserType, typeof CitizenBody> = {
  citizen: CitizenBody,
  organization: OrganizationBody,
  government: GovernmentBody,
};

/** A darker/contrasting shade of each theme's palette — the equipment set is drawn once and recolored per theme through this, rather than redrawn per `userType`. */
const ACCENT_COLOR_BY_TYPE: Record<UserType, string> = {
  citizen: "#047857",
  organization: "#c2410c",
  government: "#1e1b4b",
};

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 160;

/**
 * Full-body layered-SVG character — a second, richer representation of
 * `userType` + level alongside the existing corner-badge `LevelAvatar`
 * (never a replacement for it, and never a replacement for the real-photo
 * `UserAvatar` used anywhere identity matters). Equipment stacks
 * cumulatively as `getBadgeTier(level)` rises — a level-3 character always
 * shows the mask AND the armor, never just the latest piece. See
 * `characterParts.tsx` for the actual shapes and `index.css` for the
 * `animate-character-float`/`animate-equip-in`/`animate-character-blink`
 * keyframes this renders with.
 */
export function CharacterAvatar({
  userType,
  level,
  size = 120,
  animate = true,
  className,
}: CharacterAvatarProps) {
  const tier = getBadgeTier(level);
  const BodyComponent = BODY_BY_TYPE[userType];
  const accentColor = ACCENT_COLOR_BY_TYPE[userType];
  // Randomized once per mounted instance so several characters on screen at
  // once (e.g. a leaderboard) don't all blink in perfect unison.
  const [blinkDelay] = useState(() => -(Math.random() * 5));

  return (
    <svg
      width={size}
      height={(size * VIEWBOX_HEIGHT) / VIEWBOX_WIDTH}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-hidden="true"
      className={`${animate ? "animate-character-float" : ""} ${className ?? ""}`}
    >
      <BodyComponent blinkDelay={blinkDelay} />
      {tier >= 2 && <MaskEquipment accentColor={accentColor} />}
      {tier >= 3 && <ArmorEquipment accentColor={accentColor} />}
      {tier >= 4 && <ShieldEquipment accentColor={accentColor} />}
      {tier >= 5 && <CapeEquipment accentColor={accentColor} />}
    </svg>
  );
}
