import type { MonitoringStation } from "../types";
import { useTemperatureFallback } from "./useTemperatureFallback";

/**
 * Fills in `station.temperature` from OpenWeather only when both Air4Thai
 * and WAQI left it missing — Air4Thai/WAQI stay authoritative whenever they
 * do report it, this only ever fills the gap. Scoped to one already-selected
 * station (never the whole nationwide batch), per the OpenWeather quota note
 * on `getOpenWeatherFallback`. Returns the station unchanged (temperature
 * still `undefined`, i.e. "No Data") while the fetch is pending or if it
 * fails.
 *
 * Thin `MonitoringStation` wrapper around `useTemperatureFallback`, the
 * shared fetch/cache logic also used per-card in `FollowedAreasGrid` — that
 * caller can run one of these per followed area, so `getOpenWeatherFallback`
 * itself dedupes concurrent same-coordinate requests rather than this hook
 * enforcing single-caller-only.
 */
export function useStationWithTemperatureFallback(
  station: MonitoringStation | null,
): MonitoringStation | null {
  const temperature = useTemperatureFallback(
    station?.id ?? null,
    station?.location ?? null,
    station?.temperature,
  );

  if (!station || station.temperature != null) return station;
  if (temperature == null) return station;
  return { ...station, temperature };
}
