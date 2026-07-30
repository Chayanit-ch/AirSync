import { useId, useState } from "react";
import type { AvatarConfig, UserType } from "../../types";
import {
  BADGE_STYLE_BY_TYPE,
  DEFAULT_AVATAR_CONFIG,
  HAIR_COLOR_OPTIONS,
  SKIN_TONE_OPTIONS,
  resolveAvatarConfig,
} from "../../utils/avatarCustomization";
import { getBadgeTier } from "../../utils/gamification";
import { CASUAL_WAIST_TAPER_RATIO, getSilhouetteMetrics } from "../../utils/avatarSilhouette";
import {
  ArmGuard,
  BasicShoesLeft,
  BasicShoesRight,
  Belt,
  BootsLeft,
  BootsRight,
  CapeEquipment,
  CapEquipment,
  ChakramEquipment,
  CharacterFace,
  GlassesEquipment,
  Glove,
  GunEquipment,
  HelmetEquipment,
  LeftArm,
  LeftLeg,
  LeftLegGuard,
  LevelAura,
  MaskEquipment,
  Pauldron,
  PortraitBackdrop,
  RightArm,
  RightLeg,
  RightLegGuard,
  SanitizerEquipment,
  ShieldEquipment,
  StaffEquipment,
  SwordEquipment,
  ThemeUniform,
  Wings,
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

/** Upper-body pivot (torso top-center) — the whole head/neck/torso/arms/cape/equipment subtree rotates together as one rigid body. Kept upright (no tilt) per feedback that a leaning torso read as "off-balance" rather than dynamic — the "ready stance" comes entirely from the legs splaying apart below (see `LEFT_LEG_ROTATION`/`RIGHT_LEG_ROTATION`). */
const UPPER_BODY_ROTATION = "rotate(0 50 46)";
/** Left-leg pivot (top-center of the left leg rect: x=36 w=11 -> center 41.5). Positive angle swings the foot outward/left in SVG's y-down rotation convention (verified by rendering — the opposite sign visibly crossed the legs toward each other instead of apart). */
const LEFT_LEG_ROTATION = "rotate(12 41.5 100)";
/** Right-leg pivot (top-center of the right leg rect: x=53 w=11 -> center 58.5) — negative angle swings the foot outward/right, and a slightly smaller magnitude than the left leg for a "weight on the back foot" asymmetric stance rather than a symmetric akimbo look. */
const RIGHT_LEG_ROTATION = "rotate(-9 58.5 100)";

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
  // Per-piece color overrides — same "`null`/missing means use the built-in
  // default" convention as `uniformColor` above, just one field per slot
  // instead of one shared color for everything.
  const weaponColor =
    config.weaponColor ||
    (config.equippedWeapon === "sword" || config.equippedWeapon === "staff" ? "#78716c" : "#374151");
  const shieldColor = config.shieldColor || accentColor;
  const hatColor = config.hatColor || (config.equippedHat === "helmet" ? "#6b7280" : accentColor);
  const shoesColor = config.shoesColor || (config.equippedShoes === "boots" ? accentColor : "#374151");
  const pantsColor = config.pantsColor || "#374151";
  // Role-based default emblem (star/group/scales) — falls back only when the
  // user has never picked a badge; an explicit past choice (including one
  // that happens to equal another role's default) always wins.
  const badgeStyle = config.badgeStyle ?? BADGE_STYLE_BY_TYPE[userType];
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

  // The "jacket" is the armored-look layer as a whole (belt, gloves,
  // shoulder/arm/leg armor, the pronounced tier-based V-taper) — `false`
  // reverts to a plain-t-shirt silhouette regardless of level, same as
  // taking off a jacket to reveal the shirt underneath. Missing (older
  // saved configs) defaults to worn, so nobody's look changes just because
  // this field didn't exist yet when they last saved.
  const hasJacket = config.equippedJacket !== false;
  const waistTaperRatio = hasJacket ? silhouette.waistTaperRatio : CASUAL_WAIST_TAPER_RATIO;
  // Tier 3+: "you've earned real armor now" — same threshold as the
  // hat/weapon unlock and the accent-glow effect.
  const showPauldrons = hasJacket && badgeTier >= 3;
  // Tier 4+: same threshold as the shield unlock — "more substantial armor".
  const showLimbArmor = hasJacket && badgeTier >= 4;
  const showAura = showLevelEffects && badgeTier >= 5;
  // Wings are gated the same as the aura (tier 5+, only above
  // LEVEL_EFFECTS_MIN_SIZE) — a decorative escalation, not a body-shape
  // change, so it follows the same "skip it at leaderboard-row size" policy.
  const showWings = showAura;
  const hasMetallicEquipment =
    config.equippedWeapon != null || config.equippedShield || config.equippedHat === "helmet" || showWings;
  const showAccentGlow = showLevelEffects && badgeTier >= 3;

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
        {showWings && <Wings tint={accentLight} metallicSheenId={metallicSheenId} />}
        {config.equippedCape && <CapeEquipment color={bodyColor} />}
        <LeftArm skinColor={skinColor} armX={silhouette.armLeftX} armWidth={silhouette.armWidth} />
        <RightArm skinColor={skinColor} armX={silhouette.armRightX} armWidth={silhouette.armWidth} />
        <CharacterFace
          skinColor={skinColor}
          hairColor={hairColor}
          hairStyle={config.hairStyle || DEFAULT_AVATAR_CONFIG.hairStyle}
          blinkDelay={blinkDelay}
          expression={config.expression || "happy"}
        />
        <ThemeUniform
          bodyColor={bodyColor}
          badgeAccent={accentColor}
          torsoX={silhouette.torsoX}
          torsoWidth={silhouette.torsoWidth}
          waistTaperRatio={waistTaperRatio}
          pattern={config.uniformPattern}
          badgeStyle={badgeStyle}
        />
        {showPauldrons && (
          <>
            <Belt
              torsoX={silhouette.torsoX}
              torsoWidth={silhouette.torsoWidth}
              waistTaperRatio={waistTaperRatio}
            />
            <Glove color={bodyColor} cx={silhouette.armLeftX + 6} />
            <Glove color={bodyColor} cx={silhouette.armRightX + silhouette.armWidth - 6} />
            <Pauldron
              color={bodyColor}
              armX={silhouette.armLeftX}
              armWidth={silhouette.armWidth}
              badgeTier={badgeTier}
            />
            <Pauldron
              color={bodyColor}
              armX={silhouette.armRightX}
              armWidth={silhouette.armWidth}
              badgeTier={badgeTier}
            />
          </>
        )}
        {showLimbArmor && (
          <>
            <ArmGuard color={bodyColor} armX={silhouette.armLeftX} armWidth={silhouette.armWidth} />
            <ArmGuard color={bodyColor} armX={silhouette.armRightX} armWidth={silhouette.armWidth} />
          </>
        )}
        {showAccentGlow && config.equippedHat && (
          <circle cx="50" cy="21" r="14" fill={`url(#${accentGlowId})`} />
        )}
        {config.equippedHat === "helmet" && (
          <HelmetEquipment color={hatColor} metallicSheenId={metallicSheenId} badgeTier={badgeTier} />
        )}
        {config.equippedHat === "cap" && <CapEquipment color={hatColor} />}
        {config.hasGlasses && <GlassesEquipment style={config.glassesStyle} />}
        {config.equippedMask && <MaskEquipment style={config.maskStyle} />}
        {config.equippedSanitizer && <SanitizerEquipment />}
        {/* cx/r pulled in from the original (90, r=12 -> right edge at x=102)
            so it stays within the viewBox's own x=100 edge instead of
            clipping into a flat side, same fix as the gun's emitter/flash. */}
        {showAccentGlow && config.equippedWeapon && (
          <circle cx="87" cy="65" r="11" fill={`url(#${accentGlowId})`} />
        )}
        {config.equippedWeapon === "sword" && (
          <SwordEquipment
            color={weaponColor}
            metallicSheenId={metallicSheenId}
            glowId={badgeTier >= 5 && showAccentGlow ? accentGlowId : undefined}
          />
        )}
        {config.equippedWeapon === "gun" && (
          <GunEquipment color={weaponColor} metallicSheenId={metallicSheenId} />
        )}
        {config.equippedWeapon === "staff" && (
          <StaffEquipment color={weaponColor} metallicSheenId={metallicSheenId} />
        )}
        {config.equippedWeapon === "chakram" && (
          <ChakramEquipment color={weaponColor} metallicSheenId={metallicSheenId} />
        )}
        {config.equippedShield && <ShieldEquipment color={shieldColor} metallicSheenId={metallicSheenId} />}
      </g>

      <g transform={LEFT_LEG_ROTATION}>
        <LeftLeg skinColor={skinColor} pantsColor={pantsColor} />
        {showLimbArmor && <LeftLegGuard color={bodyColor} />}
        {config.equippedShoes === "basic" && <BasicShoesLeft color={shoesColor} />}
        {config.equippedShoes === "boots" && <BootsLeft color={shoesColor} />}
      </g>
      <g transform={RIGHT_LEG_ROTATION}>
        <RightLeg skinColor={skinColor} pantsColor={pantsColor} />
        {showLimbArmor && <RightLegGuard color={bodyColor} />}
        {config.equippedShoes === "basic" && <BasicShoesRight color={shoesColor} />}
        {config.equippedShoes === "boots" && <BootsRight color={shoesColor} />}
      </g>
    </svg>
  );
}
