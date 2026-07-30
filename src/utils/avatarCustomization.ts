import type { AvatarConfig, UserType } from "../types";

export interface PresetOption {
  value: string;
  /** Swatch color shown in the customization UI (and used directly as the SVG fill). */
  hex: string;
}

/** 5 presets, deliberately spanning a real range rather than 2-3 token options. */
export const SKIN_TONE_OPTIONS: PresetOption[] = [
  { value: "porcelain", hex: "#f4d3c1" },
  { value: "light", hex: "#e8b894" },
  { value: "tan", hex: "#c98a5e" },
  { value: "brown", hex: "#8d5a3c" },
  { value: "deep", hex: "#5a3825" },
];

export const HAIR_STYLE_OPTIONS: { value: string }[] = [
  { value: "short" },
  { value: "long" },
  { value: "bob" },
  { value: "ponytail" },
  { value: "curly" },
  { value: "sideShaved" },
  { value: "bald" },
];

export const HAIR_COLOR_OPTIONS: PresetOption[] = [
  { value: "black", hex: "#1f2937" },
  { value: "brown", hex: "#6b4226" },
  { value: "blonde", hex: "#d9a441" },
  { value: "auburn", hex: "#a04b2b" },
  { value: "gray", hex: "#9ca3af" },
];

export const HAT_OPTIONS: { value: "helmet" | "cap" }[] = [
  { value: "helmet" },
  { value: "cap" },
];

/** `sword`/`gun` unlock at `getUnlockedSlots(level).weapon` (level 3); `staff`/`chakram` are the "for high levels" tier, gated behind the separate, later `advancedWeapon` threshold (level 5) instead. */
export const WEAPON_OPTIONS: { value: "sword" | "gun" | "staff" | "chakram" }[] = [
  { value: "sword" },
  { value: "gun" },
  { value: "staff" },
  { value: "chakram" },
];

/** No level threshold — same "always available from level 1" precedent as skin tone/hair (see `getUnlockedSlots`'s doc comment). */
export const GLASSES_STYLE_OPTIONS: { value: string }[] = [
  { value: "round" },
  { value: "square" },
  { value: "shades" },
];

/** The chest emblem shape — no level threshold, same personalization precedent as `EXPRESSION_OPTIONS`/`GLASSES_STYLE_OPTIONS`. `group`/`scales` exist mainly so `BADGE_STYLE_BY_TYPE` has a distinct emblem per role, but (per "still fully overridable") anyone can pick any of these. */
export const BADGE_STYLE_OPTIONS: { value: string }[] = [
  { value: "star" },
  { value: "shield" },
  { value: "circle" },
  { value: "diamond" },
  { value: "group" },
  { value: "scales" },
];

/**
 * Role-appropriate DEFAULT chest emblem — citizen "Air Guardian" (star),
 * organization "Air Guardian Organization" (group/community), government
 * "Air Inspector" (scales of justice) — so a fresh, never-customized
 * character is recognizable as its role at a glance (per the reference
 * design), without touching the level-gated unlock system at all: the badge
 * has no level threshold (see `getUnlockedSlots`), so this is safe to key
 * off role alone. Only used as a FALLBACK when `AvatarConfig.badgeStyle` is
 * unset — a user who's ever picked a different badge keeps their choice
 * forever, same as every other customization field.
 */
export const BADGE_STYLE_BY_TYPE: Record<UserType, string> = {
  citizen: "star",
  organization: "group",
  government: "scales",
};

/** `null`/missing means "use the role's default color" — see `AvatarConfig.uniformColor`. Also reused as-is for the per-piece `weaponColor`/`shieldColor`/`hatColor`/`shoesColor` pickers (same 5 swatches, same "default" convention), rather than maintaining a near-duplicate list per equipment slot. */
export const UNIFORM_COLOR_OPTIONS: PresetOption[] = [
  { value: "charcoal", hex: "#374151" },
  { value: "crimson", hex: "#991b1b" },
  { value: "navy", hex: "#1e3a8a" },
  { value: "teal", hex: "#0f766e" },
  { value: "violet", hex: "#6d28d9" },
];

/** No level threshold — same "always available from level 1" precedent as skin tone/hair style/color (see `getUnlockedSlots`'s doc comment): these are personalization, not power progression. */
export const EXPRESSION_OPTIONS: { value: string }[] = [
  { value: "happy" },
  { value: "neutral" },
  { value: "serious" },
  { value: "angry" },
  { value: "surprised" },
];

/** `null`/missing means plain/solid (no overlay) — see `AvatarConfig.uniformPattern`. Same "always available from level 1" precedent as expressions above. */
export const UNIFORM_PATTERN_OPTIONS: { value: string }[] = [
  { value: "stripes" },
  { value: "chevron" },
];

/** `"hygiene"` (original) or `"visor"` (a solid hero/guardian mask over the eyes) — no level threshold beyond `equippedMask` itself already requiring one (see `getUnlockedSlots().mask`). */
export const MASK_STYLE_OPTIONS: { value: string }[] = [
  { value: "hygiene" },
  { value: "visor" },
];

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinTone: SKIN_TONE_OPTIONS[0].value,
  hairStyle: HAIR_STYLE_OPTIONS[0].value,
  hairColor: HAIR_COLOR_OPTIONS[0].value,
  hasGlasses: false,
  equippedWeapon: null,
  equippedShield: false,
  equippedCape: false,
  equippedShoes: null,
  equippedMask: false,
  equippedSanitizer: false,
  equippedHat: null,
  uniformColor: null,
  expression: EXPRESSION_OPTIONS[0].value,
  uniformPattern: null,
  weaponColor: null,
  shieldColor: null,
  hatColor: null,
  shoesColor: null,
  equippedJacket: true,
  glassesStyle: GLASSES_STYLE_OPTIONS[0].value,
  pantsColor: null,
  // No flat literal default here (unlike every other field) — the default is
  // ROLE-dependent (see `BADGE_STYLE_BY_TYPE`), resolved in `CharacterAvatar`/
  // `CharacterCustomizationModal` where `userType` is in scope; leaving this
  // undefined here lets that role fallback apply instead of always "star".
  maskStyle: MASK_STYLE_OPTIONS[0].value,
};

/**
 * Never lets a missing/partial `avatarConfig` (an uncustomized or
 * pre-this-feature account) reach `CharacterAvatar` as `undefined` — every
 * caller can pass `userProfile?.avatarConfig` straight through and always
 * get a fully-populated, render-safe object back.
 */
export function resolveAvatarConfig(config: AvatarConfig | undefined | null): AvatarConfig {
  if (!config) return DEFAULT_AVATAR_CONFIG;
  return { ...DEFAULT_AVATAR_CONFIG, ...config };
}

export interface UnlockedSlots {
  glasses: boolean;
  weapon: boolean;
  /** The "for high levels" weapon tier (staff/chakram) — a later, separate threshold than `weapon` (sword/gun). */
  advancedWeapon: boolean;
  shield: boolean;
  cape: boolean;
  bootsShoes: boolean;
  mask: boolean;
  sanitizer: boolean;
  hat: boolean;
  uniformColor: boolean;
}

/**
 * The single source of truth for which equipment slots a level has opened
 * up — thresholds live here only, so "order and thresholds can be
 * adjusted" (per spec) stays a one-line change. Takes an already-computed
 * `level` (from `getLevelFromPoints()`) rather than points, so this file
 * never recalculates level itself. Face options (skin/hair style/hair
 * color) have no threshold — available from level 1 per spec. `level` is
 * uncapped (see `getLevelFromPoints`'s doc comment), so `uniformColor` can
 * sit above the level-5 badge-tier ceiling as a genuine prestige unlock.
 *
 * This is consulted ONLY by the customization screen to gate new
 * selections — never by `CharacterAvatar`, which always renders whatever
 * is actually saved in `avatarConfig` regardless of current level. That
 * split is what makes an unlock permanent even if points later drop: nothing
 * ever re-checks an already-equipped item against this function.
 */
export function getUnlockedSlots(level: number): UnlockedSlots {
  return {
    glasses: level >= 2,
    weapon: level >= 3,
    advancedWeapon: level >= 5,
    shield: level >= 4,
    cape: level >= 5,
    bootsShoes: level >= 5,
    mask: level >= 2,
    sanitizer: level >= 2,
    hat: level >= 3,
    uniformColor: level >= 6,
  };
}
