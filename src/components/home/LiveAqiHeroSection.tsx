import { useLiveHeroArea } from "../../hooks/useLiveHeroArea";
import { AqiHeroCard } from "./AqiHeroCard";

function HeroSkeleton() {
  return (
    <div className="h-48 animate-pulse rounded-2xl border border-gray-100 bg-gray-100" />
  );
}

/** Wraps `AqiHeroCard` with live Air4Thai data instead of the static mock `featuredArea`. */
export function LiveAqiHeroSection() {
  const { area, isLoading } = useLiveHeroArea();

  if (isLoading || !area) {
    return <HeroSkeleton />;
  }

  return <AqiHeroCard area={area} />;
}
