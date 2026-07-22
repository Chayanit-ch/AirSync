import { CheckCircle2, Flame, Leaf, ListChecks, Megaphone, MapPin, ShieldCheck, TreePine, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { MISSIONS } from "../../data/missions";
import { awardMission, getBangkokDateKey, subscribeTodaysMissionLog } from "../../services/missions";
import type { Mission } from "../../types";

const MISSION_ICONS: Record<string, typeof Wind> = {
  Wind,
  ShieldCheck,
  MapPin,
  TreePine,
  Flame,
  Megaphone,
  Leaf,
};

const TOAST_DURATION_MS = 3000;

export function MissionsCard() {
  const { currentUser, userProfile } = useAuth();
  const { t } = useTranslation();
  const uid = currentUser?.uid;
  const dateKey = useMemo(() => getBangkokDateKey(), []);

  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [pendingMissionId, setPendingMissionId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeTodaysMissionLog(uid, dateKey, setCompletedToday);
  }, [uid, dateKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // The one-time "set-risk-group" mission is validated from the profile
  // field it rewards, not from today's mission log — per spec, since it
  // isn't a *daily* completion and may have been earned on an earlier day.
  function isCompleted(mission: Mission): boolean {
    if (mission.id === "set-risk-group") return Boolean(userProfile?.riskGroup);
    return completedToday.has(mission.id);
  }

  async function handleComplete(mission: Mission) {
    if (!uid || pendingMissionId) return;
    setPendingMissionId(mission.id);
    try {
      const result = await awardMission(uid, mission);
      if (result === "awarded") {
        setToast(t("missions.toastEarned", { points: mission.points }));
      }
    } catch (error) {
      console.error(`Failed to complete mission "${mission.id}"`, error);
    } finally {
      setPendingMissionId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks size={18} className="text-brand-600" />
        <h2 className="text-lg font-bold text-gray-800">{t("missions.sectionTitle")}</h2>
      </div>

      <div className="flex flex-col gap-2.5">
        {MISSIONS.map((mission) => {
          const Icon = MISSION_ICONS[mission.icon] ?? Wind;
          const done = isCompleted(mission);
          return (
            <div
              key={mission.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              <div className="bg-brand-50 text-brand-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <Icon size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">{t(mission.titleKey)}</p>
                <p className="text-xs text-gray-400">{t(mission.descriptionKey)}</p>
              </div>
              <span className="text-brand-600 shrink-0 text-xs font-bold">
                {t("missions.pointsBadge", { points: mission.points })}
              </span>
              {mission.auto ? (
                done && (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 size={15} />
                    {t("missions.completedAutomatically")}
                  </span>
                )
              ) : (
                <button
                  type="button"
                  disabled={!uid || done || pendingMissionId === mission.id}
                  onClick={() => handleComplete(mission)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    done
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40"
                  }`}
                >
                  {done ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      {t("missions.completed")}
                    </span>
                  ) : (
                    t("missions.markComplete")
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {toast && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={17} className="shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}
