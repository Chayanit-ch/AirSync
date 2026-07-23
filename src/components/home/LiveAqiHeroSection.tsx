import { useAuth } from "../../contexts/AuthContext";
import { useAiAdvice } from "../../hooks/useAiAdvice";
import { useNearestStationHero } from "../../hooks/useNearestStationHero";
import { useTranslation } from "../../hooks/useTranslation";
import { resolveRiskGroup } from "../../utils/recommendation";
import { AqiHeroCard } from "./AqiHeroCard";

function HeroSkeleton() {
  return (
    <div className="h-48 animate-pulse rounded-2xl border border-gray-100 bg-gray-100" />
  );
}

/** Wraps `AqiHeroCard` with the nearest real station to the user, replacing the old static "Mueang Samut Sakhon" mock. */
export function LiveAqiHeroSection() {
  const { area, isLoading, distanceKm, outOfRange, locationStatus, retryLocation } =
    useNearestStationHero();
  const { currentUser, userProfile } = useAuth();
  const { language } = useTranslation();

  const advice = useAiAdvice({
    uid: currentUser?.uid,
    aqi: area?.avgAqi ?? 0,
    pm25: area?.avgPm25 ?? 0,
    severity: area?.severity ?? "good",
    riskGroup: resolveRiskGroup(userProfile?.riskGroup),
    dailyContext: userProfile?.dailyContext,
    healthNotes: userProfile?.healthNotes,
    language,
  });

  if (isLoading || !area) {
    return (
      <div data-tour-id="onboarding-hero">
        <HeroSkeleton />
      </div>
    );
  }

  return (
    <div data-tour-id="onboarding-hero">
      <AqiHeroCard
        area={area}
        distanceKm={distanceKm}
        outOfRange={outOfRange}
        locationStatus={locationStatus}
        onRetryLocation={retryLocation}
        riskGroup={userProfile?.riskGroup}
        aiShortTerm={advice.shortTerm}
        aiLongTerm={advice.longTerm}
        onRefreshAdvice={currentUser ? advice.refresh : undefined}
        isRefreshingAdvice={advice.isLoading}
      />
    </div>
  );
}
