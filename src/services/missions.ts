import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Mission } from "../types";

/**
 * Thailand-local calendar date, independent of the device's own timezone —
 * two users on different clocks completing the same real-world Bangkok day
 * should share the same `dateKey`.
 */
export function getBangkokDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(date);
}

function missionLogEntryId(mission: Mission, dateKey: string): string {
  return mission.frequency === "once" ? mission.id : `${mission.id}_${dateKey}`;
}

export type AwardResult = "awarded" | "already_completed";

/**
 * Atomically checks-and-awards a mission: the existence check on the
 * deterministic `missionLog` doc and the `points` increment happen inside one
 * Firestore transaction, so rapid double-clicks or two open tabs can never
 * double-award the same mission on the same day (the second transaction
 * retries, sees the log entry now exists, and no-ops). This is the only
 * write path for `points` — always `increment()`, never a client-computed
 * total.
 */
export async function awardMission(uid: string, mission: Mission): Promise<AwardResult> {
  const dateKey = getBangkokDateKey();
  const entryId = missionLogEntryId(mission, dateKey);
  const logRef = doc(db, "users", uid, "missionLog", entryId);
  const userRef = doc(db, "users", uid);

  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(logRef);
    if (existing.exists()) return "already_completed";

    transaction.set(logRef, {
      missionId: mission.id,
      pointsEarned: mission.points,
      completedAt: serverTimestamp(),
      dateKey,
    });
    transaction.update(userRef, {
      points: increment(mission.points),
      updatedAt: serverTimestamp(),
    });
    return "awarded";
  });
}

/**
 * Best-effort mission award for hooks that live inside another action's
 * success path (report submission, risk-group save) — a mission-award
 * failure must never surface as an error for the primary action.
 */
export async function awardMissionBestEffort(uid: string, mission: Mission): Promise<void> {
  try {
    await awardMission(uid, mission);
  } catch (error) {
    console.error(`Failed to award mission "${mission.id}"`, error);
  }
}

/**
 * Reactively reports which mission ids have a `missionLog` entry dated
 * `dateKey` (normally today) — drives the "already completed today"
 * checkbox state for daily missions. One-time missions (currently just
 * "set-risk-group") are validated from their own profile field instead, per
 * spec, not from this query — see `MissionsCard`.
 */
export function subscribeTodaysMissionLog(
  uid: string,
  dateKey: string,
  callback: (completedMissionIds: Set<string>) => void,
): () => void {
  const missionLogQuery = query(
    collection(db, "users", uid, "missionLog"),
    where("dateKey", "==", dateKey),
  );
  return onSnapshot(missionLogQuery, (snapshot) => {
    const ids = new Set(snapshot.docs.map((d) => d.data().missionId as string));
    callback(ids);
  });
}
