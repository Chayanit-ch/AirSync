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
import { SET_RISK_GROUP_MISSION } from "../data/missions";
import { awardMissionBestEffort } from "./missions";
import { syncOrganizationDirectoryEntry } from "./organizationDirectory";
import type { AvatarConfig, DailyContext, NotificationSettings, RiskGroup, UserProfile, UserType } from "../types";

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
    userType: "citizen",
    followedAreaIds: [],
    notificationSettings: {
      pushEnabled: false,
      dailySummaryEnabled: false,
    },
    hasCompletedOnboarding: false,
    points: 0,
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

/**
 * Re-reads the just-written `users/{uid}` doc (always allowed — the caller
 * is always the owner here) and syncs the public `organizationProfiles/{uid}`
 * mirror from it. Centralizing the read here means every `userType`-changing
 * call site stays a one-argument call, instead of threading displayName/
 * photoURL/points through each of them.
 */
async function syncOrganizationDirectoryFromLatestDoc(uid: string): Promise<void> {
  const snapshot = await getDoc(userDocRef(uid));
  if (!snapshot.exists()) return;
  const profile = snapshot.data() as UserProfile;
  await syncOrganizationDirectoryEntry(uid, {
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    points: profile.points,
    userType: profile.userType ?? "citizen",
  });
}

/**
 * Reconciles `userType` after signup, mirroring `reconcileDisplayNameAfterSignup`:
 * `ensureUserDocument` (fired from `AuthContext`'s `onAuthStateChanged`) can
 * create the document with the default `"citizen"` before the signup call
 * site's chosen value is known, so this fixes it up with a single-field
 * `updateDoc()`. Purely cosmetic — never touches `role`.
 */
export async function reconcileUserTypeAfterSignup(
  uid: string,
  userType: UserType,
): Promise<void> {
  try {
    const fields: Record<string, string | FieldValue> = {
      userType,
      updatedAt: serverTimestamp(),
    };
    // Signup always starts from buildDefaultUserDocument's hardcoded
    // "citizen" default, so choosing "government" here is always a fresh
    // transition — no need to compare against a previous value.
    if (userType === "government") fields.governmentVerificationStatus = "pending";
    await updateDoc(userDocRef(uid), fields);
    await syncOrganizationDirectoryFromLatestDoc(uid);
  } catch {
    // Document not created yet — ensureUserDocument will default to
    // "citizen"; the user can still change it later via profile editing.
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

  // One-time mission, best-effort — the deterministic `missionLog` doc ID
  // (no date suffix, since this mission's `frequency` is "once") means this
  // is a safe no-op on every risk-group change after the first.
  await awardMissionBestEffort(uid, SET_RISK_GROUP_MISSION);
}

/**
 * Updates only the `userType` field — the user's own display identity
 * (citizen/organization/government), editable any time from the Profile
 * page. Purely cosmetic; has no bearing on `role`, which only an
 * administrator can change, and only via the Firestore Console.
 *
 * `previousUserType` is required so this can tell a genuine switch *into*
 * "government" (which should reset `governmentVerificationStatus` to
 * "pending") apart from an unrelated re-save while already "government" —
 * `PersonalInfoCard`'s Save button calls this every time regardless of
 * whether the dropdown actually changed, and blindly re-pending on every
 * save would keep bouncing an already-approved account back to pending.
 */
export async function updateUserType(
  uid: string,
  userType: UserType,
  previousUserType: UserType,
): Promise<void> {
  const fields: Record<string, string | FieldValue> = {
    userType,
    updatedAt: serverTimestamp(),
  };
  if (userType === "government" && previousUserType !== "government") {
    fields.governmentVerificationStatus = "pending";
  }
  await updateDoc(userDocRef(uid), fields);
  await syncOrganizationDirectoryFromLatestDoc(uid);
}

/** Updates one or more `dailyContext` fields without touching anything else or the sibling fields. */
export async function updateDailyContext(
  uid: string,
  context: Partial<DailyContext>,
): Promise<void> {
  const fields: Record<string, boolean | string | FieldValue> = {
    updatedAt: serverTimestamp(),
  };
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) fields[`dailyContext.${key}`] = value;
  }
  await updateDoc(userDocRef(uid), fields);
}

/**
 * Updates only `healthNotes`. This field must never be read by any code path other than the
 * account owner's own Profile page — see the privacy note on `UserProfile.healthNotes`.
 */
export async function updateHealthNotes(uid: string, healthNotes: string): Promise<void> {
  await updateDoc(userDocRef(uid), {
    healthNotes,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Overwrites the whole `avatarConfig` field with the user's latest
 * character-customization choices. Writing the whole object in one go (not
 * dot-notation per sub-field) is safe here — `avatarConfig` is a single
 * Firestore field, so this never touches any sibling field on the document,
 * and it's always the account owner writing their own draft in one
 * deliberate Save action (see `CharacterCustomizationModal`), never a
 * read-modify-write race between devices the way `followedAreaIds` is.
 */
export async function updateUserAvatarConfig(uid: string, avatarConfig: AvatarConfig): Promise<void> {
  await updateDoc(userDocRef(uid), {
    avatarConfig,
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
