import { LiveAqiHeroSection } from "../components/home/LiveAqiHeroSection";
import { QuickActions } from "../components/home/QuickActions";
import { FollowedAreasSection } from "../components/home/FollowedAreasSection";
import { AqiTrendChart } from "../components/home/AqiTrendChart";
import { HeatmapPreviewCard } from "../components/home/HeatmapPreviewCard";
import { CommunityTable } from "../components/home/CommunityTable";
import { communityReports, trend24h } from "../data/mockData";

export function HomePage() {
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
      <AqiTrendChart data={trend24h} />
      <HeatmapPreviewCard />
      <div className="lg:col-span-2">
        <CommunityTable reports={communityReports} />
      </div>
    </div>
  );
}
