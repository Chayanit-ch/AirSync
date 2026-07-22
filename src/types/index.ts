/**
 * Shared domain types for AirSync.
 * These interfaces mirror the shape planned for Firestore collections so mock
 * data can later be swapped for live documents without reworking components.
 */

import type { Timestamp } from "firebase/firestore";

/**
 * Full 6-tier US EPA AQI scale. "sensitive" = Unhealthy for Sensitive Groups
 * (AQI 101-150), "unhealthy" = Unhealthy (151-200), "veryUnhealthy" = Very
 * Unhealthy (201-300), "hazardous" = Hazardous (301-500) — see
 * `getAqiSeverity` in `utils/aqi.ts` for the exact thresholds. Display labels
 * and health recommendations for every level always come from
 * `dict.common.severity` / `dict.common.severityRecommendation` (see
 * `useTranslation()`) — never hard-code them elsewhere.
 */
export type AQISeverityLevel =
  | "good"
  | "moderate"
  | "sensitive"
  | "unhealthy"
  | "veryUnhealthy"
  | "hazardous";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Which integration produced a reading. Surfaced in the UI for transparency
 * (2026-07-20): drives the Map's marker border style (`utils/dataSource.ts`
 * `SOURCE_STYLE`), the `SourceLegend`, the always-visible source line in
 * `StationBottomSheet`, and the viewport `SourceDebugCounter` — added after a
 * WAQI-coverage claim verified only via code/API calls didn't match what a
 * real user saw panning the live map to the same spot.
 */
export type DataSource = "air4thai" | "waqi" | "mock";

/**
 * A single timestamped air quality reading. Firestore: `airQualityRecords/{id}`.
 *
 * NATIONWIDE ROLLOUT (2026-07-19): `areaId` now holds a real Air4Thai
 * `stationID` (e.g. "27t"), nationwide — not a custom slug like the old
 * "area-mueang". Before this the app only recognized 5 hard-coded Samut
 * Sakhon areas; no migration was performed since real user data collection
 * hadn't started. The field name is unchanged (still what per-user history
 * queries filter on) to avoid a Firestore schema change, but its meaning is
 * now "which station" rather than "which of our 5 areas". `stationId` is
 * kept as a separate, always-equal-to-`areaId` field for the live (non-
 * Firestore) records returned by `/api/air4thai` — see `services/airQuality.ts`.
 */
export interface AirQualityRecord {
  id: string;
  areaId: string;
  stationId?: string;
  timestamp: string;
  aqi: number;
  pm25: number;
  pm10?: number;
  temperature?: number;
  humidity?: number;
  /** Optional because records already in Firestore before WAQI support shipped don't have it. */
  source?: DataSource;
}

/**
 * A fixed or mobile air quality monitoring station. Firestore: `monitoringStations/{id}`
 *
 * LOCATION-NAME STRATEGY (deliberate, verified 2026-07-19): `name`/`district`/
 * `province`/`address` are always displayed in their original Thai form,
 * regardless of the app's active language — never swapped for `nameEn` or
 * machine-translated. Air4Thai only sometimes provides an English `nameEn`
 * and never provides English `district`/`province`/`address` at all, so a
 * per-field translation table would inevitably translate some fields and
 * leave others in Thai for the same station — exactly the inconsistency the
 * i18n system is supposed to prevent. `nameEn` is kept only as an extra
 * search-matching field (see `utils/stationSearch.ts`), never rendered.
 */
export interface MonitoringStation {
  id: string;
  name: string;
  nameEn?: string;
  address: string;
  district: string;
  province: string;
  location: GeoPoint;
  currentAqi: number;
  currentPm25: number;
  /** Optional because the real Air4Thai feed doesn't report temperature — only mock stations have it. */
  temperature?: number;
  severity: AQISeverityLevel;
  lastUpdated: string;
  source?: DataSource;
}

/**
 * The FULL nationwide station catalog entry — permanent station info only,
 * no current reading. Unlike `MonitoringStation`, this exists for every
 * known station whether or not it's reporting live right now, so search
 * (`utils/stationSearch.ts`) and anything else that needs "does this station
 * exist" must use `StationMetadata[]`, not `MonitoringStation[]` — see
 * `allStations` in `services/airQuality.ts`.
 */
export interface StationMetadata {
  id: string;
  name: string;
  nameEn?: string;
  address: string;
  district: string;
  province: string;
  location: GeoPoint;
  source?: DataSource;
}

/** An area followed by a user, summarized for dashboard cards. */
export interface AreaAirQualitySummary {
  id: string;
  areaName: string;
  avgAqi: number;
  avgPm25: number;
  severity: AQISeverityLevel;
}

export type IncidentType =
  | "open_burning"
  | "black_smoke_vehicle"
  | "industrial_emissions"
  | "other";

export type PollutionReportStatus = "under_review" | "in_progress" | "resolved";

/** Union of every status value `StatusBadge` needs to render, across the legacy mock `PollutionReport` and the live `Report`. */
export type ReportStatus = PollutionReportStatus | "pending";

/** A citizen-submitted pollution report. Firestore: `pollutionReports/{id}` */
export interface PollutionReport {
  id: string;
  userId: string;
  incidentType: IncidentType;
  title: string;
  description: string;
  images: string[];
  location: GeoPoint & { address: string };
  reportedDate: string;
  reportedTime: string;
  contactEmail?: string;
  status: PollutionReportStatus;
  createdAt: string;
}

export type ReportType =
  | "burning"
  | "smoke_vehicle"
  | "factory"
  | "construction"
  | "garbage_burning"
  | "unknown_smell"
  | "other";

/**
 * A citizen-submitted pollution report, live in Firestore. Firestore: `reports/{reportId}`.
 * Powers the Report page's form + "My Reports" list (replacing the
 * `PollutionReport`/`pollutionReports` mock above there). `imageUrls` is
 * always `[]` until Firebase Storage is enabled — see `services/reports.ts`.
 */
export interface Report {
  id: string;
  reportedBy: string;
  type: ReportType;
  /** User-entered replacement label, only meaningful when `type === "other"` — never merged into `description`. */
  customTypeDescription?: string | null;
  description: string;
  imageUrls: string[];
  latitude: number;
  longitude: number;
  locationLabel: string;
  status: "pending" | "in_progress" | "resolved";
  contactEmail: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * One status change on a report, live in Firestore:
 * `reports/{reportId}/statusHistory/{entryId}`. Written only by
 * `updateReportStatus` (authority/admin only, enforced by Firestore rules —
 * see that function's comment) whenever a report's `status` changes, so
 * citizens can see their report is actually being tracked. Never mutated
 * after creation — an append-only log, not a "current state" doc.
 */
export interface StatusHistoryEntry {
  id: string;
  status: Report["status"];
  updatedBy: string;
  updatedAt: Timestamp;
}

export type AlertSeverity = AQISeverityLevel | "info";

/** A system-generated alert/notification (threshold breach, report status change, etc). Firestore: `alerts/{id}` */
export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  areaName?: string;
  createdAt: string;
  isRead: boolean;
}

export type ArticleCategory = "prevention" | "pm25" | "health";

/** A knowledge-center / news feed article. Firestore: `knowledgeArticles/{id}` */
export interface KnowledgeArticle {
  id: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  imageUrl: string;
  readTimeMinutes: number;
  publishedAt: string;
  isFeatured?: boolean;
}

export type UserRole = "citizen" | "admin" | "authority";

/** Drives the Home hero card's personalized recommendation matrix — see `utils/recommendation.ts`. */
export type RiskGroup = "general" | "children" | "elderly" | "respiratory" | "outdoor_worker";

export interface NotificationSettings {
  pushEnabled: boolean;
  dailySummaryEnabled: boolean;
}

/**
 * A user's account and settings only. Firestore: `users/{uid}`.
 *
 * IMPORTANT: never overwrite this whole document with `setDoc()` except at
 * first-time creation (see `ensureUserDocument`). Every later change must go
 * through `updateDoc()` with dot-notation for single fields (e.g.
 * `notificationSettings.pushEnabled`) or `arrayUnion`/`arrayRemove` for
 * `followedAreaIds` — never read-modify-write the whole object. This document
 * intentionally holds no per-area/day/week statistics arrays; those are
 * queried fresh from `airQualityRecords` (see services/airQuality.ts) so
 * there's no personal array here that a stale write could ever clobber.
 */
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: UserRole;
  /**
   * NATIONWIDE ROLLOUT (2026-07-19): now stores real Air4Thai `stationID`s
   * (e.g. "27t") that the user follows, nationwide — not the old 5
   * hard-coded Samut Sakhon area slugs (e.g. "area-mueang"). No migration
   * was performed since real user data collection hadn't started yet; still
   * only ever written via `arrayUnion`/`arrayRemove` (see `followArea`/
   * `unfollowArea` in `services/userProfile.ts`), never overwritten whole.
   */
  followedAreaIds: string[];
  notificationSettings: NotificationSettings;
  /** Optional because profiles created before this field shipped don't have it — treat missing as `"general"`, see `resolveRiskGroup`. */
  riskGroup?: RiskGroup;
  /** Whether this user has completed (or skipped) the first-run guided tour — see `OnboardingTourContext`. Missing/`false` means the tour should auto-start; `true` means it's done, and only the "How to Use" replay button shows it again. */
  hasCompletedOnboarding?: boolean;
  /** Optional, free-form daily-life context collected as future AI-recommendation input — see `updateDailyContext`. No field is required; missing keys just mean "not answered". */
  dailyContext?: DailyContext;
  /**
   * User-entered free-text health notes (e.g. allergies). Voluntarily provided, so it's
   * stored like any other profile field, but it must NEVER be read anywhere except the
   * Profile page of the account owner — no public profile, admin dashboard, or shared view
   * may fetch another user's `users/{uid}` document to display this (or any) field. See
   * `updateHealthNotes`.
   */
  healthNotes?: string;
  /** Cumulative gamification points, only ever changed via `increment()` — see `services/missions.ts`. Guardian level is derived from this at render time (see `utils/gamification.ts`), never stored separately. */
  points: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CommuteMethod = "walk" | "public_transit" | "motorcycle" | "car" | "other";

export interface DailyContext {
  commuteMethod?: CommuteMethod;
  worksOutdoors?: boolean;
  hasOutdoorPlansToday?: boolean;
  exerciseOutdoors?: boolean;
}

export type MissionFrequency = "daily" | "once";

/** Static mission definition — see `src/data/missions.ts`. Never stored in Firestore. */
export interface Mission {
  id: string;
  titleKey: string;
  descriptionKey: string;
  points: number;
  /** lucide-react icon component name. */
  icon: string;
  frequency: MissionFrequency;
  /** True for missions the app awards itself (no manual "mark complete" button). */
  auto?: boolean;
}

/**
 * A completed-mission record. Firestore: `users/{uid}/missionLog/{entryId}`.
 * `entryId` is deterministic (`${missionId}` for `frequency: "once"` missions,
 * `${missionId}_${dateKey}` for `"daily"` ones) — that determinism, combined with
 * a transaction, is what makes duplicate-completion prevention atomic. See
 * `services/missions.ts`.
 */
export interface MissionLogEntry {
  missionId: string;
  pointsEarned: number;
  completedAt: Timestamp;
  dateKey: string;
}

export type HistoricalPeriod = "daily" | "weekly" | "monthly";

/** A single point in a historical AQI/PM2.5 trend series (chart-ready). */
export interface HistoricalAQIData {
  period: HistoricalPeriod | "hourly";
  label: string;
  aqi: number;
  pm25: number;
  timestamp: string;
  highlighted?: boolean;
}
