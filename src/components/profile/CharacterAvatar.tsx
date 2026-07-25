import { useState } from "react";
import type { AvatarConfig, UserType } from "../../types";
import {
  DEFAULT_AVATAR_CONFIG,
  HAIR_COLOR_OPTIONS,
  SKIN_TONE_OPTIONS,
  resolveAvatarConfig,
} from "../../utils/avatarCustomization";
import {
  BasicShoesEquipment,
  BootsEquipment,
  CapeEquipment,
  CapEquipment,
  CharacterFace,
  GlassesEquipment,
  GunEquipment,
  HelmetEquipment,
  MaskEquipment,
  PortraitBackdrop,
  SanitizerEquipment,
  ShieldEquipment,
  SwordEquipment,
  ThemeUniform,
} from "./characterParts";

interface CharacterAvatarProps {
  /** Possibly-`undefined` straight from `userProfile.avatarConfig` — resolved internally, so every caller can pass it through as-is. */
  avatarConfig: AvatarConfig | undefined | null;
  userType: UserType;
  size?: number;
  animate?: boolean;
  className?: string;
}

/** A darker/contrasting shade of each theme's palette, reused for both the always-on uniform/badge and for equipment pieces (so gear visually matches the wearer's role). */
const ACCENT_COLOR_BY_TYPE: Record<UserType, string> = {
  citizen: "#047857",
  organization: "#c2410c",
  government: "#1e1b4b",
};

const BACKDROP_TINT_BY_TYPE: Record<UserType, string> = {
  citizen: "#a7f3d0",
  organization: "#fed7aa",
  government: "#c7d2fe",
};

function findHex(options: { value: string; hex: string }[], value: string, fallback: string): string {
  return options.find((o) => o.value === value)?.hex ?? fallback;
}

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 160;

/**
 * Full-body character, portrait-framed, built entirely from the user's own
 * saved `avatarConfig` — this component never looks at level/points itself
 * and never auto-equips anything. That's deliberate: it's what makes an
 * already-equipped item permanent even if points/level later drop (see
 * `getUnlockedSlots`'s doc comment for the split between "unlocked" and
 * "equipped"). `userType` only drives the always-on uniform color + badge,
 * independent of customization, so role stays identifiable regardless of
 * how (or whether) the user has customized their face.
 */
export function CharacterAvatar({
  avatarConfig,
  userType,
  size = 120,
  animate = true,
  className,
}: CharacterAvatarProps) {
  const config = resolveAvatarConfig(avatarConfig);
  const accentColor = ACCENT_COLOR_BY_TYPE[userType];
  const backdropTint = BACKDROP_TINT_BY_TYPE[userType];
  const skinColor = findHex(SKIN_TONE_OPTIONS, config.skinTone, SKIN_TONE_OPTIONS[0].hex);
  const hairColor = findHex(HAIR_COLOR_OPTIONS, config.hairColor, HAIR_COLOR_OPTIONS[0].hex);
  // The uniform/cape recolor is purely cosmetic on top of the role color —
  // `accentColor` (the TRUE role color) is always passed to `ThemeUniform`'s
  // badge separately, so role identity never depends on this override.
  const bodyColor = config.uniformColor || accentColor;
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
      <PortraitBackdrop tint={backdropTint} />
      {/* Cape renders BEHIND the body (before CharacterFace/ThemeUniform) so it drapes from the shoulders instead of sitting on top of the torso. */}
      {config.equippedCape && <CapeEquipment color={bodyColor} />}
      <CharacterFace
        skinColor={skinColor}
        hairColor={hairColor}
        hairStyle={config.hairStyle || DEFAULT_AVATAR_CONFIG.hairStyle}
        blinkDelay={blinkDelay}
      />
      <ThemeUniform bodyColor={bodyColor} badgeAccent={accentColor} />
      {config.equippedHat === "helmet" && <HelmetEquipment color="#6b7280" />}
      {config.equippedHat === "cap" && <CapEquipment color={accentColor} />}
      {config.hasGlasses && <GlassesEquipment />}
      {config.equippedMask && <MaskEquipment />}
      {config.equippedSanitizer && <SanitizerEquipment />}
      {config.equippedWeapon === "sword" && <SwordEquipment color="#78716c" />}
      {config.equippedWeapon === "gun" && <GunEquipment color="#374151" />}
      {config.equippedShield && <ShieldEquipment color={accentColor} />}
      {config.equippedShoes === "basic" && <BasicShoesEquipment color="#374151" />}
      {config.equippedShoes === "boots" && <BootsEquipment color={accentColor} />}
    </svg>
  );
}
