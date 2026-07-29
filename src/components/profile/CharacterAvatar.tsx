import { useId, useState } from "react";
import type { AvatarConfig, UserType } from "../../types";
import {
  DEFAULT_AVATAR_CONFIG,
  HAIR_COLOR_OPTIONS,
  SKIN_TONE_OPTIONS,
  resolveAvatarConfig,
} from "../../utils/avatarCustomization";
import { getBadgeTier } from "../../utils/gamification";
import { getSilhouetteMetrics } from "../../utils/avatarSilhouette";
import {
  BasicShoesLeft,
  BasicShoesRight,
  BootsLeft,
  BootsRight,
  CapeEquipment,
  CapEquipment,
  CharacterFace,
  GlassesEquipment,
  GunEquipment,
  HelmetEquipment,
  LeftArm,
  LeftLeg,
  LevelAura,
  MaskEquipment,
  PortraitBackdrop,
  RightArm,
  RightLeg,
  SanitizerEquipment,
  ShieldEquipment,
  SwordEquipment,
  ThemeUniform,
} from "./characterParts";

interface CharacterAvatarProps {
  /** Possibly-`undefined` straight from `userProfile.avatarConfig` — resolved internally, so every caller can pass it through as-is. */
  avatarConfig: AvatarConfig | undefined | null;
  userType: UserType;
  /** Drives the level-based silhouette evolution (task 4) and, above `size=80`, the tier 3+ accent glow / tier 5+ aura (task 3) — see `showLevelEffects` below. Defaults to 1 (baseline, no effects) so any caller that hasn't been updated yet still renders safely instead of erroring. */
  level?: number;
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

/**
 * Lighter variants of each theme's accent — one Tailwind-scale step up from
 * `ACCENT_COLOR_BY_TYPE`, same hue family so each theme is still instantly
 * recognizable. Feeds the tier 3-4 accent-glow gradient (see
 * `showLevelEffects` below): the base accent colors are all fairly deep, so
 * using one of them directly as a low-opacity glow washes out less
 * noticeably than this lighter tint does.
 */
const ACCENT_LIGHT_BY_TYPE: Record<UserType, string> = {
  citizen: "#10b981",
  organization: "#f97316",
  government: "#4338ca",
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

/** Below this render size, per-instance `<defs>`/glow/aura effects are skipped entirely (see `showLevelEffects`) — sized to exclude `OrganizationLeaderboardRow`'s `size=40` list avatars (which can render many at once) while including the main Profile avatar and the customization modal's preview. */
const LEVEL_EFFECTS_MIN_SIZE = 80;

/** Upper-body pivot (torso top-center) — the whole head/neck/torso/arms/cape/equipment subtree rotates together as one rigid body. */
const UPPER_BODY_ROTATION = "rotate(-6 50 46)";
/** Left-leg pivot (top-center of the left leg rect: x=36 w=11 -> center 41.5). */
const LEFT_LEG_ROTATION = "rotate(-8 41.5 100)";
/** Right-leg pivot (top-center of the right leg rect: x=53 w=11 -> center 58.5) — asymmetric from the left leg for a "weight on the back foot" dynamic stance rather than a symmetric akimbo look. */
const RIGHT_LEG_ROTATION = "rotate(6 58.5 100)";

/**
 * Full-body character, portrait-framed, built entirely from the user's own
 * saved `avatarConfig` — this component never looks at level/points itself
 * for what's EQUIPPED (it always renders whatever is actually saved,
 * regardless of current level — see `getUnlockedSlots`'s doc comment for
 * why that split matters) — `level` only drives purely cosmetic escalation
 * on top of that: the silhouette (broader shoulders at higher tiers) and,
 * above `LEVEL_EFFECTS_MIN_SIZE`, a small accent glow behind newly-unlocked
 * gear at tier 3-4 and a translucent aura at tier 5+.
 *
 * Pose: the character is NOT drawn standing perfectly straight — the whole
 * upper body (head/neck/torso/arms + every equipment piece attached above
 * the waist) is nested in one `<g transform={UPPER_BODY_ROTATION}>`, and
 * each leg (+ its own shoe/boot) is nested in its own independently-rotated
 * `<g>`. Every equipped piece's coordinates (see `characterParts.tsx`) are
 * completely unchanged from the original straight pose — only which rigid
 * body it's nested inside is new — so nothing can float or desync from the
 * body part it's attached to, unlike hand-shifting individual coordinates.
 */
export function CharacterAvatar({
  avatarConfig,
  userType,
  level = 1,
  size = 120,
  animate = true,
  className,
}: CharacterAvatarProps) {
  const config = resolveAvatarConfig(avatarConfig);
  const accentColor = ACCENT_COLOR_BY_TYPE[userType];
  const accentLight = ACCENT_LIGHT_BY_TYPE[userType];
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

  const badgeTier = getBadgeTier(level);
  const silhouette = getSilhouetteMetrics(badgeTier);
  const showLevelEffects = size >= LEVEL_EFFECTS_MIN_SIZE;

  // `useId()` is unique per mounted component instance — required here
  // because SVG `id` attributes are global to the whole HTML document, not
  // scoped per `<svg>`. `OrganizationLeaderboardRow` can render many
  // `<CharacterAvatar>` instances as sibling `<svg>` elements on one page;
  // a fixed literal gradient id would collide across them. Sanitized (strip
  // non-alphanumerics) before use in `id`/`url(#...)` for safe SVG `url()`
  // resolution across browsers.
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const metallicSheenId = `metallic-sheen-${safeId}`;
  const accentGlowId = `accent-glow-${safeId}`;

  const hasMetallicEquipment =
    config.equippedWeapon != null || config.equippedShield || config.equippedHat === "helmet";
  const showAccentGlow = showLevelEffects && badgeTier >= 3;
  const showAura = showLevelEffects && badgeTier >= 5;

  return (
    <svg
      width={size}
      height={(size * VIEWBOX_HEIGHT) / VIEWBOX_WIDTH}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-hidden="true"
      className={`${animate ? "animate-character-float" : ""} ${className ?? ""}`}
    >
      {(hasMetallicEquipment || showAccentGlow) && (
        <defs>
          {hasMetallicEquipment && (
            <linearGradient id={metallicSheenId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
            </linearGradient>
          )}
          {showAccentGlow && (
            <radialGradient id={accentGlowId}>
              <stop offset="0%" stopColor={accentLight} stopOpacity="0.35" />
              <stop offset="100%" stopColor={accentLight} stopOpacity="0" />
            </radialGradient>
          )}
        </defs>
      )}

      {showAura && <LevelAura tint={backdropTint} />}
      <PortraitBackdrop tint={backdropTint} />

      <g transform={UPPER_BODY_ROTATION}>
        {config.equippedCape && <CapeEquipment color={bodyColor} />}
        <LeftArm skinColor={skinColor} armX={silhouette.armLeftX} armWidth={silhouette.armWidth} />
        <RightArm skinColor={skinColor} armX={silhouette.armRightX} armWidth={silhouette.armWidth} />
        <CharacterFace
          skinColor={skinColor}
          hairColor={hairColor}
          hairStyle={config.hairStyle || DEFAULT_AVATAR_CONFIG.hairStyle}
          blinkDelay={blinkDelay}
        />
        <ThemeUniform
          bodyColor={bodyColor}
          badgeAccent={accentColor}
          torsoX={silhouette.torsoX}
          torsoWidth={silhouette.torsoWidth}
        />
        {showAccentGlow && config.equippedHat && (
          <circle cx="50" cy="21" r="14" fill={`url(#${accentGlowId})`} />
        )}
        {config.equippedHat === "helmet" && (
          <HelmetEquipment color="#6b7280" metallicSheenId={metallicSheenId} />
        )}
        {config.equippedHat === "cap" && <CapEquipment color={accentColor} />}
        {config.hasGlasses && <GlassesEquipment />}
        {config.equippedMask && <MaskEquipment />}
        {config.equippedSanitizer && <SanitizerEquipment />}
        {showAccentGlow && config.equippedWeapon && (
          <circle cx="90" cy="65" r="12" fill={`url(#${accentGlowId})`} />
        )}
        {config.equippedWeapon === "sword" && (
          <SwordEquipment color="#78716c" metallicSheenId={metallicSheenId} />
        )}
        {config.equippedWeapon === "gun" && (
          <GunEquipment color="#374151" metallicSheenId={metallicSheenId} />
        )}
        {config.equippedShield && <ShieldEquipment color={accentColor} metallicSheenId={metallicSheenId} />}
      </g>

      <g transform={LEFT_LEG_ROTATION}>
        <LeftLeg skinColor={skinColor} />
        {config.equippedShoes === "basic" && <BasicShoesLeft color="#374151" />}
        {config.equippedShoes === "boots" && <BootsLeft color={accentColor} />}
      </g>
      <g transform={RIGHT_LEG_ROTATION}>
        <RightLeg skinColor={skinColor} />
        {config.equippedShoes === "basic" && <BasicShoesRight color="#374151" />}
        {config.equippedShoes === "boots" && <BootsRight color={accentColor} />}
      </g>
    </svg>
  );
}
