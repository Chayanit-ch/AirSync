import { OrganizationLeaderboardContent } from "../components/organizations/OrganizationLeaderboardContent";

/**
 * Thin wrapper kept for the standalone `/organizations` route (direct/deep
 * links) — the leaderboard's actual content now also renders inside
 * `OrganizationLeaderboardModal`'s fullscreen overlay from the Profile page,
 * which is the primary way to reach it after the Bottom Nav tab was removed.
 */
export function OrganizationsPage() {
  return <OrganizationLeaderboardContent />;
}
