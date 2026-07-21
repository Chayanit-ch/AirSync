/** The fields `searchStations` matches against — both `MonitoringStation` and `StationMetadata` satisfy this. */
interface Searchable {
  name: string;
  nameEn?: string;
  district: string;
  province: string;
  address: string;
}

/**
 * Case-insensitive substring search across a station's name, English name,
 * district, and province — used by the Profile "follow a station" search
 * and the Map search bar, so both match on the same fields (province,
 * district, or station name, per the nationwide search requirement).
 *
 * Generic over `MonitoringStation` and `StationMetadata` (see `../types`):
 * Profile's search must run over the full station catalog, not just
 * currently-live stations, so it needs to accept `StationMetadata[]` too —
 * see `AlertPreferencesCard`.
 */
export function searchStations<T extends Searchable>(stations: T[], query: string): T[] {
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
