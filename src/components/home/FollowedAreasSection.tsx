import { ChevronRight, MapPinPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useAllStations } from "../../hooks/useAllStations";
import { useFollowedAreaSummaries } from "../../hooks/useFollowedAreaSummaries";
import { useTranslation } from "../../hooks/useTranslation";
import { FollowedAreasGrid } from "./FollowedAreasGrid";

function FollowedAreasSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-19 animate-pulse rounded-xl border-l-4 border-gray-100 bg-gray-100 p-3 shadow-sm"
        />
      ))}
    </div>
  );
}

export function FollowedAreasSection() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { stations, isLoading: stationsLoading } = useAllStations();
  const { t } = useTranslation();

  const followedAreaIds = userProfile?.followedAreaIds ?? [];
  const { areas } = useFollowedAreaSummaries(followedAreaIds, stations);

  if (authLoading || stationsLoading) {
    return <FollowedAreasSkeleton />;
  }

  if (followedAreaIds.length === 0) {
    return (
      <Link
        to={currentUser ? "/profile" : "/login"}
        className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100"
      >
        <div className="flex items-center gap-3">
          <span className="bg-brand-100 text-brand-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <MapPinPlus size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {t("home.noFollowedAreas")}
            </p>
            <p className="text-xs text-gray-400">
              {currentUser ? t("home.addAreaInProfile") : t("home.loginToFollow")}
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-gray-400" />
      </Link>
    );
  }

  return <FollowedAreasGrid areas={areas} />;
}
