import type { User } from "firebase/auth";
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentReference,
  type FieldValue,
} from "firebase/firestore";
import { db } from "../firebase";
import type { NotificationSettings, RiskGroup, UserProfile } from "../types";

/**
 * SAFE-WRITE RULES for `users/{uid}` (read this before adding a new function
 * here):
 *
 * 1. `setDoc()` on the whole document is only ever allowed in
 *    `ensureUserDocument`, and only after a `getDoc()` confirms the document
 *    doesn't exist yet. Every other write below uses `updateDoc()` with
 *    dot-notation for single fields, or `arrayUnion`/`arrayRemove` for
 *    `followedAreaIds`.
 * 2. Never `getDoc()` the whole document, mutate a local copy, and write it
 *    back — that's exactly the read-then-overwrite race this file exists to
 *    prevent (a second device's slow initial load can clobber data written
 *    by a first device in between).
 */

type NewUserDocument = Omit<UserProfile, "createdAt" | "updatedAt"> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

function userDocRef(uid: string): DocumentReference {
  return doc(db, "users", uid);
}

/**
 * Builds the default `users/{uid}` document shape for a Firebase Auth user.
 * `displayNameOverride` lets callers (e.g. right after `updateProfile`) pass
 * a definitively-correct name instead of relying on `user.displayName`, which
 * may not have propagated to the live `auth.currentUser` object yet if this
 * runs concurrently with that update.
 */
function buildDefaultUserDocument(
  user: User,
  displayNameOverride?: string,
): NewUserDocument {
  return {
    uid: user.uid,
    displayName: displayNameOverride ?? user.displayName ?? "",
    email: user.email ?? "",
    photoURL: user.photoURL ?? "",
    role: "citizen",
    guardianLevel: 1,
    followedAreaIds: [],
    notificationSettings: {
      pushEnabled: false,
      dailySummaryEnabled: false,
    },
    hasCompletedOnboarding: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Creates the `users/{uid}` Firestore document on a user's first sign-in.
 * Checks existence first and is a strict no-op if the document is already
 * there — this is the ONLY place in the app allowed to `setDoc()` the whole
 * document, and only because at this point there is nothing to lose yet.
 */
export async function ensureUserDocument(user: User): Promise<void> {
  const ref = userDocRef(user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;

  // Re-read auth.currentUser live (not a possibly-stale callback reference)
  // to give an in-flight updateProfile() call from signUpWithEmail its best
  // chance of having already landed by the time we build the default doc.
  await setDoc(ref, buildDefaultUserDocument(user));
}

/**
 * Reconciles the display name after signup's `updateProfile()` call, in case
 * `ensureUserDocument` already created the document with a stale/fallback
 * name. Always a single-field `updateDoc()`, never a full-document write. If
 * the document doesn't exist yet (rare ordering case), this simply fails and
 * is ignored — `ensureUserDocument` will pick up the correct name shortly
 * after, since `auth.currentUser` will have been updated by then.
 */
export async function reconcileDisplayNameAfterSignup(
  uid: string,
  displayName: string,
): Promise<void> {
  try {
    await updateDoc(userDocRef(uid), {
      displayName,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Document not created yet — ensureUserDocument will use the correct
    // (already-updated) auth user, so there's nothing to reconcile here.
  }
}

/** Updates one or more notification settings fields without touching anything else. */
export async function updateNotificationSettings(
  uid: string,
  settings: Partial<NotificationSettings>,
): Promise<void> {
  const fields: Record<string, boolean | FieldValue> = {
    updatedAt: serverTimestamp(),
  };
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) fields[`notificationSettings.${key}`] = value;
  }
  await updateDoc(userDocRef(uid), fields);
}

/** Updates only the `riskGroup` field, used by the Profile settings selector to personalize Home's recommendation card. */
export async function updateRiskGroup(uid: string, riskGroup: RiskGroup): Promise<void> {
  await updateDoc(userDocRef(uid), {
    riskGroup,
    updatedAt: serverTimestamp(),
  });
}

/** Marks the first-run guided tour as done (completed or skipped) so it never auto-starts again — the "How to Use" replay button re-shows it without touching this field. */
export async function completeOnboarding(uid: string): Promise<void> {
  await updateDoc(userDocRef(uid), {
    hasCompletedOnboarding: true,
    updatedAt: serverTimestamp(),
  });
}

/** Adds a single area to followedAreaIds via arrayUnion — never rewrites the whole array. */
export async function followArea(uid: string, areaId: string): Promise<void> {
  await updateDoc(userDocRef(uid), {
    followedAreaIds: arrayUnion(areaId),
    updatedAt: serverTimestamp(),
  });
}

/** Removes a single area from followedAreaIds via arrayRemove — never rewrites the whole array. */
export async function unfollowArea(uid: string, areaId: string): Promise<void> {
  await updateDoc(userDocRef(uid), {
    followedAreaIds: arrayRemove(areaId),
    updatedAt: serverTimestamp(),
  });
}
