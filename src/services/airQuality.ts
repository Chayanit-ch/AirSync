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
import { db } from "../firebase";
import {
  airQualityRecords as mockAirQualityRecords,
  allAreas,
  monitoringStations as mockMonitoringStations,
} from "../data/mockData";
import type { AirQualityRecord, MonitoringStation } from "../types";

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
  areaIds: string[],
  maxPerChunk = 400,
): Promise<AirQualityRecord[]> {
  const results = await Promise.all(
    chunk(areaIds, FIRESTORE_IN_QUERY_LIMIT).map(async (idsChunk) => {
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

/**
 * Returns historical air-quality records for the areas a user follows.
 * Always queried fresh, filtered by areaId — never persisted per-user, so
 * there's no personal statistics array anywhere that a stale write could
 * ever overwrite.
 *
 * Merges real Firestore data with mock data PER AREA rather than
 * all-or-nothing: now that `getLiveAirQuality` upserts real records as
 * users open the Home page, some areas (the ones Air4Thai actually covers)
 * accumulate real history while others never will. Returning only real data
 * the moment ANY area has some would silently blank out every other area's
 * card/chart — exactly the kind of hidden failure this app is trying to
 * stop doing.
 */
export async function getAreaAirQualityHistory(
  areaIds: string[],
): Promise<AirQualityRecord[]> {
  if (areaIds.length === 0) return [];

  // TODO: Composite index must be created first.
  // See the previously provided Firebase index URL.
  // Otherwise this query will silently fall back forever.
  let realRecords: AirQualityRecord[] = [];
  try {
    realRecords = await queryAirQualityRecords(areaIds);
  } catch (error) {
    console.error(
      "Failed to query airQualityRecords, falling back to mock data",
      error,
    );
  }

  const areaIdsWithRealData = new Set(realRecords.map((record) => record.areaId));
  const areaIdsNeedingMock = areaIds.filter((id) => !areaIdsWithRealData.has(id));

  if (areaIdsNeedingMock.length > 0) {
    console.warn(
      `Using mock history data for area(s) [${areaIdsNeedingMock.join(", ")}] — no real airQualityRecords for them yet.`,
    );
  }

  const mockRecords = mockAirQualityRecords.filter((record) =>
    areaIdsNeedingMock.includes(record.areaId),
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

export interface LiveAirQualityRecord extends AirQualityRecord {
  /** false when this specific area had no real Air4Thai coverage (or the whole fetch failed) and fell back to mock. */
  isLive: boolean;
}

export interface LiveAirQualityResult {
  records: LiveAirQualityRecord[];
  stations: MonitoringStation[];
  /** Whole-fetch-level: true only if the Air4Thai request itself succeeded (even if some areas still had no station). */
  isLive: boolean;
}

function latestMockRecordPerArea(): AirQualityRecord[] {
  const latestByArea = new Map<string, AirQualityRecord>();
  for (const record of mockAirQualityRecords) {
    const existing = latestByArea.get(record.areaId);
    if (!existing || record.timestamp > existing.timestamp) {
      latestByArea.set(record.areaId, record);
    }
  }
  return [...latestByArea.values()];
}

/**
 * Fire-and-forget upsert of freshly-fetched live records into Firestore's
 * `airQualityRecords` collection, so history accumulates naturally as real
 * users open the app — deliberately no cron job / scheduled function (not
 * available on Vercel's free tier without extra setup, and not worth the
 * time under the deployment deadline). Deterministic per-hour doc IDs make
 * repeated writes a natural upsert instead of piling up duplicates.
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

const KNOWN_AREA_IDS = allAreas.map((area) => area.id);

/**
 * Live, current-moment air quality for the Home hero card and Map station
 * markers — always fetched fresh through the `/api/air4thai` Vercel proxy,
 * never Firestore (that's what `getAreaAirQualityHistory` above is for).
 *
 * Only some of the app's areas have a real nearby Air4Thai station (see the
 * mapping in `api/air4thai.ts`), so this always returns one record per known
 * area — real where Air4Thai covers it, mock otherwise — with each record
 * individually flagged `isLive`. Every area that falls back to mock (whether
 * because the whole fetch failed, or Air4Thai just has no station there)
 * gets a loud `console.warn` naming it. Per the no-more-silent-fallbacks
 * rule, this must never fail quietly the way the Firestore queries once did.
 */
export async function getLiveAirQuality(): Promise<LiveAirQualityResult> {
  let liveRecords: AirQualityRecord[] = [];
  let stations: MonitoringStation[] = mockMonitoringStations;
  let fetchSucceeded = false;

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

    liveRecords = data.records;
    stations = data.stations;
    fetchSucceeded = true;

    // Don't block rendering on the Firestore write — the caller already has
    // everything it needs.
    void upsertLiveRecords(liveRecords);
  } catch (error) {
    console.warn("Using mock data because Air4Thai is unavailable.", error);
  }

  const liveByArea = new Map(liveRecords.map((r) => [r.areaId, r]));
  const mockByArea = new Map(latestMockRecordPerArea().map((r) => [r.areaId, r]));

  const records: LiveAirQualityRecord[] = KNOWN_AREA_IDS.flatMap((areaId): LiveAirQualityRecord[] => {
    const live = liveByArea.get(areaId);
    if (live) return [{ ...live, isLive: true }];

    if (fetchSucceeded) {
      // Could be a genuinely unmapped area, or a mapped station whose
      // reading was too stale to trust (filtered server-side) — either way,
      // this area has no usable live reading right now.
      console.warn(
        `Using mock data for area "${areaId}" — no fresh Air4Thai reading available for it right now.`,
      );
    }
    const mock = mockByArea.get(areaId);
    return mock ? [{ ...mock, isLive: false }] : [];
  });

  return { records, stations, isLive: fetchSucceeded };
}
