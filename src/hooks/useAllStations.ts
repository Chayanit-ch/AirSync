import { useEffect, useState } from "react";
import { getLiveAirQuality } from "../services/airQuality";
import { monitoringStations as mockMonitoringStations } from "../data/mockData";
import type { MonitoringStation } from "../types";

interface UseAllStationsResult {
  stations: MonitoringStation[];
  isLoading: boolean;
  /** False if the live Air4Thai fetch failed and `stations` is the small mock fallback set. */
  isLive: boolean;
}

/**
 * Single shared fetch of nationwide live stations via `getLiveAirQuality`,
 * reused by the Map page, the Home hero card, and Profile's station search
 * so there's exactly one fetch path for "all stations" (Code Reuse rule)
 * instead of each page re-implementing its own `/api/air4thai` call.
 */
export function useAllStations(): UseAllStationsResult {
  const [state, setState] = useState<UseAllStationsResult>({
    stations: mockMonitoringStations,
    isLoading: true,
    isLive: false,
  });

  useEffect(() => {
    let cancelled = false;
    getLiveAirQuality().then((result) => {
      if (cancelled) return;
      setState({ stations: result.stations, isLoading: false, isLive: result.isLive });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
