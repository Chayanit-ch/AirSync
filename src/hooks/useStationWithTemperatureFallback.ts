import { useEffect, useState } from "react";
import type { MonitoringStation } from "../types";
import { getOpenWeatherFallback } from "../services/airQuality";

/**
 * Fills in `station.temperature` from OpenWeather only when both Air4Thai
 * and WAQI left it missing — Air4Thai/WAQI stay authoritative whenever they
 * do report it, this only ever fills the gap. Scoped to one already-selected
 * station at a time (never a whole batch), per the OpenWeather quota note on
 * `getOpenWeatherFallback`. Returns the station unchanged (temperature still
 * `undefined`, i.e. "No Data") while the fetch is pending or if it fails.
 */
export function useStationWithTemperatureFallback(
  station: MonitoringStation | null,
): MonitoringStation | null {
  const [fallback, setFallback] = useState<{ stationId: string; temperature: number } | null>(
    null,
  );

  useEffect(() => {
    if (!station || station.temperature != null) return;
    let cancelled = false;
    const { id, location } = station;
    getOpenWeatherFallback(location).then((weather) => {
      if (cancelled || !weather) return;
      setFallback({ stationId: id, temperature: weather.temperature });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station?.id, station?.temperature]);

  if (!station || station.temperature != null) return station;
  if (fallback?.stationId === station.id) {
    return { ...station, temperature: fallback.temperature };
  }
  return station;
}
