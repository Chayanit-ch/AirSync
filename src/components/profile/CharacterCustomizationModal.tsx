import { CheckCircle2, Lock, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AvatarConfig, UserType } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { updateUserAvatarConfig } from "../../services/userProfile";
import {
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  HAT_OPTIONS,
  SKIN_TONE_OPTIONS,
  UNIFORM_COLOR_OPTIONS,
  getUnlockedSlots,
} from "../../utils/avatarCustomization";
import { CharacterAvatar } from "./CharacterAvatar";

interface CharacterCustomizationModalProps {
  /** `null` renders nothing — same mount pattern as `ReportDetailModal`/`OrganizationRatingModal`. */
  open: boolean;
  uid?: string;
  userType: UserType;
  level: number;
  currentConfig: AvatarConfig;
  onClose: () => void;
}

const SAVED_CONFIRMATION_DURATION_MS = 3000;

export function CharacterCustomizationModal({
  open,
  uid,
  userType,
  level,
  currentConfig,
  onClose,
}: CharacterCustomizationModalProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<AvatarConfig>(currentConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const unlocked = getUnlockedSlots(level);

  // Re-sync the draft from whatever's actually saved whenever the modal is
  // (re)opened — never mid-edit, so an in-progress selection is never
  // clobbered by a stray re-render.
  useEffect(() => {
    if (open) setDraft(currentConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), SAVED_CONFIRMATION_DURATION_MS);
    return () => clearTimeout(timer);
  }, [justSaved]);

  if (!open) return null;

  async function handleSave() {
    if (!uid || isSaving) return;
    setIsSaving(true);
    setJustSaved(false);
    try {
      await updateUserAvatarConfig(uid, draft);
      setJustSaved(true);
    } finally {
      setIsSaving(false);
    }
  }

  /** An option row: locked options are greyed + captioned, EXCEPT the option currently selected in the draft — that one always stays choosable (so toggling something off never gets stuck), matching the "never revoked" principle even inside the editor itself. */
  function OptionButton({
    label,
    ariaLabel,
    isSelected,
    isUnlocked,
    onClick,
    swatch,
  }: {
    label: string;
    /** Distinct from `label` for options reused across multiple slots (e.g. every on/off toggle says "On"/"Off") — otherwise screen readers (and, incidentally, tests) can't tell them apart. */
    ariaLabel?: string;
    isSelected: boolean;
    isUnlocked: boolean;
    onClick: () => void;
    swatch?: string;
  }) {
    const disabled = !isUnlocked && !isSelected;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={ariaLabel ?? label}
        title={disabled ? t("profile.avatar.unlocksAtLevel", { level }) : undefined}
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
          isSelected
            ? "border-brand-600 bg-brand-50 text-brand-700"
            : disabled
              ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}
      >
        {swatch && (
          <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: swatch }} />
        )}
        {label}
        {disabled && <Lock size={12} />}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-1000 flex items-end justify-center lg:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-customization-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl lg:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-2 p-4 pb-0">
          <h2 id="character-customization-title" className="text-lg font-bold text-gray-900">
            {t("profile.avatar.modalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sticky preview — stays fixed while only the options body below
            scrolls, so changing an option never requires scrolling back up
            to see the result (see the modal's max-h-[85vh] + flex-col split
            above, and the flex-1 overflow-y-auto body below). */}
        <div className="mx-4 mt-3 mb-1 flex shrink-0 justify-center rounded-xl border border-gray-100 bg-gray-50 py-3">
          <CharacterAvatar avatarConfig={draft} userType={userType} level={level} size={140} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-3">
        <div className="flex flex-col gap-4 text-sm">
          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.skinTone")}</p>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONE_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={t(`profile.avatar.skinTones.${opt.value}`)}
                  swatch={opt.hex}
                  isSelected={draft.skinTone === opt.value}
                  isUnlocked
                  onClick={() => setDraft((d) => ({ ...d, skinTone: opt.value }))}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.hairStyle")}</p>
            <div className="flex flex-wrap gap-2">
              {HAIR_STYLE_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={t(`profile.avatar.hairStyles.${opt.value}`)}
                  isSelected={draft.hairStyle === opt.value}
                  isUnlocked
                  onClick={() => setDraft((d) => ({ ...d, hairStyle: opt.value }))}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.hairColor")}</p>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLOR_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={t(`profile.avatar.hairColors.${opt.value}`)}
                  swatch={opt.hex}
                  isSelected={draft.hairColor === opt.value}
                  isUnlocked
                  onClick={() => setDraft((d) => ({ ...d, hairColor: opt.value }))}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.glasses")}</p>
            <div className="flex flex-wrap gap-2">
              <OptionButton
                label={t("profile.avatar.on")}
                ariaLabel={`${t("profile.avatar.glasses")}: ${t("profile.avatar.on")}`}
                isSelected={draft.hasGlasses}
                isUnlocked={unlocked.glasses}
                onClick={() => setDraft((d) => ({ ...d, hasGlasses: true }))}
              />
              <OptionButton
                label={t("profile.avatar.off")}
                ariaLabel={`${t("profile.avatar.glasses")}: ${t("profile.avatar.off")}`}
                isSelected={!draft.hasGlasses}
                isUnlocked
                onClick={() => setDraft((d) => ({ ...d, hasGlasses: false }))}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.mask")}</p>
            <div className="flex flex-wrap gap-2">
              <OptionButton
                label={t("profile.avatar.on")}
                ariaLabel={`${t("profile.avatar.mask")}: ${t("profile.avatar.on")}`}
                isSelected={!!draft.equippedMask}
                isUnlocked={unlocked.mask}
                onClick={() => setDraft((d) => ({ ...d, equippedMask: true }))}
              />
              <OptionButton
                label={t("profile.avatar.off")}
                ariaLabel={`${t("profile.avatar.mask")}: ${t("profile.avatar.off")}`}
                isSelected={!draft.equippedMask}
                isUnlocked
                onClick={() => setDraft((d) => ({ ...d, equippedMask: false }))}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.sanitizer")}</p>
            <div className="flex flex-wrap gap-2">
              <OptionButton
                label={t("profile.avatar.on")}
                ariaLabel={`${t("profile.avatar.sanitizer")}: ${t("profile.avatar.on")}`}
                isSelected={!!draft.equippedSanitizer}
                isUnlocked={unlocked.sanitizer}
                onClick={() => setDraft((d) => ({ ...d, equippedSanitizer: true }))}
              />
              <OptionButton
                label={t("profile.avatar.off")}
                ariaLabel={`${t("profile.avatar.sanitizer")}: ${t("profile.avatar.off")}`}
                isSelected={!draft.equippedSanitizer}
                isUnlocked
                onClick={() => setDraft((d) => ({ ...d, equippedSanitizer: false }))}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.hat")}</p>
            <div className="flex flex-wrap gap-2">
              {HAT_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={t(`profile.avatar.hats.${opt.value}`)}
                  isSelected={draft.equippedHat === opt.value}
                  isUnlocked={unlocked.hat}
                  onClick={() => setDraft((d) => ({ ...d, equippedHat: opt.value }))}
                />
              ))}
              <OptionButton
                label={t("profile.avatar.hats.none")}
                isSelected={!draft.equippedHat}
                isUnlocked
                onClick={() => setDraft((d) => ({ ...d, equippedHat: null }))}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.weapon")}</p>
            <div className="flex flex-wrap gap-2">
              <OptionButton
                label={t("profile.avatar.weapons.sword")}
                isSelected={draft.equippedWeapon === "sword"}
                isUnlocked={unlocked.weapon}
                onClick={() => setDraft((d) => ({ ...d, equippedWeapon: "sword" }))}
              />
              <OptionButton
                label={t("profile.avatar.weapons.gun")}
                isSelected={draft.equippedWeapon === "gun"}
                isUnlocked={unlocked.weapon}
                onClick={() => setDraft((d) => ({ ...d, equippedWeapon: "gun" }))}
              />
              <OptionButton
                label={t("profile.avatar.weapons.none")}
                isSelected={!draft.equippedWeapon}
                isUnlocked
                onClick={() => setDraft((d) => ({ ...d, equippedWeapon: null }))}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.shield")}</p>
            <div className="flex flex-wrap gap-2">
              <OptionButton
                label={t("profile.avatar.on")}
                ariaLabel={`${t("profile.avatar.shield")}: ${t("profile.avatar.on")}`}
                isSelected={draft.equippedShield}
                isUnlocked={unlocked.shield}
                onClick={() => setDraft((d) => ({ ...d, equippedShield: true }))}
              />
              <OptionButton
                label={t("profile.avatar.off")}
                ariaLabel={`${t("profile.avatar.shield")}: ${t("profile.avatar.off")}`}
                isSelected={!draft.equippedShield}
                isUnlocked
                onClick={() => setDraft((d) => ({ ...d, equippedShield: false }))}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.cape")}</p>
            <div className="flex flex-wrap gap-2">
              <OptionButton
                label={t("profile.avatar.on")}
                ariaLabel={`${t("profile.avatar.cape")}: ${t("profile.avatar.on")}`}
                isSelected={draft.equippedCape}
                isUnlocked={unlocked.cape}
                onClick={() => setDraft((d) => ({ ...d, equippedCape: true }))}
              />
              <OptionButton
                label={t("profile.avatar.off")}
                ariaLabel={`${t("profile.avatar.cape")}: ${t("profile.avatar.off")}`}
                isSelected={!draft.equippedCape}
                isUnlocked
                onClick={() => setDraft((d) => ({ ...d, equippedCape: false }))}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.shoes")}</p>
            <div className="flex flex-wrap gap-2">
              <OptionButton
                label={t("profile.avatar.shoesOptions.basic")}
                isSelected={draft.equippedShoes === "basic"}
                isUnlocked
                onClick={() => setDraft((d) => ({ ...d, equippedShoes: "basic" }))}
              />
              <OptionButton
                label={t("profile.avatar.shoesOptions.boots")}
                isSelected={draft.equippedShoes === "boots"}
                isUnlocked={unlocked.bootsShoes}
                onClick={() => setDraft((d) => ({ ...d, equippedShoes: "boots" }))}
              />
              <OptionButton
                label={t("profile.avatar.shoesOptions.none")}
                isSelected={!draft.equippedShoes}
                isUnlocked
                onClick={() => setDraft((d) => ({ ...d, equippedShoes: null }))}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-gray-700">{t("profile.avatar.uniformColor")}</p>
            <div className="flex flex-wrap gap-2">
              <OptionButton
                label={t("profile.avatar.uniformColorDefault")}
                isSelected={!draft.uniformColor}
                isUnlocked
                onClick={() => setDraft((d) => ({ ...d, uniformColor: null }))}
              />
              {UNIFORM_COLOR_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={t(`profile.avatar.uniformColors.${opt.value}`)}
                  swatch={opt.hex}
                  isSelected={draft.uniformColor === opt.hex}
                  isUnlocked={unlocked.uniformColor}
                  onClick={() => setDraft((d) => ({ ...d, uniformColor: opt.hex }))}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!uid || isSaving}
            className="bg-brand-600 hover:bg-brand-700 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? t("profile.saving") : t("profile.saveButton")}
          </button>
          {justSaved && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 size={14} />
              {t("profile.savedConfirmation")}
            </p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
