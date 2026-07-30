import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import type { OrganizationDirectoryEntry, OrganizationRating, OrganizationRatingSummary } from "../types";

/** Middle of the spec's 5-10 minute cache window. */
const SUMMARY_CACHE_TTL_MS = 7 * 60 * 1000;

interface CacheEntry {
  summary: OrganizationRatingSummary;
  fetchedAtMs: number;
}

// Module-level = simple in-memory cache, same pattern as api/news.ts's
// in-memory RSS cache — resets on page reload, which is fine here since
// there's no persistence requirement, only "don't hammer Firestore".
const summaryCache = new Map<string, CacheEntry>();
const inFlightSummaryFetches = new Map<string, Promise<OrganizationRatingSummary>>();

function ratingDocRef(orgUid: string, raterUid: string) {
  return doc(db, "users", orgUid, "ratings", raterUid);
}

/**
 * Submits (or overwrites) the current user's rating of an organization.
 * Document ID is the rater's own uid, so this always updates the same doc
 * rather than creating a new one on a repeat rating — `createdAt` is
 * preserved across overwrites via a transaction read.
 */
export async function submitRating(orgUid: string, rating: number): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("You must be signed in to rate an organization");
  if (orgUid === currentUser.uid) throw new Error("You cannot rate your own organization account");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be a whole number between 1 and 5");
  }

  const ref = ratingDocRef(orgUid, currentUser.uid);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    const createdAt = existing.exists() ? (existing.data() as OrganizationRating).createdAt : serverTimestamp();
    transaction.set(ref, {
      rating,
      raterUid: currentUser.uid,
      createdAt,
      updatedAt: serverTimestamp(),
    });
  });

  summaryCache.delete(orgUid);
}

/**
 * Average + count of an organization's ratings, aggregated client-side over
 * the `ratings` subcollection (there is no server-maintained aggregate field
 * — see the plan's security rationale for why one was never added). Cached
 * per `orgUid` for `SUMMARY_CACHE_TTL_MS` so a busy leaderboard/profile page
 * doesn't re-query Firestore on every render; `forceRefresh` bypasses the
 * cache (used right after a successful `submitRating`).
 */
export async function getOrganizationRatingSummary(
  orgUid: string,
  forceRefresh = false,
): Promise<OrganizationRatingSummary> {
  const cached = summaryCache.get(orgUid);
  if (!forceRefresh && cached && Date.now() - cached.fetchedAtMs < SUMMARY_CACHE_TTL_MS) {
    return cached.summary;
  }

  const inFlight = inFlightSummaryFetches.get(orgUid);
  if (!forceRefresh && inFlight) return inFlight;

  const fetchPromise = (async () => {
    const snapshot = await getDocs(collection(db, "users", orgUid, "ratings"));
    const ratings = snapshot.docs.map((d) => (d.data() as OrganizationRating).rating);
    const summary: OrganizationRatingSummary =
      ratings.length === 0
        ? { average: 0, count: 0 }
        : { average: ratings.reduce((sum, r) => sum + r, 0) / ratings.length, count: ratings.length };
    summaryCache.set(orgUid, { summary, fetchedAtMs: Date.now() });
    return summary;
  })().finally(() => {
    inFlightSummaryFetches.delete(orgUid);
  });

  inFlightSummaryFetches.set(orgUid, fetchPromise);
  return fetchPromise;
}

/**
 * The current user's own rating of an organization, or `null` if they
 * haven't rated it yet (or aren't signed in) — a normal state, not an error.
 * Used to pre-fill the rating picker when reopening the rating modal.
 */
export async function getMyRatingFor(orgUid: string): Promise<number | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const snapshot = await getDoc(ratingDocRef(orgUid, currentUser.uid));
  if (!snapshot.exists()) return null;
  return (snapshot.data() as OrganizationRating).rating;
}

/**
 * Every organization AND (approved) government entry in the public
 * directory (`organizationProfiles`) — see `services/organizationDirectory.ts`
 * for how entries get there, and `isEligibleForDirectory` for why every
 * document in this collection is already eligible by construction (no
 * further `where("userType", "in", [...])` filter is needed here). Callers
 * that need just one role (e.g. the leaderboard's filter toggle) filter the
 * returned array client-side by `.userType`.
 */
export async function listOrganizations(): Promise<OrganizationDirectoryEntry[]> {
  const snapshot = await getDocs(collection(db, "organizationProfiles"));
  // `uid` is the document ID, not a stored field (see syncOrganizationDirectoryEntry) — must be attached here.
  return snapshot.docs.map((d) => ({ ...(d.data() as OrganizationDirectoryEntry), uid: d.id }));
}
