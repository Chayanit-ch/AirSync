import { LiveAqiHeroSection } from "../components/home/LiveAqiHeroSection";
import { QuickActions } from "../components/home/QuickActions";
import { FollowedAreasSection } from "../components/home/FollowedAreasSection";
import { AqiTrendChart } from "../components/home/AqiTrendChart";
import { HeatmapPreviewCard } from "../components/home/HeatmapPreviewCard";
import { CommunityTable } from "../components/home/CommunityTable";
import { communityReports, trend24h } from "../data/mockData";

export function HomePage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <LiveAqiHeroSection />
      <QuickActions />
      <FollowedAreasSection />
      <AqiTrendChart data={trend24h} />
      <HeatmapPreviewCard />
      <CommunityTable reports={communityReports} />
    </div>
  );
}
