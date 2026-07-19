import { useNearestStationHero } from "../../hooks/useNearestStationHero";
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

  if (isLoading || !area) {
    return <HeroSkeleton />;
  }

  return (
    <AqiHeroCard
      area={area}
      distanceKm={distanceKm}
      outOfRange={outOfRange}
      locationStatus={locationStatus}
      onRetryLocation={retryLocation}
    />
  );
}
