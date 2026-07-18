import { Bell, Plus, X } from "lucide-react";
import { useState } from "react";
import { allAreas } from "../../data/mockData";
import { useAuth } from "../../contexts/AuthContext";
import {
  followArea,
  unfollowArea,
  updateNotificationSettings,
} from "../../services/userProfile";
import { ToggleSwitch } from "../shared/ToggleSwitch";

export function AlertPreferencesCard() {
  const { currentUser, userProfile, loading } = useAuth();
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [pendingAreaId, setPendingAreaId] = useState<string | null>(null);
  const [pendingSetting, setPendingSetting] = useState<
    "pushEnabled" | "dailySummaryEnabled" | null
  >(null);

  const followedAreaIds = userProfile?.followedAreaIds ?? [];
  const notificationSettings = userProfile?.notificationSettings;
  const uid = currentUser?.uid;

  const followedAreaOptions = followedAreaIds.map(
    (id) => allAreas.find((area) => area.id === id) ?? { id, areaName: id },
  );
  const availableAreas = allAreas.filter((area) => !followedAreaIds.includes(area.id));

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
        <h2 className="text-lg font-bold text-gray-800">ตั้งค่าการแจ้งเตือน</h2>
      </div>

      <p className="mb-2 text-sm text-gray-500">
        พื้นที่ที่คุณสนใจ (รับการแจ้งเตือน)
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {followedAreaOptions.map((area) => (
          <span
            key={area.id}
            className="bg-brand-50 text-brand-700 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            {area.areaName}
            <button
              type="button"
              onClick={() => handleRemoveArea(area.id)}
              disabled={controlsDisabled || pendingAreaId === area.id}
              aria-label={`ลบพื้นที่ ${area.areaName}`}
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
            disabled={controlsDisabled || availableAreas.length === 0}
            className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 disabled:opacity-40"
          >
            <Plus size={13} />
            เพิ่มพื้นที่
          </button>
        )}
      </div>

      {isAddingArea && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2.5">
          {availableAreas.length === 0 && (
            <p className="text-xs text-gray-400">ติดตามครบทุกพื้นที่แล้ว</p>
          )}
          {availableAreas.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => handleAddArea(area.id)}
              disabled={controlsDisabled || pendingAreaId === area.id}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-40"
            >
              {area.areaName}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 py-3">
        <span className="text-sm text-gray-700">
          แจ้งเตือนแบบ Push Notification
        </span>
        <ToggleSwitch
          label="แจ้งเตือนแบบ Push Notification"
          checked={notificationSettings?.pushEnabled ?? false}
          onChange={(value) => handleToggle("pushEnabled", value)}
          disabled={controlsDisabled || pendingSetting === "pushEnabled"}
        />
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 py-3">
        <span className="text-sm text-gray-700">สรุปรายงานประจำวัน</span>
        <ToggleSwitch
          label="สรุปรายงานประจำวัน"
          checked={notificationSettings?.dailySummaryEnabled ?? false}
          onChange={(value) => handleToggle("dailySummaryEnabled", value)}
          disabled={controlsDisabled || pendingSetting === "dailySummaryEnabled"}
        />
      </div>
    </div>
  );
}
