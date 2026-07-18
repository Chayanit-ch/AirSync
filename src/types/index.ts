/**
 * Shared domain types for AirSync.
 * These interfaces mirror the shape planned for Firestore collections so mock
 * data can later be swapped for live documents without reworking components.
 */

import type { Timestamp } from "firebase/firestore";

export type AQISeverityLevel = "good" | "moderate" | "sensitive" | "unhealthy";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * A single timestamped air quality reading. Firestore: `airQualityRecords/{id}`.
 * `areaId` links the record to an `AreaAirQualitySummary`/followed-area id —
 * that's what per-user history queries filter on. `stationId` is optional
 * since area-level aggregates aren't always tied to one physical station.
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
}

/** A fixed or mobile air quality monitoring station. Firestore: `monitoringStations/{id}` */
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

export type ReportType = "burning" | "smoke_vehicle" | "factory";

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
  guardianLevel: number;
  followedAreaIds: string[];
  notificationSettings: NotificationSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
