// Vercel serverless function — proxies WAQI (aqicn.org, https://waqi.info/)
// as a *supplemental* air quality source, used by the frontend only when
// Air4Thai (`api/air4thai.ts`) has no station near the user/viewport. Two
// query modes:
//   ?lat=<num>&lng=<num>          -> nearest-station geo feed (hero fallback)
//   ?bounds=lat1,lon1,lat2,lon2   -> stations within a map viewport
//
// Endpoints verified 2026-07-20 by calling both directly and inspecting the
// real JSON:
//   https://api.waqi.info/feed/geo:{lat};{lon}/?token=...
//     -> { status, data: { aqi, idx, city: { geo, name }, dominentpol,
//          iaqi: { pm25: { v }, ... }, time: { iso } } }
//     Confirmed `iaqi.pm25.v` is a PM2.5 *sub-AQI index*, not a raw µg/m³
//     concentration — in the verification call, `aqi` and `iaqi.pm25.v` were
//     both exactly 66 with `dominentpol: "pm25"` (the overall AQI *is* the
//     dominant pollutant's own sub-index). So `currentPm25` below is always
//     an approximation, inverted from this app's own PM2.5->AQI breakpoint
//     table — never read directly off `iaqi`.
//   https://api.waqi.info/map/bounds/?latlng={lat1},{lon1},{lat2},{lon2}&token=...
//     -> { status, data: [{ lat, lon, uid, aqi, station: { name, time } }] }
//     `aqi` here is a *string* and can be the sentinel `"-"` for stations
//     with no current reading — filtered out below.
const WAQI_TOKEN = process.env.VITE_WAQI_TOKEN;
const FETCH_TIMEOUT_MS = 8000;
/** 12 minutes — same window as `api/air4thai.ts`. */
const CACHE_TTL_MS = 12 * 60 * 1000;

/** Duplicated from `src/utils/aqi.ts` for the same reason `api/air4thai.ts` duplicates it — see that file's comment. Keep in sync manually. */
type AqiSeverity = "good" | "moderate" | "sensitive" | "unhealthy" | "veryUnhealthy" | "hazardous";
function getAqiSeverity(aqi: number): AqiSeverity {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "sensitive";
  if (aqi <= 200) return "unhealthy";
  if (aqi <= 300) return "veryUnhealthy";
  return "hazardous";
}

interface Breakpoint {
  pmLow: number;
  pmHigh: number;
  aqiLow: number;
  aqiHigh: number;
}

/** Same table as `src/utils/aqi.ts`'s `pm25ToAqi`, used here in reverse (see `aqiToApproxPm25`). */
const BREAKPOINTS: Breakpoint[] = [
  { pmLow: 0, pmHigh: 9.0, aqiLow: 0, aqiHigh: 50 },
  { pmLow: 9.1, pmHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
  { pmLow: 35.5, pmHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
  { pmLow: 55.5, pmHigh: 125.4, aqiLow: 151, aqiHigh: 200 },
  { pmLow: 125.5, pmHigh: 225.4, aqiLow: 201, aqiHigh: 300 },
  { pmLow: 225.5, pmHigh: 325.4, aqiLow: 301, aqiHigh: 500 },
];

/** Approximates a µg/m³ PM2.5 concentration from an AQI value — the inverse of `pm25ToAqi`. WAQI's basic feed doesn't reliably expose a raw concentration, only AQI-scale sub-indices, so this is a display-only estimate, never treated as exact. */
function aqiToApproxPm25(aqi: number): number {
  const bp =
    BREAKPOINTS.find((b) => aqi >= b.aqiLow && aqi <= b.aqiHigh) ??
    BREAKPOINTS[BREAKPOINTS.length - 1];
  const pm25 =
    ((bp.pmHigh - bp.pmLow) / (bp.aqiHigh - bp.aqiLow)) * (aqi - bp.aqiLow) + bp.pmLow;
  return Math.round(pm25 * 10) / 10;
}

interface NormalizedStation {
  id: string;
  name: string;
  nameEn: string;
  address: string;
  district: string;
  province: string;
  location: { lat: number; lng: number };
  currentAqi: number;
  currentPm25: number;
  severity: AqiSeverity;
  lastUpdated: string;
  source: "waqi";
}

function parseAqiValue(raw: string | number | undefined): number | undefined {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (n === undefined || !Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/**
 * WAQI's raw station name is a free-text string shaped
 * `"<site/area>, <city>, Thailand (<Thai description>)"` (verified against
 * the live feed 2026-07-20, e.g. `"Lat Yai,Mueang,Samut Songkhram, Thailand
 * (ต.ลาดใหญ่ อ.เมือง จ.สมุทรสงคราม)"`) — never meant to be shown to a user
 * as-is. This app always displays place names in Thai regardless of UI
 * language (see the `LOCATION-NAME STRATEGY` comment on `MonitoringStation`
 * in `src/types/index.ts`), so `name` prefers the parenthesized Thai part;
 * `nameEn`/`address` get the English part with the trailing ", Thailand"
 * stripped. Falls back to the raw trimmed string for both if the shape
 * doesn't match (e.g. WAQI ever changes format) — never silently blank.
 */
function parseWaqiStationName(raw: string): { name: string; nameEn: string } {
  const match = raw.match(/^(.+?),?\s*Thailand\s*(?:\(([^)]*)\))?\s*$/i);
  if (!match) return { name: raw, nameEn: raw };

  const englishPart = match[1].trim().replace(/,\s*$/, "");
  const thaiPart = match[2]?.trim();
  return {
    name: thaiPart || englishPart || raw,
    nameEn: englishPart || raw,
  };
}

interface WaqiGeoResponse {
  status: string;
  data?: {
    aqi?: string | number;
    idx?: number;
    city?: { geo?: [number, number]; name?: string };
    dominentpol?: string;
    time?: { iso?: string };
  };
}

function normalizeGeoStation(
  raw: WaqiGeoResponse,
  requested: { lat: number; lng: number },
): NormalizedStation | null {
  if (raw.status !== "ok" || !raw.data) return null;
  const aqi = parseAqiValue(raw.data.aqi);
  if (aqi === undefined) return null;

  const [geoLat, geoLng] = raw.data.city?.geo ?? [];
  const rawName = raw.data.city?.name?.trim() || `WAQI station ${raw.data.idx ?? "?"}`;
  const { name, nameEn } = parseWaqiStationName(rawName);

  return {
    id: `waqi-${raw.data.idx}`,
    name,
    nameEn,
    // WAQI's basic feed doesn't provide clean administrative divisions
    // (district/province) the way Air4Thai does — left blank rather than
    // guessed from free-text station names, so the UI's existing
    // "no data" fallback shows honestly instead of a fabricated value.
    // `address` gets the English descriptor (not the raw unparsed string)
    // so it reads as a second line, not a duplicate of `name`.
    address: nameEn,
    district: "",
    province: "",
    location: {
      lat: Number.isFinite(geoLat) ? geoLat! : requested.lat,
      lng: Number.isFinite(geoLng) ? geoLng! : requested.lng,
    },
    currentAqi: Math.round(aqi),
    currentPm25: aqiToApproxPm25(aqi),
    severity: getAqiSeverity(aqi),
    lastUpdated: raw.data.time?.iso ?? new Date().toISOString(),
    source: "waqi",
  };
}

interface WaqiBoundsResponse {
  status: string;
  data?: Array<{
    lat?: number;
    lon?: number;
    uid?: number;
    aqi?: string;
    station?: { name?: string; time?: string };
  }>;
}

function normalizeBoundsStations(raw: WaqiBoundsResponse): NormalizedStation[] {
  if (raw.status !== "ok" || !Array.isArray(raw.data)) return [];

  const stations: NormalizedStation[] = [];
  for (const entry of raw.data) {
    const aqi = parseAqiValue(entry.aqi);
    if (aqi === undefined) continue; // also filters WAQI's "-" no-data sentinel
    if (!Number.isFinite(entry.lat) || !Number.isFinite(entry.lon)) continue;

    const rawName = entry.station?.name?.trim() || `WAQI station ${entry.uid ?? "?"}`;
    const { name, nameEn } = parseWaqiStationName(rawName);
    stations.push({
      id: `waqi-${entry.uid}`,
      name,
      nameEn,
      address: nameEn,
      district: "",
      province: "",
      location: { lat: entry.lat!, lng: entry.lon! },
      currentAqi: Math.round(aqi),
      currentPm25: aqiToApproxPm25(aqi),
      severity: getAqiSeverity(aqi),
      lastUpdated: entry.station?.time ?? new Date().toISOString(),
      source: "waqi",
    });
  }
  return stations;
}

async function fetchWaqiJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`WAQI responded with HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface GeoCacheEntry {
  fetchedAtMs: number;
  station: NormalizedStation | null;
}
interface BoundsCacheEntry {
  fetchedAtMs: number;
  stations: NormalizedStation[];
}

// Module-level caches — persist across invocations on a warm serverless
// instance, same "simple in-memory cache" pattern as `api/air4thai.ts`.
// Two separate maps since the geo and bounds queries have different keys
// and shapes; geo keys are rounded to ~1km precision so nearby repeat
// requests (GPS jitter) still hit the cache instead of missing every time.
const geoCache = new Map<string, GeoCacheEntry>();
const boundsCache = new Map<string, BoundsCacheEntry>();

function geoCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

interface JsonResponse {
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (name: string, value: string) => void;
}

async function handleGeo(lat: number, lng: number, res: JsonResponse): Promise<void> {
  const key = geoCacheKey(lat, lng);
  const now = Date.now();
  const cached = geoCache.get(key);
  if (cached && now - cached.fetchedAtMs < CACHE_TTL_MS) {
    res.status(200).json({ ok: true, source: "waqi", cached: true, station: cached.station });
    return;
  }

  try {
    const raw = await fetchWaqiJson<WaqiGeoResponse>(
      `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${WAQI_TOKEN}`,
    );
    const station = normalizeGeoStation(raw, { lat, lng });
    geoCache.set(key, { fetchedAtMs: now, station });
    res.status(200).json({ ok: true, source: "waqi", cached: false, station });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (cached) {
      res.status(200).json({
        ok: true,
        source: "waqi",
        cached: true,
        stale: true,
        station: cached.station,
        warning: `Serving stale WAQI cache — live refetch failed: ${message}`,
      });
      return;
    }
    // Never crash the caller — WAQI is already a fallback source, so a
    // failure here just means "no supplemental station", not an app error.
    res.status(200).json({ ok: false, error: message, station: null });
  }
}

async function handleBounds(boundsParam: string, res: JsonResponse): Promise<void> {
  const key = boundsParam;
  const now = Date.now();
  const cached = boundsCache.get(key);
  if (cached && now - cached.fetchedAtMs < CACHE_TTL_MS) {
    res.status(200).json({ ok: true, source: "waqi", cached: true, stations: cached.stations });
    return;
  }

  try {
    const raw = await fetchWaqiJson<WaqiBoundsResponse>(
      `https://api.waqi.info/map/bounds/?latlng=${boundsParam}&token=${WAQI_TOKEN}`,
    );
    const stations = normalizeBoundsStations(raw);
    boundsCache.set(key, { fetchedAtMs: now, stations });
    res.status(200).json({ ok: true, source: "waqi", cached: false, stations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (cached) {
      res.status(200).json({
        ok: true,
        source: "waqi",
        cached: true,
        stale: true,
        stations: cached.stations,
        warning: `Serving stale WAQI cache — live refetch failed: ${message}`,
      });
      return;
    }
    res.status(200).json({ ok: false, error: message, stations: [] });
  }
}

// Loose (non-@vercel/node) req/res typing intentionally, matching `api/air4thai.ts`.
export default async function handler(
  req: { method?: string; url?: string },
  res: JsonResponse,
) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  if (req.method && req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!WAQI_TOKEN) {
    // Never crash — just report "no supplemental source available" so the
    // frontend's existing WAQI-then-mock fallback chain still works.
    res.status(200).json({ ok: false, error: "WAQI token not configured" });
    return;
  }

  const url = new URL(req.url ?? "", "http://localhost");
  const boundsParam = url.searchParams.get("bounds");
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");

  if (boundsParam) {
    await handleBounds(boundsParam, res);
    return;
  }

  const lat = Number(latParam);
  const lng = Number(lngParam);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    await handleGeo(lat, lng, res);
    return;
  }

  res.status(400).json({ ok: false, error: "Missing lat/lng or bounds query parameter" });
}
