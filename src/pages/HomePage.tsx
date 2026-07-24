import { LiveAqiHeroSection } from "../components/home/LiveAqiHeroSection";
import { QuickActions } from "../components/home/QuickActions";
import { FollowedAreasSection } from "../components/home/FollowedAreasSection";
import { AqiTrendChart } from "../components/home/AqiTrendChart";
import { HeatmapPreviewCard } from "../components/home/HeatmapPreviewCard";
import { CommunityMonitoringSection } from "../components/home/CommunityMonitoringSection";
import { useNearestStationHero } from "../hooks/useNearestStationHero";
import { useStationAqiTrend } from "../hooks/useStationAqiTrend";

export function HomePage() {
  // Same station the Hero Card renders (`area.id`), so the trend chart's
  // rightmost point can never disagree with the hero's current reading —
  // this page used to feed the chart a hardcoded, unrelated mock array,
  // which is exactly the bug this consolidation fixes.
  const { area } = useNearestStationHero();
  const { data: trendData } = useStationAqiTrend(area?.id ?? null);

  return (
    <div className="flex flex-col gap-4 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:p-6">
      <div className="lg:col-span-2">
        <LiveAqiHeroSection />
      </div>
      <div className="lg:col-span-2">
        <QuickActions />
      </div>
      <div className="lg:col-span-2">
        <FollowedAreasSection />
      </div>
      <AqiTrendChart data={trendData} />
      <HeatmapPreviewCard />
      <div className="lg:col-span-2">
        <CommunityMonitoringSection />
      </div>
    </div>
  );
}
