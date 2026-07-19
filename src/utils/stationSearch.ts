import type { MonitoringStation } from "../types";

/**
 * Case-insensitive substring search across a station's name, English name,
 * district, and province — used by the Profile "follow a station" search
 * and the Map search bar, so both match on the same fields (province,
 * district, or station name, per the nationwide search requirement).
 */
export function searchStations(
  stations: MonitoringStation[],
  query: string,
): MonitoringStation[] {
  const q = query.trim().toLowerCase();
  if (!q) return stations;

  return stations.filter((station) => {
    const haystacks = [
      station.name,
      station.nameEn,
      station.district,
      station.province,
      station.address,
    ];
    return haystacks.some((value) => value?.toLowerCase().includes(q));
  });
}
