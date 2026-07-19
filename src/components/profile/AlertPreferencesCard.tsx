import { Bell, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { MonitoringStation } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import {
  followArea,
  unfollowArea,
  updateNotificationSettings,
} from "../../services/userProfile";
import { searchStations } from "../../utils/stationSearch";
import { ToggleSwitch } from "../shared/ToggleSwitch";

const MAX_SEARCH_RESULTS = 8;

export function AlertPreferencesCard({ stations }: { stations: MonitoringStation[] }) {
  const { currentUser, userProfile, loading } = useAuth();
  const { t } = useTranslation();
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingAreaId, setPendingAreaId] = useState<string | null>(null);
  const [pendingSetting, setPendingSetting] = useState<
    "pushEnabled" | "dailySummaryEnabled" | null
  >(null);

  const followedAreaIds = userProfile?.followedAreaIds ?? [];
  const notificationSettings = userProfile?.notificationSettings;
  const uid = currentUser?.uid;

  const stationById = useMemo(
    () => new Map(stations.map((station) => [station.id, station])),
    [stations],
  );

  // Followed stations may not currently be in the live `stations` batch
  // (e.g. temporarily quiet) — fall back to showing the raw id rather than
  // silently dropping the chip, matching the app's never-silent-fallback rule.
  const followedStationOptions = followedAreaIds.map(
    (id) => stationById.get(id) ?? { id, name: id, district: "", province: "" },
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const notFollowed = stations.filter((station) => !followedAreaIds.includes(station.id));
    return searchStations(notFollowed, searchQuery).slice(0, MAX_SEARCH_RESULTS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, searchQuery, followedAreaIds.join(",")]);

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
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("profile.searchStationPlaceholder")}
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
              searchResults.map((station) => (
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
                </button>
              ))
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}
