// Vercel serverless function — auto-detected because it lives in the
// root-level `api/` directory. No extra Vercel config needed.
//
// Proxies the real Air4Thai API (solving browser CORS) and normalizes the
// response into the app's existing `AirQualityRecord` / `MonitoringStation`
// shapes so the frontend never has to know about Air4Thai's raw format.
//
// Endpoint verified 2026-07-18 by inspecting Air4Thai's own live webV3
// frontend (https://air4thai.pcd.go.th/webV3/) — this is the exact URL it
// calls itself, not a guessed/legacy one:
//   https://air4thai.com/forweb/getAQI_JSON.php
import https from "node:https";

const AIR4THAI_URL = "https://air4thai.com/forweb/getAQI_JSON.php";
const FETCH_TIMEOUT_MS = 8000;
/** 12 minutes — inside the requested 10–15 min window. */
const CACHE_TTL_MS = 12 * 60 * 1000;

/**
 * Deliberately duplicated from `src/utils/aqi.ts` instead of imported.
 *
 * Production incident (2026-07-19): `import { getAqiSeverity } from
 * "../src/utils/aqi"` caused every request to this function to fail with
 * `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/src/utils/aqi'`
 * (confirmed via `vercel logs`) — Vercel's function bundler didn't trace
 * this relative import crossing from `api/` into `src/` into the deployed
 * function bundle, even though it worked fine locally under `vercel dev`.
 * Rather than fight the bundler's file-tracing config under a deployment
 * deadline, this one small pure function is copied here so the function has
 * zero dependencies outside its own file. Keep the two in sync manually if
 * the AQI breakpoints ever change (unlikely).
 */
type AqiSeverity = "good" | "moderate" | "sensitive" | "unhealthy";
function getAqiSeverity(aqi: number): AqiSeverity {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "sensitive";
  return "unhealthy";
}

/**
 * Air4Thai stationID -> this app's areaId. Only the stations that actually
 * sit inside the app's Samut Sakhon pilot areas are mapped; there is no
 * pre-existing mapping anywhere else in the codebase (checked mockData.ts —
 * its `allAreas`/`monitoringStations` are hand-authored mock data with no
 * link to real Air4Thai station IDs), so this is the first one.
 *
 * Only 2 of the app's 5 areas have a real nearby Air4Thai ground station as
 * of this integration — "area-ban-phaeo", "area-krathum-baen", and
 * "area-bang-nam-chued" have none, so `records` below simply won't include
 * them and the frontend's existing mock fallback covers those areas.
 */
const STATION_TO_AREA_ID: Record<string, string> = {
  "27t": "area-mueang", // โรงเรียนสมุทรสาครวิทยาลัย — Maha Chai, Mueang district
  "14t": "area-om-noi", // แขวงการทางสมุทรสาคร — Om Noi subdistrict, Krathum Baen district
};

interface Air4ThaiParam {
  color_id: string;
  aqi: string;
  value?: string;
}

interface Air4ThaiStation {
  stationID: string;
  nameTH: string;
  nameEN: string;
  areaTH: string;
  areaEN: string;
  lat: string;
  long: string;
  AQILast: {
    date: string;
    time: string;
    PM25?: Air4ThaiParam;
    PM10?: Air4ThaiParam;
    AQI: Air4ThaiParam;
  };
}

interface Air4ThaiResponse {
  stations: Air4ThaiStation[];
}

interface NormalizedRecord {
  id: string;
  areaId: string;
  stationId: string;
  timestamp: string;
  aqi: number;
  pm25: number;
  pm10?: number;
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
  severity: ReturnType<typeof getAqiSeverity>;
  lastUpdated: string;
}

interface CacheEntry {
  fetchedAtMs: number;
  records: NormalizedRecord[];
  stations: NormalizedStation[];
}

// Module-level variable = the "simple in-memory cache" the task asked for.
// Persists across invocations on a warm serverless instance; a cold start
// just refetches, which is fine for a 3-4 day pilot with light traffic.
let cache: CacheEntry | null = null;

function parseNumOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  // Air4Thai uses "-1" as a "no data for this pollutant" sentinel.
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function toIsoTimestamp(date: string, time: string): string {
  // Air4Thai's date/time is Thailand local time (UTC+7).
  return `${date}T${time}:00+07:00`;
}

function extractDistrict(areaTH: string): string {
  const match = areaTH.match(/อ\.([^\s,]+)/);
  return match ? match[1] : areaTH;
}

/**
 * Some real ground stations go quiet for days (seen live: one Samut Sakhon
 * station was reporting a reading 5 days old). Presenting that as "live"
 * would be exactly the kind of misleading-looking-current data this
 * integration is supposed to avoid — treat it as no data for that station
 * instead, same as if Air4Thai had never reported it, so the existing
 * per-area mock fallback (and its console.warn) kicks in honestly.
 */
const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours

function normalize(raw: Air4ThaiResponse): CacheEntry {
  const records: NormalizedRecord[] = [];
  const stations: NormalizedStation[] = [];
  const fetchedAtMs = Date.now();

  for (const station of raw.stations) {
    const pm25 = parseNumOrUndefined(station.AQILast.PM25?.value);
    const aqi = parseNumOrUndefined(station.AQILast.AQI?.aqi);
    if (pm25 === undefined || aqi === undefined) continue;

    const timestamp = toIsoTimestamp(station.AQILast.date, station.AQILast.time);
    const ageMs = fetchedAtMs - new Date(timestamp).getTime();
    if (!Number.isFinite(ageMs) || ageMs > STALE_THRESHOLD_MS) continue;

    const lat = Number(station.lat);
    const lng = Number(station.long);

    const areaId = STATION_TO_AREA_ID[station.stationID];
    if (areaId) {
      records.push({
        id: `${areaId}-live-${station.stationID}`,
        areaId,
        stationId: station.stationID,
        timestamp,
        aqi,
        pm25,
        pm10: parseNumOrUndefined(station.AQILast.PM10?.value),
      });
    }

    // Station markers are scoped to the app's Samut Sakhon pilot region —
    // this is a small, single-province app, not a nationwide map.
    if (station.areaTH.includes("สมุทรสาคร") && Number.isFinite(lat) && Number.isFinite(lng)) {
      stations.push({
        id: station.stationID,
        name: station.nameTH.trim(),
        nameEn: station.nameEN,
        address: station.areaTH,
        district: extractDistrict(station.areaTH),
        province: "สมุทรสาคร",
        location: { lat, lng },
        currentAqi: aqi,
        currentPm25: pm25,
        severity: getAqiSeverity(aqi),
        lastUpdated: timestamp,
      });
    }
  }

  return { fetchedAtMs, records, stations };
}

/**
 * IMPORTANT — do not "clean this up" back to a plain `fetch()` call.
 *
 * Verified during integration (2026-07-18): air4thai.com/air4thai.pcd.go.th
 * serves a broken TLS chain — the leaf cert is issued by a Let's Encrypt
 * intermediate that the server never actually sends; instead it bundles an
 * unrelated, irrelevant old Sectigo/USERTrust/Comodo chain alongside it.
 * curl and browsers tolerate this (they do their own path-building), but
 * Node's native `fetch` (undici) does strict validation with no AIA
 * chasing and fails every time with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.
 * Since Vercel's Node.js serverless runtime uses the same `fetch`, a plain
 * `fetch()` call here would fail 100% of the time in production — this
 * isn't a local-only quirk.
 *
 * `rejectUnauthorized: false` is scoped to this ONE known government
 * open-data host, for a GET-only public request with no credentials sent —
 * not a blanket TLS bypass. Revisit if Air4Thai ever fixes their chain (see
 * the fallback trade-offs in the deployment summary).
 */
function fetchAir4Thai(): Promise<Air4ThaiResponse> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      AIR4THAI_URL,
      { timeout: FETCH_TIMEOUT_MS, rejectUnauthorized: false },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          reject(new Error(`Air4Thai responded with HTTP ${res.statusCode}`));
          return;
        }
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            const data = JSON.parse(body) as Air4ThaiResponse;
            if (!Array.isArray(data.stations)) {
              reject(new Error("Air4Thai response missing a valid stations array"));
              return;
            }
            resolve(data);
          } catch {
            reject(new Error("Air4Thai response was not valid JSON"));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Air4Thai request timed out")));
    req.on("error", reject);
  });
}

// Loose (non-@vercel/node) req/res typing intentionally — this repo has no
// Vercel types dependency, and Vercel's Node runtime accepts the classic
// (req, res) handler shape without one. Adding the dependency wasn't worth
// the time under the deployment deadline.
export default async function handler(req: { method?: string }, res: {
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (name: string, value: string) => void;
}) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  if (req.method && req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const now = Date.now();
  if (cache && now - cache.fetchedAtMs < CACHE_TTL_MS) {
    res.status(200).json({
      ok: true,
      source: "air4thai",
      cached: true,
      fetchedAt: new Date(cache.fetchedAtMs).toISOString(),
      records: cache.records,
      stations: cache.stations,
    });
    return;
  }

  try {
    const raw = await fetchAir4Thai();
    cache = normalize(raw);
    res.status(200).json({
      ok: true,
      source: "air4thai",
      cached: false,
      fetchedAt: new Date(cache.fetchedAtMs).toISOString(),
      records: cache.records,
      stations: cache.stations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // A stale cache is still better than nothing — serve it rather than
    // forcing every client straight to mock data during a brief outage.
    if (cache) {
      res.status(200).json({
        ok: true,
        source: "air4thai",
        cached: true,
        stale: true,
        fetchedAt: new Date(cache.fetchedAtMs).toISOString(),
        records: cache.records,
        stations: cache.stations,
        warning: `Serving stale cache — live refetch failed: ${message}`,
      });
      return;
    }

    res.status(502).json({ ok: false, error: message });
  }
}
