import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import type { Report, ReportType } from "../types";

export const REPORT_TYPE_LABELS_TH: Record<ReportType, string> = {
  burning: "การเผาในที่โล่ง",
  smoke_vehicle: "รถควันดำ",
  factory: "มลพิษจากโรงงานอุตสาหกรรม",
};

export interface CreateReportInput {
  type: ReportType;
  description: string;
  latitude: number;
  longitude: number;
  locationLabel: string;
  contactEmail: string | null;
}

/**
 * Creates a `reports/{reportId}` document. `reportedBy` is always read from
 * `auth.currentUser` here — never accepted from the caller — so a spoofed
 * value can't be passed in, matching the Firestore rule that requires
 * `request.resource.data.reportedBy == request.auth.uid`. `status` is always
 * "pending" and `imageUrls` always `[]`, since Storage isn't enabled yet.
 */
export async function createReport(data: CreateReportInput): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("ต้องเข้าสู่ระบบก่อนจึงจะส่งรายงานได้");
  }

  await addDoc(collection(db, "reports"), {
    reportedBy: uid,
    type: data.type,
    description: data.description,
    imageUrls: [],
    latitude: data.latitude,
    longitude: data.longitude,
    locationLabel: data.locationLabel,
    status: "pending",
    contactEmail: data.contactEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
