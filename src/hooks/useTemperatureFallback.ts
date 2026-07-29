import { useEffect, useState } from "react";
import type { GeoPoint } from "../types";
import { getOpenWeatherFallback } from "../services/airQuality";

/**
 * Core of the Air4Thai/WAQI -> OpenWeather temperature fallback, factored out
 * of `useStationWithTemperatureFallback` so per-card UIs (Followed Areas
 * grid) can reuse the exact same last-resort fetch without needing a full
 * `MonitoringStation` object. Returns `temperature` straight through
 * (no fetch) whenever it's already present — only queries OpenWeather when
 * `id`/`location` are known and `temperature` is missing.
 */
export function useTemperatureFallback(
  id: string | null,
  location: GeoPoint | null,
  temperature: number | undefined,
): number | undefined {
  const [fallback, setFallback] = useState<{ id: string; temperature: number } | null>(null);

  useEffect(() => {
    if (!id || !location || temperature != null) return;
    let cancelled = false;
    getOpenWeatherFallback(location).then((weather) => {
      if (cancelled || !weather) return;
      setFallback({ id, temperature: weather.temperature });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location?.lat, location?.lng, temperature]);

  if (temperature != null) return temperature;
  if (fallback?.id === id) return fallback.temperature;
  return undefined;
}
