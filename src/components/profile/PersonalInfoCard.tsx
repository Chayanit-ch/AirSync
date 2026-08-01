import { CheckCircle2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { CommuteMethod, RiskGroup } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { updateDailyContext, updateHealthNotes, updateRiskGroup } from "../../services/userProfile";
import { resolveRiskGroup } from "../../utils/recommendation";
import { ToggleSwitch } from "../shared/ToggleSwitch";

const RISK_GROUPS: RiskGroup[] = ["general", "children", "elderly", "respiratory", "outdoor_worker"];
const COMMUTE_METHODS: CommuteMethod[] = ["walk", "public_transit", "motorcycle", "car", "other"];
const SAVED_CONFIRMATION_DURATION_MS = 3000;

/**
 * Kept separate from `AlertPreferencesCard` (notification mechanics) since
 * this is "who you are" data, not "how you get notified" — and unlike that
 * card's instant-apply-per-toggle pattern, every field here is a local draft
 * that only reaches Firestore on an explicit Save click, so the user always
 * knows exactly what's about to be recorded and can re-save as often as
 * they like.
 */
export function PersonalInfoCard() {
  const { currentUser, userProfile, loading } = useAuth();
  const { t } = useTranslation();
  const uid = currentUser?.uid;
  const controlsDisabled = loading || !uid;

  const [riskGroupDraft, setRiskGroupDraft] = useState<RiskGroup>("general");
  const [commuteMethodDraft, setCommuteMethodDraft] = useState<CommuteMethod | "">("");
  const [worksOutdoorsDraft, setWorksOutdoorsDraft] = useState(false);
  const [hasOutdoorPlansTodayDraft, setHasOutdoorPlansTodayDraft] = useState(false);
  const [exerciseOutdoorsDraft, setExerciseOutdoorsDraft] = useState(false);
  const [healthNotesDraft, setHealthNotesDraft] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Drafts only re-sync from the live profile when a different user's data
  // arrives — otherwise a save-in-progress's own `onSnapshot` echo (or any
  // background snapshot update) would clobber whatever the user is
  // currently typing/selecting before they've clicked Save.
  useEffect(() => {
    setRiskGroupDraft(resolveRiskGroup(userProfile?.riskGroup));
    setCommuteMethodDraft(userProfile?.dailyContext?.commuteMethod ?? "");
    setWorksOutdoorsDraft(userProfile?.dailyContext?.worksOutdoors ?? false);
    setHasOutdoorPlansTodayDraft(userProfile?.dailyContext?.hasOutdoorPlansToday ?? false);
    setExerciseOutdoorsDraft(userProfile?.dailyContext?.exerciseOutdoors ?? false);
    setHealthNotesDraft(userProfile?.healthNotes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), SAVED_CONFIRMATION_DURATION_MS);
    return () => clearTimeout(timer);
  }, [justSaved]);

  async function handleSave() {
    if (!uid || controlsDisabled) return;
    setIsSaving(true);
    setJustSaved(false);
    try {
      await Promise.all([
        updateRiskGroup(uid, riskGroupDraft),
        updateDailyContext(uid, {
          commuteMethod: commuteMethodDraft || undefined,
          worksOutdoors: worksOutdoorsDraft,
          hasOutdoorPlansToday: hasOutdoorPlansTodayDraft,
          exerciseOutdoors: exerciseOutdoorsDraft,
        }),
        updateHealthNotes(uid, healthNotesDraft),
      ]);
      setJustSaved(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <UserRound size={18} className="text-brand-600" />
        <h2 className="text-lg font-bold text-gray-800">{t("profile.personalInfoTitle")}</h2>
      </div>

      <div className="py-3">
        <label htmlFor="profile-risk-group" className="mb-1.5 block text-sm text-gray-700">
          {t("profile.riskGroupLabel")}
        </label>
        <select
          id="profile-risk-group"
          name="risk-group"
          value={riskGroupDraft}
          disabled={controlsDisabled}
          onChange={(e) => setRiskGroupDraft(e.target.value as RiskGroup)}
          className="focus:border-brand-500 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none disabled:opacity-60"
        >
          {RISK_GROUPS.map((group) => (
            <option key={group} value={group}>
              {t(`profile.riskGroups.${group}`)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">{t("profile.riskGroupHint")}</p>
      </div>

      <div className="border-t border-gray-100 py-3">
        <p className="mb-1.5 text-sm text-gray-700">{t("profile.dailyContext.sectionLabel")}</p>
        <p className="mb-2 text-xs text-gray-400">{t("profile.dailyContext.sectionHint")}</p>

        <label htmlFor="profile-commute-method" className="mb-1.5 block text-sm text-gray-700">
          {t("profile.dailyContext.commuteMethodLabel")}
        </label>
        <select
          id="profile-commute-method"
          name="commute-method"
          value={commuteMethodDraft}
          disabled={controlsDisabled}
          onChange={(e) => setCommuteMethodDraft(e.target.value as CommuteMethod)}
          className="focus:border-brand-500 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none disabled:opacity-60"
        >
          <option value="" disabled>
            {t("profile.dailyContext.commuteMethodLabel")}
          </option>
          {COMMUTE_METHODS.map((method) => (
            <option key={method} value={method}>
              {t(`profile.dailyContext.commuteMethods.${method}`)}
            </option>
          ))}
        </select>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-gray-700">{t("profile.dailyContext.worksOutdoors")}</span>
          <ToggleSwitch
            label={t("profile.dailyContext.worksOutdoors")}
            checked={worksOutdoorsDraft}
            onChange={setWorksOutdoorsDraft}
            disabled={controlsDisabled}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-gray-700">
            {t("profile.dailyContext.hasOutdoorPlansToday")}
          </span>
          <ToggleSwitch
            label={t("profile.dailyContext.hasOutdoorPlansToday")}
            checked={hasOutdoorPlansTodayDraft}
            onChange={setHasOutdoorPlansTodayDraft}
            disabled={controlsDisabled}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-gray-700">
            {t("profile.dailyContext.exerciseOutdoors")}
          </span>
          <ToggleSwitch
            label={t("profile.dailyContext.exerciseOutdoors")}
            checked={exerciseOutdoorsDraft}
            onChange={setExerciseOutdoorsDraft}
            disabled={controlsDisabled}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 py-3">
        <label htmlFor="profile-health-notes" className="mb-1.5 block text-sm text-gray-700">
          {t("profile.healthNotesLabel")}
        </label>
        <textarea
          id="profile-health-notes"
          name="health-notes"
          rows={3}
          value={healthNotesDraft}
          disabled={controlsDisabled}
          onChange={(e) => setHealthNotesDraft(e.target.value)}
          placeholder={t("profile.healthNotesPlaceholder")}
          className="focus:border-brand-500 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none placeholder:text-gray-400 disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-gray-400">{t("profile.healthNotesPrivacyHint")}</p>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={controlsDisabled || isSaving}
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
  );
}
