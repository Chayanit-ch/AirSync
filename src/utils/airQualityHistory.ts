import type { AirQualityRecord, HistoricalAQIData, HistoricalPeriod } from "../types";

/** Chart bucket labels for weekday/month names, and the "Week N" template — sourced from the active `useTranslation()` dictionary by the caller so this stays in the current language instead of a hard-coded (Thai-only) label set. */
export interface BucketLabels {
  weekdays: readonly string[];
  months: readonly string[];
  weekLabel: (n: number) => string;
}

interface Bucket {
  label: string;
  timestamp: string;
  aqi: number[];
  pm25: number[];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildDailyBuckets(now: Date, labels: BucketLabels): Bucket[] {
  const buckets: Bucket[] = [];
  for (let i = 4; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    buckets.push({ label: labels.weekdays[day.getDay()], timestamp: day.toISOString(), aqi: [], pm25: [] });
  }
  return buckets;
}

function buildWeeklyBuckets(now: Date, labels: BucketLabels): Bucket[] {
  const buckets: Bucket[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7 - 6);
    buckets.push({ label: labels.weekLabel(4 - i), timestamp: weekStart.toISOString(), aqi: [], pm25: [] });
  }
  return buckets;
}

/** ~24h window in eight 3-hour buckets, rolling and ending at `now` (not calendar-aligned) — so the rightmost bucket always covers "right now" and can be compared directly against a live current reading. */
const HOURLY_BUCKET_COUNT = 8;
const HOURLY_BUCKET_STEP_MS = 3 * 60 * 60 * 1000;

function buildHourlyBuckets(now: Date): Bucket[] {
  const buckets: Bucket[] = [];
  for (let ageIndex = HOURLY_BUCKET_COUNT - 1; ageIndex >= 0; ageIndex--) {
    const bucketTime = new Date(now.getTime() - ageIndex * HOURLY_BUCKET_STEP_MS);
    buckets.push({
      label: `${String(bucketTime.getHours()).padStart(2, "0")}:00`,
      timestamp: bucketTime.toISOString(),
      aqi: [],
      pm25: [],
    });
  }
  return buckets;
}

function buildMonthlyBuckets(now: Date, labels: BucketLabels): Bucket[] {
  const buckets: Bucket[] = [];
  for (let i = 3; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: labels.months[monthDate.getMonth()], timestamp: monthDate.toISOString(), aqi: [], pm25: [] });
  }
  return buckets;
}

/**
 * Groups raw area air-quality records (from a real Firestore query or the
 * mock fallback — same shape either way) into chart-ready daily/weekly/
 * monthly buckets. Purely a client-side computation over data queried fresh
 * each time; nothing here is ever written back to Firestore.
 */
export function bucketAirQualityRecords(
  records: AirQualityRecord[],
  period: HistoricalPeriod | "hourly",
  labels: BucketLabels,
): HistoricalAQIData[] {
  if (records.length === 0) return [];

  const nowExact = new Date();
  const now = startOfDay(nowExact);
  const buckets =
    period === "hourly"
      ? buildHourlyBuckets(nowExact)
      : period === "daily"
        ? buildDailyBuckets(now, labels)
        : period === "weekly"
          ? buildWeeklyBuckets(now, labels)
          : buildMonthlyBuckets(now, labels);

  for (const record of records) {
    const recordDate = new Date(record.timestamp);
    let index = -1;

    if (period === "hourly") {
      const ageMs = nowExact.getTime() - recordDate.getTime();
      if (ageMs >= 0 && ageMs < HOURLY_BUCKET_COUNT * HOURLY_BUCKET_STEP_MS) {
        const ageIndex = Math.floor(ageMs / HOURLY_BUCKET_STEP_MS);
        index = HOURLY_BUCKET_COUNT - 1 - ageIndex;
      }
    } else if (period === "daily") {
      const day = startOfDay(recordDate).getTime();
      index = buckets.findIndex((b) => startOfDay(new Date(b.timestamp)).getTime() === day);
    } else if (period === "weekly") {
      const daysAgo = Math.floor((now.getTime() - startOfDay(recordDate).getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = 3 - Math.floor(daysAgo / 7);
      if (weekIndex >= 0 && weekIndex <= 3) index = weekIndex;
    } else {
      const monthsAgo =
        (now.getFullYear() - recordDate.getFullYear()) * 12 + (now.getMonth() - recordDate.getMonth());
      const monthIndex = 3 - monthsAgo;
      if (monthIndex >= 0 && monthIndex <= 3) index = monthIndex;
    }

    if (index >= 0) {
      buckets[index].aqi.push(record.aqi);
      buckets[index].pm25.push(record.pm25);
    }
  }

  const results: HistoricalAQIData[] = buckets.map((b) => ({
    period,
    label: b.label,
    aqi: Math.round(average(b.aqi)),
    pm25: Math.round(average(b.pm25) * 10) / 10,
    timestamp: b.timestamp,
  }));

  const maxAqi = Math.max(...results.map((r) => r.aqi));
  return results.map((r) => (maxAqi > 0 && r.aqi === maxAqi ? { ...r, highlighted: true } : r));
}
