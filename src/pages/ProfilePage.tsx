import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileHeader, LEVEL_LABEL_KEYS } from "../components/profile/ProfileHeader";
import { CharacterAvatar } from "../components/profile/CharacterAvatar";
import { CharacterCustomizationModal } from "../components/profile/CharacterCustomizationModal";
import { MissionsCard } from "../components/profile/MissionsCard";
import { PM25StatsCard } from "../components/profile/PM25StatsCard";
import { ReportHistorySection } from "../components/profile/ReportHistorySection";
import { AlertPreferencesCard } from "../components/profile/AlertPreferencesCard";
import { PersonalInfoCard } from "../components/profile/PersonalInfoCard";
import { FollowedAreasGrid } from "../components/home/FollowedAreasGrid";
import { ReportDetailModal } from "../components/report/ReportDetailModal";
import { currentUser as mockUser } from "../data/mockData";
import { useAuth } from "../contexts/AuthContext";
import { useAllStations } from "../hooks/useAllStations";
import { useFollowedAreaSummaries } from "../hooks/useFollowedAreaSummaries";
import { useMyReports } from "../hooks/useMyReports";
import { useTranslation } from "../hooks/useTranslation";
import { logOut } from "../services/auth";
import { syncOrganizationDirectoryEntry } from "../services/organizationDirectory";
import { getLevelFromPoints } from "../utils/gamification";
import { getUserType } from "../utils/userType";
import { resolveAvatarConfig } from "../utils/avatarCustomization";
import type { Report } from "../types";

export function ProfilePage() {
  const { currentUser, userProfile, isLoggingOutRef } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { stations, allStations, isLoading: stationsLoading } = useAllStations();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isCustomizingCharacter, setIsCustomizingCharacter] = useState(false);

  async function handleLogout() {
    isLoggingOutRef.current = true;
    await logOut().catch(() => {});
    navigate("/", { replace: true });
    // Deferred so React can flush the pending re-render (which needs to see
    // isLoggingOutRef as true) before it's reset — see the equivalent logic
    // in ProfileDropdown for the full explanation.
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 0);
  }

  // Opportunistic refresh of the public organizationProfiles mirror whenever
  // an organization account views its own profile — keeps the leaderboard's
  // displayName/photoURL/points reasonably fresh without threading a sync
  // call through missions.ts or every other points-award/profile-edit path.
  useEffect(() => {
    if (!currentUser || getUserType(userProfile) !== "organization" || !userProfile) return;
    void syncOrganizationDirectoryEntry(currentUser.uid, {
      displayName: userProfile.displayName,
      photoURL: userProfile.photoURL,
      points: userProfile.points,
      userType: "organization",
    });
  }, [currentUser, userProfile]);

  const followedAreaIds = userProfile?.followedAreaIds ?? [];
  // Same live `stations` source as the Map (via `resolveStationReading`), so
  // this can never disagree with what the Map shows for the same station.
  const { areas: followedAreaCards } = useFollowedAreaSummaries(followedAreaIds, stations);
  const { reports, isLoading: reportsLoading } = useMyReports();

  return (
    <div className="flex flex-col gap-4 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:p-6">
      <div className="flex flex-col gap-4">
        <ProfileHeader
          uid={currentUser?.uid}
          displayName={currentUser?.displayName || mockUser.displayName}
          email={currentUser?.email || mockUser.email}
          photoURL={currentUser?.photoURL}
          points={userProfile?.points ?? mockUser.points}
          userType={getUserType(userProfile ?? mockUser)}
          onLogout={handleLogout}
        />
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="mb-2 text-sm font-semibold text-gray-700">
            {t(LEVEL_LABEL_KEYS[getUserType(userProfile ?? mockUser)], {
              level: getLevelFromPoints(userProfile?.points ?? mockUser.points),
            })}
          </p>
          <CharacterAvatar
            avatarConfig={userProfile?.avatarConfig}
            userType={getUserType(userProfile ?? mockUser)}
            animate
            className="mx-auto"
          />
          <button
            type="button"
            onClick={() => setIsCustomizingCharacter(true)}
            className="bg-brand-600 hover:bg-brand-700 mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            {t("profile.avatar.customizeButton")}
          </button>
        </div>
        <MissionsCard />
        <AlertPreferencesCard stations={stations} stationCatalog={allStations} />
        <PersonalInfoCard />
      </div>
      <div className="flex flex-col gap-4">
        <PM25StatsCard followedAreaIds={followedAreaIds} />
        {stationsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-19 animate-pulse rounded-xl border-l-4 border-gray-100 bg-gray-100 p-3 shadow-sm"
              />
            ))}
          </div>
        ) : followedAreaCards.length > 0 ? (
          <FollowedAreasGrid areas={followedAreaCards} />
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-400 shadow-sm">
            {t("profile.noFollowedAreasHint")}
          </div>
        )}
        <ReportHistorySection
          reports={reports}
          isLoading={reportsLoading}
          onSelectReport={setSelectedReport}
        />
      </div>

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      <CharacterCustomizationModal
        open={isCustomizingCharacter}
        uid={currentUser?.uid}
        userType={getUserType(userProfile ?? mockUser)}
        level={getLevelFromPoints(userProfile?.points ?? mockUser.points)}
        currentConfig={resolveAvatarConfig(userProfile?.avatarConfig)}
        onClose={() => setIsCustomizingCharacter(false)}
      />
    </div>
  );
}
