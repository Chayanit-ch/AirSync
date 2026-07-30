import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { OrganizationDirectoryEntry, UserType } from "../types";

/** A single organization's public directory entry, or `null` if that uid isn't (or is no longer) an organization. Used to show an organization's identity/badge wherever a uid is known but the entity behind it might not be an org (e.g. report status history). */
export async function getOrganizationDirectoryEntry(
  uid: string,
): Promise<OrganizationDirectoryEntry | null> {
  const snapshot = await getDoc(doc(db, "organizationProfiles", uid));
  if (!snapshot.exists()) return null;
  // `uid` is the document ID, not a stored field (see syncOrganizationDirectoryEntry below).
  return { ...(snapshot.data() as OrganizationDirectoryEntry), uid };
}

interface DirectoryFields {
  displayName: string;
  photoURL: string;
  points: number;
  userType: UserType;
  /** Only relevant when `userType === "government"` — an unapproved government account is treated the same as a non-eligible `userType` (deleted/never upserted), so unverified accounts can't collect public ratings. */
  governmentVerificationStatus?: "pending" | "approved";
}

function isEligibleForDirectory(fields: DirectoryFields): boolean {
  if (fields.userType === "organization") return true;
  if (fields.userType === "government") return fields.governmentVerificationStatus === "approved";
  return false;
}

/**
 * Keeps `organizationProfiles/{uid}` — a public, non-sensitive mirror of an
 * organization/government identity (see `OrganizationDirectoryEntry`) — in
 * sync with `users/{uid}`. Only ever called by the account owner's own
 * client (the only one with the data to call it with), matching this
 * collection's owner-write Firestore rules. Best-effort: a sync failure must
 * never block the caller's primary action (signup, profile edit, viewing
 * your own profile), so this only ever logs and swallows errors.
 *
 * Upserts the directory entry while eligible — `userType === "organization"`,
 * or `userType === "government"` with `governmentVerificationStatus ===
 * "approved"` (see `isEligibleForDirectory`) — deletes it otherwise, so
 * switching away from an eligible role/status drops the entry off the public
 * leaderboard instead of leaving a stale one behind.
 */
export async function syncOrganizationDirectoryEntry(
  uid: string,
  fields: DirectoryFields,
): Promise<void> {
  try {
    const ref = doc(db, "organizationProfiles", uid);
    if (!isEligibleForDirectory(fields)) {
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) await deleteDoc(ref);
      return;
    }

    await setDoc(ref, {
      displayName: fields.displayName,
      photoURL: fields.photoURL,
      points: fields.points,
      userType: fields.userType,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Failed to sync organization directory entry for uid ${uid}`, error);
  }
}
