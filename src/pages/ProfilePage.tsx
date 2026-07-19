import { useNavigate } from "react-router-dom";
import { ProfileHeader } from "../components/profile/ProfileHeader";
import { PM25StatsCard } from "../components/profile/PM25StatsCard";
import { ReportHistorySection } from "../components/profile/ReportHistorySection";
import { AlertPreferencesCard } from "../components/profile/AlertPreferencesCard";
import { FollowedAreasGrid } from "../components/home/FollowedAreasGrid";
import { currentUser as mockUser } from "../data/mockData";
import { useAuth } from "../contexts/AuthContext";
import { useAllStations } from "../hooks/useAllStations";
import { useFollowedAreaSummaries } from "../hooks/useFollowedAreaSummaries";
import { useMyReports } from "../hooks/useMyReports";
import { useTranslation } from "../hooks/useTranslation";
import { logOut } from "../services/auth";

export function ProfilePage() {
  const { currentUser, userProfile, isLoggingOutRef } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { stations } = useAllStations();

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

  const followedAreaIds = userProfile?.followedAreaIds ?? [];
  // Same query as Home's FollowedAreasSection, so the two pages can never
  // show different numbers for the same followed areas.
  const { areas: followedAreaCards, isLoading: areasLoading } =
    useFollowedAreaSummaries(followedAreaIds, stations);
  const { reports, isLoading: reportsLoading } = useMyReports();

  return (
    <div className="flex flex-col gap-4 p-4">
      <ProfileHeader
        displayName={currentUser?.displayName || mockUser.displayName}
        email={currentUser?.email || mockUser.email}
        photoURL={currentUser?.photoURL}
        guardianLevel={userProfile?.guardianLevel ?? mockUser.guardianLevel}
        onLogout={handleLogout}
      />
      <PM25StatsCard followedAreaIds={followedAreaIds} />
      {areasLoading ? (
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
      <ReportHistorySection reports={reports} isLoading={reportsLoading} />
      <AlertPreferencesCard stations={stations} />
    </div>
  );
}
