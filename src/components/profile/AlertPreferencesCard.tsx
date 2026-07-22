import { Bell, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  CommuteMethod,
  DailyContext,
  MonitoringStation,
  RiskGroup,
  StationMetadata,
} from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { resolveStationReading } from "../../services/airQuality";
import {
  followArea,
  unfollowArea,
  updateDailyContext,
  updateHealthNotes,
  updateNotificationSettings,
  updateRiskGroup,
} from "../../services/userProfile";
import { resolveRiskGroup } from "../../utils/recommendation";
import { searchStations } from "../../utils/stationSearch";
import { ToggleSwitch } from "../shared/ToggleSwitch";

const MAX_SEARCH_RESULTS = 8;
const RISK_GROUPS: RiskGroup[] = ["general", "children", "elderly", "respiratory", "outdoor_worker"];
const COMMUTE_METHODS: CommuteMethod[] = ["walk", "public_transit", "motorcycle", "car", "other"];

export function AlertPreferencesCard({
  stations,
  stationCatalog,
}: {
  /** Currently-live stations only — used to determine each result's `isLive` status. */
  stations: MonitoringStation[];
  /** The FULL nationwide station catalog (live + currently-offline) — search always runs over this. */
  stationCatalog: StationMetadata[];
}) {
  const { currentUser, userProfile, loading } = useAuth();
  const { t } = useTranslation();
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingAreaId, setPendingAreaId] = useState<string | null>(null);
  const [pendingSetting, setPendingSetting] = useState<
    "pushEnabled" | "dailySummaryEnabled" | null
  >(null);
  const [isSavingRiskGroup, setIsSavingRiskGroup] = useState(false);
  const [pendingContextField, setPendingContextField] = useState<keyof DailyContext | null>(null);
  const [healthNotesDraft, setHealthNotesDraft] = useState("");
  const [isSavingHealthNotes, setIsSavingHealthNotes] = useState(false);

  const followedAreaIds = userProfile?.followedAreaIds ?? [];
  const notificationSettings = userProfile?.notificationSettings;
  const riskGroup = resolveRiskGroup(userProfile?.riskGroup);
  const dailyContext = userProfile?.dailyContext;
  const uid = currentUser?.uid;

  // Local draft only re-syncs from the live profile when a different user's
  // data arrives — otherwise typing would keep getting overwritten by the
  // `onSnapshot` echo of our own in-flight save.
  useEffect(() => {
    setHealthNotesDraft(userProfile?.healthNotes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const catalogById = useMemo(
    () => new Map(stationCatalog.map((station) => [station.id, station])),
    [stationCatalog],
  );

  // Followed stations may not currently be in the live `stations` batch
  // (e.g. temporarily quiet) — resolve the real name from the full catalog
  // first rather than showing the raw id, matching the app's
  // never-silent-fallback rule while still being an honest place name.
  const followedStationOptions = followedAreaIds.map((id) => {
    const { station, isLive } = resolveStationReading(id, stations);
    if (isLive) return { id, name: station.name, district: station.district };
    const metadata = catalogById.get(id);
    return metadata
      ? { id, name: metadata.name, district: metadata.district }
      : { id, name: t("common.stationUnavailable", { id }), district: "" };
  });

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const notFollowed = stationCatalog.filter((station) => !followedAreaIds.includes(station.id));
    return searchStations(notFollowed, searchQuery).slice(0, MAX_SEARCH_RESULTS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationCatalog, searchQuery, followedAreaIds.join(",")]);

  const controlsDisabled = loading || !uid;

  async function handleRemoveArea(areaId: string) {
    if (!uid || controlsDisabled) return;
    setPendingAreaId(areaId);
    try {
      await unfollowArea(uid, areaId);
    } finally {
      setPendingAreaId(null);
    }
  }

  async function handleAddArea(areaId: string) {
    if (!uid || controlsDisabled) return;
    setPendingAreaId(areaId);
    try {
      await followArea(uid, areaId);
      setSearchQuery("");
      setIsAddingArea(false);
    } finally {
      setPendingAreaId(null);
    }
  }

  async function handleToggle(
    key: "pushEnabled" | "dailySummaryEnabled",
    value: boolean,
  ) {
    if (!uid || controlsDisabled) return;
    setPendingSetting(key);
    try {
      await updateNotificationSettings(uid, { [key]: value });
    } finally {
      setPendingSetting(null);
    }
  }

  async function handleDailyContextField<K extends keyof DailyContext>(
    key: K,
    value: NonNullable<DailyContext[K]>,
  ) {
    if (!uid || controlsDisabled) return;
    setPendingContextField(key);
    try {
      await updateDailyContext(uid, { [key]: value });
    } finally {
      setPendingContextField(null);
    }
  }

  async function handleHealthNotesBlur() {
    if (!uid || controlsDisabled) return;
    if (healthNotesDraft === (userProfile?.healthNotes ?? "")) return;
    setIsSavingHealthNotes(true);
    try {
      await updateHealthNotes(uid, healthNotesDraft);
    } finally {
      setIsSavingHealthNotes(false);
    }
  }

  async function handleRiskGroupChange(value: RiskGroup) {
    if (!uid || controlsDisabled) return;
    setIsSavingRiskGroup(true);
    try {
      await updateRiskGroup(uid, value);
    } finally {
      setIsSavingRiskGroup(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Bell size={18} className="text-brand-600" />
        <h2 className="text-lg font-bold text-gray-800">{t("profile.notificationSettings")}</h2>
      </div>

      <p className="mb-2 text-sm text-gray-500">
        {t("profile.followedStationsLabel")}
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {followedStationOptions.map((station) => (
          <span
            key={station.id}
            className="bg-brand-50 text-brand-700 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            {station.district ? `${station.name} (${station.district})` : station.name}
            <button
              type="button"
              onClick={() => handleRemoveArea(station.id)}
              disabled={controlsDisabled || pendingAreaId === station.id}
              aria-label={t("profile.removeAreaLabel", { name: station.name })}
              className="disabled:opacity-40"
            >
              <X size={13} />
            </button>
          </span>
        ))}

        {!isAddingArea && (
          <button
            type="button"
            onClick={() => setIsAddingArea(true)}
            disabled={controlsDisabled}
            className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 disabled:opacity-40"
          >
            <Plus size={13} />
            {t("profile.addArea")}
          </button>
        )}
      </div>

      {isAddingArea && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <Search size={16} className="shrink-0 text-gray-400" />
            <input
              type="text"
              id="profile-station-search"
              name="profile-station-search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("profile.searchStationPlaceholder")}
              aria-label={t("profile.searchStationPlaceholder")}
              className="w-full text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() => {
                setIsAddingArea(false);
                setSearchQuery("");
              }}
              aria-label={t("profile.closeSearch")}
              className="shrink-0 text-gray-400"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            {searchQuery.trim() === "" ? (
              <p className="px-1 py-2 text-xs text-gray-400">
                {t("profile.searchHint")}
              </p>
            ) : searchResults.length === 0 ? (
              <p className="px-1 py-2 text-xs text-gray-400">{t("profile.noStationResults")}</p>
            ) : (
              searchResults.map((station) => {
                const { isLive } = resolveStationReading(station.id, stations);
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => handleAddArea(station.id)}
                    disabled={controlsDisabled || pendingAreaId === station.id}
                    className="flex flex-col items-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-left disabled:opacity-40"
                  >
                    <span className="text-sm font-medium text-gray-700">{station.name}</span>
                    <span className="text-xs text-gray-400">
                      {station.district}, {station.province}
                    </span>
                    {!isLive && (
                      <span className="text-xs font-medium text-amber-600">
                        {t("profile.stationOffline")}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 py-3">
        <label htmlFor="profile-risk-group" className="mb-1.5 block text-sm text-gray-700">
          {t("profile.riskGroupLabel")}
        </label>
        <select
          id="profile-risk-group"
          name="risk-group"
          value={riskGroup}
          disabled={controlsDisabled || isSavingRiskGroup}
          onChange={(e) => handleRiskGroupChange(e.target.value as RiskGroup)}
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

      <div className="flex items-center justify-between border-t border-gray-100 py-3">
        <span className="text-sm text-gray-700">
          {t("profile.pushNotifications")}
        </span>
        <ToggleSwitch
          label={t("profile.pushNotifications")}
          checked={notificationSettings?.pushEnabled ?? false}
          onChange={(value) => handleToggle("pushEnabled", value)}
          disabled={controlsDisabled || pendingSetting === "pushEnabled"}
        />
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 py-3">
        <span className="text-sm text-gray-700">{t("profile.dailySummary")}</span>
        <ToggleSwitch
          label={t("profile.dailySummary")}
          checked={notificationSettings?.dailySummaryEnabled ?? false}
          onChange={(value) => handleToggle("dailySummaryEnabled", value)}
          disabled={controlsDisabled || pendingSetting === "dailySummaryEnabled"}
        />
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
          value={dailyContext?.commuteMethod ?? ""}
          disabled={controlsDisabled || pendingContextField === "commuteMethod"}
          onChange={(e) => handleDailyContextField("commuteMethod", e.target.value as CommuteMethod)}
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
            checked={dailyContext?.worksOutdoors ?? false}
            onChange={(value) => handleDailyContextField("worksOutdoors", value)}
            disabled={controlsDisabled || pendingContextField === "worksOutdoors"}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-gray-700">
            {t("profile.dailyContext.hasOutdoorPlansToday")}
          </span>
          <ToggleSwitch
            label={t("profile.dailyContext.hasOutdoorPlansToday")}
            checked={dailyContext?.hasOutdoorPlansToday ?? false}
            onChange={(value) => handleDailyContextField("hasOutdoorPlansToday", value)}
            disabled={controlsDisabled || pendingContextField === "hasOutdoorPlansToday"}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-gray-700">
            {t("profile.dailyContext.exerciseOutdoors")}
          </span>
          <ToggleSwitch
            label={t("profile.dailyContext.exerciseOutdoors")}
            checked={dailyContext?.exerciseOutdoors ?? false}
            onChange={(value) => handleDailyContextField("exerciseOutdoors", value)}
            disabled={controlsDisabled || pendingContextField === "exerciseOutdoors"}
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
          disabled={controlsDisabled || isSavingHealthNotes}
          onChange={(e) => setHealthNotesDraft(e.target.value)}
          onBlur={handleHealthNotesBlur}
          placeholder={t("profile.healthNotesPlaceholder")}
          className="focus:border-brand-500 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none placeholder:text-gray-400 disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-gray-400">{t("profile.healthNotesPrivacyHint")}</p>
      </div>
    </div>
  );
}
