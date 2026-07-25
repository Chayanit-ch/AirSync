import type { AvatarConfig } from "../types";

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
  { value: "bald" },
];

export const HAIR_COLOR_OPTIONS: PresetOption[] = [
  { value: "black", hex: "#1f2937" },
  { value: "brown", hex: "#6b4226" },
  { value: "blonde", hex: "#d9a441" },
  { value: "auburn", hex: "#a04b2b" },
  { value: "gray", hex: "#9ca3af" },
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
  shield: boolean;
  cape: boolean;
  bootsShoes: boolean;
}

/**
 * The single source of truth for which equipment slots a level has opened
 * up — thresholds live here only, so "order and thresholds can be
 * adjusted" (per spec) stays a one-line change. Takes an already-computed
 * `level` (from `getLevelFromPoints()`) rather than points, so this file
 * never recalculates level itself. Face options (skin/hair style/hair
 * color) have no threshold — available from level 1 per spec.
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
    shield: level >= 4,
    cape: level >= 5,
    bootsShoes: level >= 5,
  };
}
