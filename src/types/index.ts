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
  /** Optional because the real Air4Thai feed doesn't report temperature — only mock stations have it, or stations filled in via the OpenWeather fallback (see `getOpenWeatherFallback` in `services/airQuality.ts`). */
  temperature?: number;
  /** Optional, same reasons as `temperature` — never sourced from Air4Thai/WAQI, only mock stations or the OpenWeather fallback. */
  humidity?: number;
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
  /** Optional — Air4Thai/WAQI rarely report it; see `MonitoringStation.temperature` and the OpenWeather fallback in `services/airQuality.ts`. */
  temperature?: number;
  /** The underlying station's coordinates — only needed by callers that may still have to run the OpenWeather fallback themselves (e.g. per-card in `FollowedAreasGrid`) because `temperature` came back empty. */
  location?: GeoPoint;
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
  /** Set by `analyzeReportImageBestEffort` shortly after creation, only when the report has at least one image and the Gemini call succeeds — absent (never an empty string) otherwise, so the UI can gate purely on truthiness. */
  aiImageAnalysis?: string;
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
  /** Optional English translation — not read anywhere yet (every current display path renders `title`/`excerpt` directly, not through the TH/EN dictionary), but stored so the page can be made bilingual later without a data migration. */
  titleEn?: string;
  excerptEn?: string;
  /**
   * Full article body for the "read full article" expand on the card —
   * optional because the 5 articles seeded 2026-07-23 only have a short
   * `excerpt`, no separate long-form body yet. When absent, the UI shows
   * just the excerpt with no expand control, rather than a button that
   * reveals nothing new.
   */
  content?: string;
  contentEn?: string;
  category: ArticleCategory;
  imageUrl: string;
  readTimeMinutes: number;
  publishedAt: string;
  isFeatured?: boolean;
}

export type UserRole = "citizen" | "admin" | "authority";

/**
 * Display-only identity — labels, avatars, badges. Has NO effect on Firestore
 * permissions; that's `role`'s job alone. Never let app UI write `role`.
 */
export type UserType = "citizen" | "organization" | "government";

/** Drives the Home hero card's personalized recommendation matrix — see `utils/recommendation.ts`. */
export type RiskGroup = "general" | "children" | "elderly" | "respiratory" | "outdoor_worker";

/**
 * A single citizen's 1-5 star rating of an organization account. Firestore:
 * `users/{orgUid}/ratings/{raterUid}` — document ID is the rater's own uid,
 * so each person can only ever have one rating per organization; a repeat
 * rating overwrites this same document rather than creating another one.
 * Independent Firestore rules from the parent `users/{orgUid}` doc, same
 * philosophy as `missionLog`/`aiAdvice` subcollections.
 */
export interface OrganizationRating {
  rating: number;
  raterUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrganizationRatingSummary {
  average: number;
  count: number;
}

/**
 * Public directory mirror for organization AND government accounts — despite
 * the "organization" name (kept to avoid a Firestore collection rename),
 * this also covers verified government agencies so both can share the same
 * leaderboard/rating system, filterable by `userType`. Firestore:
 * `organizationProfiles/{uid}`. Deliberately holds ONLY non-sensitive
 * fields safe for anyone (including guests) to read — never merge this with
 * `users/{uid}`, which stays owner-read-only (see `UserProfile.healthNotes`).
 * Written only by the account's own client (see
 * `services/organizationDirectory.ts`), whenever their `userType`
 * becomes/stops being `"organization"` or becomes/stops being an *approved*
 * `"government"` account, and opportunistically refreshed whenever they view
 * their own Profile page.
 */
export interface OrganizationDirectoryEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  points: number;
  userType: "organization" | "government";
  updatedAt: Timestamp;
}

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
/**
 * A user's own explicit character customization choices — see
 * `utils/avatarCustomization.ts` for the preset option lists, defaults, and
 * the level-based unlock logic. Reaching a level never auto-populates this;
 * it's only ever written by the user's own Save action in
 * `CharacterCustomizationModal` (see `updateUserAvatarConfig`), and
 * `CharacterAvatar` renders exactly what's here — no re-derivation from
 * level at render time, so an already-equipped item is never revoked just
 * because points later dropped.
 */
export interface AvatarConfig {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  hasGlasses: boolean;
  /** `staff`/`chakram` are the "for high levels" tier — see `getUnlockedSlots`'s separate `advancedWeapon` threshold. */
  equippedWeapon?: "sword" | "gun" | "staff" | "chakram" | null;
  equippedShield: boolean;
  equippedCape: boolean;
  equippedShoes: "basic" | "boots" | null;
  /** Optional because saved before this field existed — see `resolveAvatarConfig`, defaults to `false`. */
  equippedMask?: boolean;
  /** Optional because saved before this field existed — see `resolveAvatarConfig`, defaults to `false`. */
  equippedSanitizer?: boolean;
  /** Optional because saved before this field existed — see `resolveAvatarConfig`, defaults to `null`. */
  equippedHat?: "helmet" | "cap" | null;
  /** Recolors the uniform + cape only — the chest badge always renders in the true role color (see `ThemeUniform`) so identity stays readable regardless. `null`/missing means "use the role's default color". */
  uniformColor?: string | null;
  /** Optional because saved before this field existed — see `resolveAvatarConfig`, defaults to `"happy"`. */
  expression?: string;
  /** A visual accent overlaid on the uniform (stripes, chevron, etc.) — `null`/missing means plain/solid, no pattern. Optional because saved before this field existed. */
  uniformPattern?: string | null;
  /** Recolors that one equipment piece only — `null`/missing means "use its built-in default color", same convention as `uniformColor`. Optional because saved before these fields existed. */
  weaponColor?: string | null;
  shieldColor?: string | null;
  hatColor?: string | null;
  shoesColor?: string | null;
  /** The armored-look "jacket" layer (belt, gloves, shoulder/arm/leg armor, the more pronounced tier-based torso taper) — `false` reverts to a plain-t-shirt silhouette regardless of level. Optional because saved before this field existed — see `resolveAvatarConfig`, defaults to `true` so existing accounts see no change. */
  equippedJacket?: boolean;
  /** Optional because saved before this field existed — see `resolveAvatarConfig`, defaults to `"round"`. */
  glassesStyle?: string;
  /** Recolors the legs only — `null`/missing means "use the default charcoal", same convention as `uniformColor`/`shoesColor`. Deliberately separate from `uniformColor` so the shirt and pants can be colored independently. */
  pantsColor?: string | null;
  /** The chest emblem shape — `star`/`shield`/`circle`/`diamond`. Optional because saved before this field existed — see `resolveAvatarConfig`, defaults to `"star"`. */
  badgeStyle?: string;
  /** `"hygiene"` (original, over the mouth) or `"visor"` (a solid hero/guardian mask over the eyes). Optional because saved before this field existed — see `resolveAvatarConfig`, defaults to `"hygiene"`. */
  maskStyle?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: UserRole;
  /** Optional because profiles created before this field shipped don't have it — treat missing as `"citizen"`, see `getUserType`. Purely cosmetic; never gates permissions. */
  userType?: UserType;
  /** Optional — missing/anything but `"approved"` means the government badge shows as "Pending Verification" instead of the full official badge (see `isPendingGovernmentVerification`). Set to `"pending"` automatically whenever `userType` becomes `"government"`; only an administrator flips it to `"approved"`, manually via the Firestore Console (same as `role: authority` today). Purely cosmetic, like `userType` — never gates permissions. */
  governmentVerificationStatus?: "pending" | "approved";
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
  /** Optional — missing/undefined means the user hasn't customized their character yet; treat as `DEFAULT_AVATAR_CONFIG`, see `resolveAvatarConfig`. */
  avatarConfig?: AvatarConfig;
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
