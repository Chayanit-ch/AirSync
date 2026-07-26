import { Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { OrganizationDirectoryEntry, OrganizationRatingSummary } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { getOrganizationRatingSummary, listOrganizations } from "../../services/organizationRatings";
import { OrganizationLeaderboardRow } from "./OrganizationLeaderboardRow";
import { OrganizationRatingModal } from "./OrganizationRatingModal";

interface OrganizationWithSummary {
  organization: OrganizationDirectoryEntry;
  summary: OrganizationRatingSummary;
}

function sortBySummary(entries: OrganizationWithSummary[]): OrganizationWithSummary[] {
  return [...entries].sort((a, b) => {
    if (b.summary.average !== a.summary.average) return b.summary.average - a.summary.average;
    if (b.summary.count !== a.summary.count) return b.summary.count - a.summary.count;
    return a.organization.displayName.localeCompare(b.organization.displayName);
  });
}

/**
 * The leaderboard's actual list/data/rating logic, split out of `OrganizationsPage`
 * so the exact same content can be reused both at the standalone `/organizations`
 * route and inside `OrganizationLeaderboardModal`'s fullscreen overlay — only the
 * wrapper differs, never this logic.
 */
export function OrganizationLeaderboardContent() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<OrganizationWithSummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedOrgUid, setSelectedOrgUid] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoadError(false);
    try {
      const organizations = await listOrganizations();
      const withSummaries = await Promise.all(
        organizations.map(async (organization) => ({
          organization,
          summary: await getOrganizationRatingSummary(organization.uid),
        })),
      );
      setEntries(sortBySummary(withSummaries));
    } catch (error) {
      // No silent hang: a query failure (e.g. Firestore rules not deployed
      // yet) must surface, not leave the skeleton loader spinning forever.
      console.error("Failed to load organization leaderboard", error);
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleRated(orgUid: string) {
    const summary = await getOrganizationRatingSummary(orgUid, true);
    setEntries((prev) =>
      prev ? sortBySummary(prev.map((e) => (e.organization.uid === orgUid ? { ...e, summary } : e))) : prev,
    );
  }

  const selected = entries?.find((e) => e.organization.uid === selectedOrgUid) ?? null;

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <Trophy size={22} className="text-amber-500" />
        <h1 className="text-xl font-bold text-gray-900">{t("leaderboard.pageTitle")}</h1>
      </div>
      <p className="-mt-2 text-sm text-gray-400">{t("leaderboard.pageSubtitle")}</p>

      {loadError ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-400 shadow-sm">
          {t("leaderboard.loadError")}
        </div>
      ) : entries === null ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-gray-100 bg-gray-100" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-400 shadow-sm">
          {t("leaderboard.noOrganizations")}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map(({ organization, summary }, index) => (
            <OrganizationLeaderboardRow
              key={organization.uid}
              rank={index + 1}
              organization={organization}
              summary={summary}
              onSelect={() => setSelectedOrgUid(organization.uid)}
            />
          ))}
        </div>
      )}

      <OrganizationRatingModal
        organization={selected?.organization ?? null}
        summary={selected?.summary}
        onClose={() => setSelectedOrgUid(null)}
        onRated={handleRated}
      />
    </div>
  );
}
