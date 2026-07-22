import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { REPORT_POLLUTION_MISSION } from "../data/missions";
import { awardMissionBestEffort } from "./missions";
import type { Report, ReportType, StatusHistoryEntry } from "../types";

/** Firestore rules require an authenticated user to read `reports` at all — callers must never invoke `subscribeToRecentReports` while signed out. */
const RECENT_REPORTS_LIMIT = 40;

/**
 * The label to display for a report's type — for `type === "other"` this is
 * the user's own `customTypeDescription`, never the generic "Other" fallback
 * label, so every report list/card/badge shows what the user actually typed.
 * `typeLabels` should come from the active `useTranslation()` dictionary
 * (`dict.report.types`) so this stays in the current language instead of a
 * second hard-coded (Thai-only) label table.
 */
export function getReportTypeLabel(
  report: Pick<Report, "type" | "customTypeDescription">,
  typeLabels: Record<ReportType, string>,
): string {
  if (report.type === "other") {
    return report.customTypeDescription?.trim() || typeLabels.other;
  }
  return typeLabels[report.type];
}

export interface CreateReportInput {
  type: ReportType;
  /** Only used (and required by the form) when `type === "other"`. */
  customTypeDescription?: string;
  description: string;
  latitude: number;
  longitude: number;
  locationLabel: string;
  contactEmail: string | null;
  /** Real Cloudinary `secure_url`s — already-uploaded by the time this is called (see `ReportForm`'s `uploadImage` step); never a local blob URL. */
  imageUrls: string[];
}

/**
 * Creates a `reports/{reportId}` document. `reportedBy` is always read from
 * `auth.currentUser` here — never accepted from the caller — so a spoofed
 * value can't be passed in, matching the Firestore rule that requires
 * `request.resource.data.reportedBy == request.auth.uid`. `status` is always
 * "pending".
 */
export async function createReport(data: CreateReportInput): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    // Internal-only guard — ReportForm already disables submission while
    // signed out, so the UI never surfaces this message directly; it's just
    // never left untranslated in the (unreachable-via-UI) fallback path.
    throw new Error("Report submission requires a signed-in user");
  }

  await addDoc(collection(db, "reports"), {
    reportedBy: uid,
    type: data.type,
    // Firestore rejects `undefined` field values outright, so this is always
    // explicitly `null` rather than omitted when type !== "other".
    customTypeDescription: data.type === "other" ? (data.customTypeDescription ?? null) : null,
    description: data.description,
    imageUrls: data.imageUrls,
    latitude: data.latitude,
    longitude: data.longitude,
    locationLabel: data.locationLabel,
    status: "pending",
    contactEmail: data.contactEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Best-effort: the report itself is already saved above, so a gamification
  // hiccup here must never surface as a failed submission to the user.
  await awardMissionBestEffort(uid, REPORT_POLLUTION_MISSION);
}

/**
 * Live-subscribes to the current user's own reports, newest first. Mirrors
 * the `users/{uid}` live-subscription pattern in AuthContext so newly
 * submitted reports (and status changes) show up without a refetch.
 */
export function subscribeToMyReports(
  uid: string,
  onChange: (reports: Report[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const reportsQuery = query(
    collection(db, "reports"),
    where("reportedBy", "==", uid),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Report),
      );
    },
    (error) => {
      console.error("Failed to subscribe to reports", error);
      onError?.(error);
    },
  );
}

/**
 * Live-subscribes to the most recent reports from *any* user (not filtered
 * by `reportedBy`, unlike `subscribeToMyReports` above) — the raw feed for
 * Home's Community Monitoring section, which then filters client-side to
 * whatever's actually near the current user (see `haversineDistanceKm` in
 * `utils/geo.ts`, the same function the Map/hero nearest-station logic
 * already uses). Firestore's `reports` collection only allows authenticated
 * reads, so this must only ever be called while signed in — callers must
 * check `currentUser` first and never call this as a guest.
 */
export function subscribeToRecentReports(
  onChange: (reports: Report[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const reportsQuery = query(
    collection(db, "reports"),
    orderBy("createdAt", "desc"),
    limit(RECENT_REPORTS_LIMIT),
  );

  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Report),
      );
    },
    (error) => {
      console.error("Failed to subscribe to recent reports", error);
      onError?.(error);
    },
  );
}

/**
 * Authority/admin-only: changes a report's status. Updates only `status` +
 * `updatedAt` on the report (dot-field `updateDoc`, never a whole-document
 * overwrite) and appends one entry to `reports/{reportId}/statusHistory` so
 * the reporting citizen can see their report is being acted on — see
 * `subscribeToStatusHistory`. The caller (`ReportDetailModal`) is
 * responsible for only rendering the control that invokes this for
 * `userProfile.role === "authority" | "admin"`; this function itself doesn't
 * re-check the role client-side because that check is not a security
 * boundary — Firestore rules are (see the rules this feature requires,
 * documented where the role gate is implemented).
 */
export async function updateReportStatus(
  reportId: string,
  status: Report["status"],
  updatedByUid: string,
): Promise<void> {
  await updateDoc(doc(db, "reports", reportId), {
    status,
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, "reports", reportId, "statusHistory"), {
    status,
    updatedBy: updatedByUid,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Live-subscribes to a single report's status change log, oldest first (a
 * timeline of what happened, read top-to-bottom) — rendered for every viewer
 * of `ReportDetailModal`, not just authorities, so the reporting citizen can
 * see their report is being tracked.
 */
export function subscribeToStatusHistory(
  reportId: string,
  onChange: (entries: StatusHistoryEntry[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const historyQuery = query(
    collection(db, "reports", reportId, "statusHistory"),
    orderBy("updatedAt", "asc"),
  );

  return onSnapshot(
    historyQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as StatusHistoryEntry,
        ),
      );
    },
    (error) => {
      console.error("Failed to subscribe to report status history", error);
      onError?.(error);
    },
  );
}
