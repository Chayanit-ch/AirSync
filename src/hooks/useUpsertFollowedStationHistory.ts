import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { upsertStationHistory } from "../services/airQuality";

/**
 * Writes `airQualityRecords` history for exactly the areas this user
 * follows — once per distinct `followedAreaIds` set per app session, not on
 * every page mount or fetch. Mounted once globally (see `PageLayout`), so
 * navigating between Home/Map/Profile never re-triggers it; it only fires
 * again if the user actually follows/unfollows an area. This, together with
 * the Map's own viewport-scoped upsert, replaces the old behavior of
 * blanket-upserting every fetched station on every call.
 */
export function useUpsertFollowedStationHistory(): void {
  const { currentUser, userProfile } = useAuth();
  const followedAreaIds = userProfile?.followedAreaIds ?? [];
  const lastUpsertedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser || followedAreaIds.length === 0) return;
    const key = [...followedAreaIds].sort().join(",");
    if (key === lastUpsertedKey.current) return;
    lastUpsertedKey.current = key;
    void upsertStationHistory(followedAreaIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, followedAreaIds.join(",")]);
}
