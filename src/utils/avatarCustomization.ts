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

/** `captain`/`headset`/`headphones` are additions alongside the original `helmet`/`cap`. `headphones` (no mic — plain over-ear look) stays available to every role, same as `helmet`/`cap`; `captain` and `headset` (WITH a mic boom) are each role-exclusive instead — see `EXCLUSIVE_HAT_BY_TYPE`. */
export const HAT_OPTIONS: { value: "helmet" | "cap" | "captain" | "headset" | "headphones" }[] = [
  { value: "helmet" },
  { value: "cap" },
  { value: "captain" },
  { value: "headset" },
  { value: "headphones" },
];

/**
 * Hat values present here are locked to ONE role, same "filtered out of
 * every other role's picker entirely" convention as
 * `EXCLUSIVE_WEAPON_BY_TYPE` — `captain` (government's peaked officer cap)
 * and `headset` (organization's mic-equipped headset). Every hat NOT listed
 * here (helmet/cap/headphones) stays available to every role, unchanged.
 */
export const EXCLUSIVE_HAT_BY_TYPE: Partial<Record<string, UserType>> = {
  captain: "government",
  headset: "organization",
};

/** `sword`/`gun` unlock at `getUnlockedSlots(level).weapon` (level 3); `staff`/`chakram`/`boomerang`/`slingshot` are the "for high levels" tier, gated behind the separate, later `advancedWeapon` threshold (level 5) instead. `boomerang`/`slingshot` are ALSO role-exclusive — see `EXCLUSIVE_WEAPON_BY_TYPE` — so the customization modal filters them out of any other role's option list entirely, rather than showing them locked. */
export const WEAPON_OPTIONS: { value: "sword" | "gun" | "staff" | "chakram" | "boomerang" | "slingshot" }[] = [
  { value: "sword" },
  { value: "gun" },
  { value: "staff" },
  { value: "chakram" },
  { value: "boomerang" },
  { value: "slingshot" },
];

/**
 * Weapon values present here are locked to ONE role — everyone else never
 * sees them in the picker at all (see `CharacterCustomizationModal`'s
 * `WEAPON_OPTIONS.filter(...)`). Every weapon NOT listed here (sword/gun/
 * staff/chakram) stays available to every role, unchanged. This is the only
 * equipment slot with role-exclusive items — badge/mask/shield/hat are all
 * either freely shared (hats) or merely role-DEFAULTED, never exclusive.
 */
export const EXCLUSIVE_WEAPON_BY_TYPE: Partial<Record<string, UserType>> = {
  boomerang: "organization",
  slingshot: "government",
};

/** No level threshold — same "always available from level 1" precedent as skin tone/hair (see `getUnlockedSlots`'s doc comment). `scanner`/`laser` are the "heroic tech" options (glowing HUD bar / laser-dot lenses) — like every option here, freely pickable by any role. */
export const GLASSES_STYLE_OPTIONS: { value: string }[] = [
  { value: "round" },
  { value: "square" },
  { value: "shades" },
  { value: "scanner" },
  { value: "laser" },
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

/**
 * The mask's shape is ROLE-LOCKED, unlike every other equipment
 * style/color field in this file — citizen "hygiene" (plain civilian mask),
 * organization "visor" (cyan tactical visor), government "inspector" (gold
 * official visor). There is deliberately NO picker/options list and no
 * `AvatarConfig.maskStyle` field for this: the user only ever toggles
 * `equippedMask` on/off (see `getUnlockedSlots().mask`), and the shape itself
 * always comes from here. Each shape instead "upgrades" cosmetically with
 * `badgeTier` — see `MaskEquipment`'s own tier-escalation branches.
 */
export const MASK_STYLE_BY_TYPE: Record<UserType, string> = {
  citizen: "hygiene",
  organization: "visor",
  government: "inspector",
};

/** The shield's shape — `round` (original) plus `tactical`/`heraldic` role-flavored alternatives — no level threshold beyond `equippedShield` itself already requiring one. Unlike the mask, this stays a free user choice (see `SHIELD_STYLE_BY_TYPE` for the role-appropriate default only). */
export const SHIELD_STYLE_OPTIONS: { value: string }[] = [
  { value: "round" },
  { value: "tactical" },
  { value: "heraldic" },
];

/** Role-appropriate DEFAULT shield shape, same fallback-only convention as `BADGE_STYLE_BY_TYPE`/`MASK_STYLE_BY_TYPE`. */
export const SHIELD_STYLE_BY_TYPE: Record<UserType, string> = {
  citizen: "round",
  organization: "tactical",
  government: "heraldic",
};

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
  // `badgeStyle`/`shieldStyle` deliberately have NO flat literal default here
  // (unlike every other field) — their defaults are ROLE-dependent (see
  // `BADGE_STYLE_BY_TYPE`/`SHIELD_STYLE_BY_TYPE`), resolved in
  // `CharacterAvatar`/`CharacterCustomizationModal` where `userType` is in
  // scope; leaving them undefined here lets that role fallback apply instead
  // of one fixed value. `maskStyle` isn't a field at all — see
  // `MASK_STYLE_BY_TYPE`'s doc comment for why it's role-LOCKED, not merely
  // role-defaulted.
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
