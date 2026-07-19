import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { monitoringStations as mockMonitoringStations } from "../data/mockData";
import { pm25ToAqi, getAqiSeverity } from "../utils/aqi";
import type { AirQualityRecord, MonitoringStation } from "../types";

/**
 * Mueang Samut Sakhon's real Air4Thai stationID — used as the guest/no-
 * permission default for the Home hero card. Kept as a plain constant (not
 * a "known area") now that any of the 174 nationwide stations is a valid
 * target — see `useNearestStationHero`.
 */
export const DEFAULT_STATION_ID = "27t";

/** Neutral placeholder reading used only when a specific requested station
 * has no live data available at all this session (see `resolveStationReading`
 * and `generateSyntheticStationHistory` below) — moderate/AQI ~75, so it
 * never reads as falsely "clean" or falsely "hazardous". */
const GENERIC_MOCK_PM25 = 24;

/** Firestore's `in` operator only accepts up to 10 values per query. */
const FIRESTORE_IN_QUERY_LIMIT = 10;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function queryAirQualityRecords(
  stationIds: string[],
  maxPerChunk = 400,
): Promise<AirQualityRecord[]> {
  const results = await Promise.all(
    chunk(stationIds, FIRESTORE_IN_QUERY_LIMIT).map(async (idsChunk) => {
      const recordsQuery = query(
        collection(db, "airQualityRecords"),
        where("areaId", "in", idsChunk),
        orderBy("timestamp", "desc"),
        limit(maxPerChunk),
      );
      const snapshot = await getDocs(recordsQuery);
      return snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as AirQualityRecord,
      );
    }),
  );
  return results.flat();
}

/** Cheap deterministic string hash so each station's synthetic history looks
 * distinct but stable across reloads, without a random seed library. */
function hashStationId(stationId: string): number {
  let seed = 0;
  for (let i = 0; i < stationId.length; i++) {
    seed = (seed * 31 + stationId.charCodeAt(i)) % 997;
  }
  return seed;
}

/**
 * Synthesizes a plausible-looking 120-day PM2.5 history for a single station
 * that has no real `airQualityRecords` yet — nationwide equivalent of the
 * old per-area mock history, generalized to any Air4Thai `stationID` instead
 * of 5 hard-coded areas (there's no way to have real pre-seeded history for
 * a station nobody has followed yet). Always paired with a `console.warn` by
 * the caller — never a silent substitution.
 */
function generateSyntheticStationHistory(
  stationId: string,
  days = 120,
): AirQualityRecord[] {
  const seed = hashStationId(stationId);
  const baselinePm25 = GENERIC_MOCK_PM25 + (seed % 40); // spread baselines ~24-64 across stations
  const records: AirQualityRecord[] = [];
  const today = new Date();
  today.setHours(6, 0, 0, 0);

  for (let daysAgo = 0; daysAgo < days; daysAgo++) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    const wave =
      Math.sin((daysAgo + seed) / 5) * 0.15 + Math.sin((daysAgo + seed) / 30) * 0.2;
    const pm25 = Math.max(3, baselinePm25 * (1 + wave));

    records.push({
      id: `${stationId}-mock-history-${daysAgo}`,
      areaId: stationId,
      timestamp: date.toISOString(),
      aqi: pm25ToAqi(pm25),
      pm25: Math.round(pm25 * 10) / 10,
    });
  }

  return records;
}

/**
 * Returns historical air-quality records for the stations a user follows.
 * Always queried fresh, filtered by `areaId` (= stationID, see types.ts) —
 * never persisted per-user, so there's no personal statistics array anywhere
 * that a stale write could ever overwrite.
 *
 * Merges real Firestore data with synthetic data PER STATION rather than
 * all-or-nothing: some stations (the ones `upsertLiveRecords` has already
 * seeded) accumulate real history while brand-new ones never followed before
 * won't have any yet. Returning only real data the moment ANY station has
 * some would silently blank out every other station's card/chart — exactly
 * the kind of hidden failure this app is trying to stop doing.
 */
export async function getAreaAirQualityHistory(
  stationIds: string[],
): Promise<AirQualityRecord[]> {
  if (stationIds.length === 0) return [];

  // TODO: Composite index must be created first.
  // See the previously provided Firebase index URL.
  // Otherwise this query will silently fall back forever.
  let realRecords: AirQualityRecord[] = [];
  try {
    realRecords = await queryAirQualityRecords(stationIds);
  } catch (error) {
    console.error(
      "Failed to query airQualityRecords, falling back to mock data",
      error,
    );
  }

  const stationIdsWithRealData = new Set(realRecords.map((record) => record.areaId));
  const stationIdsNeedingMock = stationIds.filter((id) => !stationIdsWithRealData.has(id));

  if (stationIdsNeedingMock.length > 0) {
    console.warn(
      `Using mock history data for station(s) [${stationIdsNeedingMock.join(", ")}] — no real airQualityRecords for them yet.`,
    );
  }

  const mockRecords = stationIdsNeedingMock.flatMap((id) =>
    generateSyntheticStationHistory(id),
  );

  return [...realRecords, ...mockRecords];
}

const AIR4THAI_PROXY_URL = "/api/air4thai";
const AIR4THAI_TIMEOUT_MS = 8000;

interface Air4ThaiProxyResponse {
  ok: boolean;
  records?: AirQualityRecord[];
  stations?: MonitoringStation[];
  error?: string;
}

export interface LiveAirQualityResult {
  /** One entry per currently-reporting real station, nationwide. Empty if the whole fetch failed. */
  records: AirQualityRecord[];
  /** Nationwide live stations, or the small legacy Samut Sakhon mock set if the whole fetch failed. */
  stations: MonitoringStation[];
  /** True only if the `/api/air4thai` request itself succeeded. */
  isLive: boolean;
}

/**
 * Fire-and-forget upsert of freshly-fetched live records into Firestore's
 * `airQualityRecords` collection, so history accumulates naturally as real
 * users open the app — deliberately no cron job / scheduled function (not
 * available on Vercel's free tier without extra setup). Deterministic
 * per-hour doc IDs make repeated writes a natural upsert instead of piling
 * up duplicates.
 */
async function upsertLiveRecords(records: AirQualityRecord[]): Promise<void> {
  await Promise.all(
    records.map(async (record) => {
      const hourKey = record.timestamp.slice(0, 13); // e.g. "2026-07-18T21"
      const docId = `${record.areaId}_${hourKey}`;
      try {
        await setDoc(doc(db, "airQualityRecords", docId), record, { merge: true });
      } catch (error) {
        console.error("Failed to upsert live air quality record", record.areaId, error);
      }
    }),
  );
}

/**
 * Live, current-moment air quality nationwide — for the Home hero card
 * (nearest-station search), the Map's station markers, and Profile's station
 * search, always fetched fresh through the `/api/air4thai` Vercel proxy,
 * never Firestore (that's what `getAreaAirQualityHistory` above is for).
 *
 * Unlike the old 5-hard-coded-areas version, this returns whatever Air4Thai
 * actually has fresh data for right now (real stations only) — callers that
 * need a *specific* station (a followed one, or the guest default) use
 * `resolveStationReading` below to fall back honestly if that one specific
 * station isn't in this batch. If the fetch itself fails entirely, this
 * falls back to a small hard-coded Samut Sakhon mock station set with a loud
 * `console.warn` — never silently.
 */
export async function getLiveAirQuality(): Promise<LiveAirQualityResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AIR4THAI_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(AIR4THAI_PROXY_URL, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`/api/air4thai responded with HTTP ${response.status}`);
    }
    const data = (await response.json()) as Air4ThaiProxyResponse;
    if (!data.ok || !data.records || !data.stations) {
      throw new Error(data.error ?? "/api/air4thai returned an invalid payload");
    }

    // Don't block rendering on the Firestore write — the caller already has
    // everything it needs. Skipped entirely for signed-out visitors: Firestore
    // rules reject unauthenticated writes to this collection, and now that
    // this covers ~170 nationwide stations (not 2), attempting it for every
    // guest page load would fire ~170 doomed writes and log ~170
    // "Missing or insufficient permissions" errors per load for nothing.
    if (auth.currentUser) {
      void upsertLiveRecords(data.records);
    }

    return { records: data.records, stations: data.stations, isLive: true };
  } catch (error) {
    console.warn("Using mock data because Air4Thai is unavailable.", error);
    return { records: [], stations: mockMonitoringStations, isLive: false };
  }
}

/** Last-resort placeholder for Mueang Samut Sakhon (station `27t`) — the
 * app's original, real, named pilot station — reused so the guest/no-
 * permission default reading always has a real-looking name even if this
 * one specific station is momentarily missing from the live batch. */
const DEFAULT_STATION_FALLBACK: MonitoringStation = {
  id: DEFAULT_STATION_ID,
  name: "โรงเรียนสมุทรสาครวิทยาลัย",
  nameEn: "Samut Sakhon Witthayalai School",
  address: "อ.เมือง จ.สมุทรสาคร",
  district: "เมือง",
  province: "สมุทรสาคร",
  location: { lat: 13.5475, lng: 100.2745 },
  currentAqi: pm25ToAqi(GENERIC_MOCK_PM25),
  currentPm25: GENERIC_MOCK_PM25,
  severity: getAqiSeverity(pm25ToAqi(GENERIC_MOCK_PM25)),
  lastUpdated: new Date().toISOString(),
};

/**
 * Resolves one specific station's current reading out of an already-fetched
 * `stations` list. Real if that station is currently reporting; otherwise a
 * clearly-flagged synthetic reading with a loud `console.warn` naming the
 * station — used by the hero card's guest/no-permission default and by
 * followed-station summaries, both of which need one named station's data
 * rather than "whichever stations happen to be live right now".
 */
export function resolveStationReading(
  stationId: string,
  stations: MonitoringStation[],
): { station: MonitoringStation; isLive: boolean } {
  const found = stations.find((s) => s.id === stationId);
  if (found) return { station: found, isLive: true };

  console.warn(
    `No live reading for station "${stationId}" this session — using placeholder data.`,
  );

  if (stationId === DEFAULT_STATION_ID) {
    return { station: DEFAULT_STATION_FALLBACK, isLive: false };
  }

  return {
    station: {
      ...DEFAULT_STATION_FALLBACK,
      id: stationId,
      name: stationId,
      nameEn: stationId,
      address: "",
      district: "",
      province: "",
    },
    isLive: false,
  };
}
