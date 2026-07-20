import { ChevronRight, LocateFixed, MapPinPlus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useUserLocation } from "../../hooks/useUserLocation";
import { useTranslation } from "../../hooks/useTranslation";
import { subscribeToRecentReports } from "../../services/reports";
import { haversineDistanceKm } from "../../utils/geo";
import { ReportDetailModal } from "../report/ReportDetailModal";
import { CommunityTable } from "./CommunityTable";
import type { Report } from "../../types";

/** Reports further than this from the user aren't "community monitoring near you" — matches the Home hero card's own nearby-station range in spirit, just tuned tighter since reports are hyper-local incidents, not regional air readings. */
const NEARBY_REPORT_RANGE_KM = 15;

function CommunityMonitoringSkeleton() {
  return (
    <div className="h-40 animate-pulse rounded-2xl border border-gray-100 bg-gray-100" />
  );
}

function PromptCard({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
      <div className="flex items-center gap-3">
        <span className="bg-brand-100 text-brand-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * Home's "Community Monitoring" section — real reports from `reports`
 * (Firestore), filtered to what's actually near the current user via
 * `haversineDistanceKm` (same function the Map/hero nearest-station logic
 * already uses), never mock data and never an unfiltered nationwide dump.
 * Firestore only allows authenticated reads of `reports`, so
 * `subscribeToRecentReports` is only ever called when `currentUser` exists —
 * guests get a login prompt instead, never a permission-denied query.
 */
export function CommunityMonitoringSection() {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { coords, status: locationStatus, retry: retryLocation } = useUserLocation();
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setRecentReports([]);
      setReportsLoading(false);
      return;
    }

    setReportsLoading(true);
    const unsubscribe = subscribeToRecentReports(
      (reports) => {
        setRecentReports(reports);
        setReportsLoading(false);
      },
      () => setReportsLoading(false),
    );
    return unsubscribe;
  }, [currentUser]);

  if (!currentUser) {
    return (
      <Link to="/login" className="block">
        <PromptCard
          icon={<MapPinPlus size={20} />}
          title={t("home.communityMonitoring")}
          subtitle={t("home.communityLoginPrompt")}
          action={<ChevronRight size={18} className="shrink-0 text-gray-400" />}
        />
      </Link>
    );
  }

  if (locationStatus === "locating" || reportsLoading) {
    return <CommunityMonitoringSkeleton />;
  }

  if (locationStatus === "denied" || locationStatus === "unsupported") {
    return (
      <PromptCard
        icon={<LocateFixed size={20} />}
        title={t("home.communityMonitoring")}
        subtitle={t("home.communityLocationPrompt")}
        action={
          <button
            type="button"
            onClick={retryLocation}
            className="text-brand-600 shrink-0 text-xs font-semibold"
          >
            {t("common.retry")}
          </button>
        }
      />
    );
  }

  const nearbyReports = coords
    ? recentReports.filter(
        (report) =>
          haversineDistanceKm(coords, { lat: report.latitude, lng: report.longitude }) <=
          NEARBY_REPORT_RANGE_KM,
      )
    : [];

  if (nearbyReports.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-400 shadow-sm">
        {t("home.communityNoReports")}
      </div>
    );
  }

  return (
    <>
      <CommunityTable reports={nearbyReports} onSelectReport={setSelectedReport} />
      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </>
  );
}
