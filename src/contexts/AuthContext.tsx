import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { ensureUserDocument, unfollowArea } from "../services/userProfile";
import type { UserProfile } from "../types";

/** Pre-nationwide-rollout `followedAreaIds` used slugs like "area-mueang" instead of real Air4Thai stationIDs. */
const LEGACY_AREA_ID_PREFIX = "area-";

interface AuthContextValue {
  currentUser: User | null;
  /** Live Firestore `users/{uid}` document — account settings, never per-day/week statistics. */
  userProfile: UserProfile | null;
  /**
   * True until BOTH: Firebase Auth has resolved, AND — if logged in — the
   * `users/{uid}` document has been created (if it was missing) and its
   * first snapshot has arrived. Anything that writes to the user's document,
   * or renders a control that edits it (notification toggles, follow/unfollow
   * area buttons), must stay disabled while this is true. Otherwise a fast
   * "new device" write could land before a slower "load existing data" read
   * finishes, clobbering the user's real settings with defaults.
   */
  loading: boolean;
  /**
   * Set when `ensureUserDocument` throws during sign-in (e.g. the network
   * drops at exactly the wrong moment) — previously this was just a
   * `console.error` that nobody saw, leaving the user signed in with no
   * `users/{uid}` document, silently breaking follow-area/notifications
   * later with no visible cause. Whatever renders the app shell should show
   * a banner while this is set, with a retry wired to `retryProfileCreation`.
   */
  profileCreationError: Error | null;
  /** Re-attempts `ensureUserDocument` for the current user; clears `profileCreationError` on success. */
  retryProfileCreation: () => void;
  /**
   * Set to true by a page while it's performing an intentional logout, so
   * ProtectedRoute can skip its own redirect-to-/login and let that page's
   * own navigation (e.g. to Home) win instead of racing it.
   */
  isLoggingOutRef: MutableRefObject<boolean>;
  /**
   * Forces consumers to re-render off the current `auth.currentUser`. Firebase
   * mutates that object in place (e.g. updateProfile), which doesn't always
   * trigger onAuthStateChanged — call this after such an update so the UI
   * picks up the change.
   */
  refreshCurrentUser: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const [profileCreationError, setProfileCreationError] = useState<Error | null>(null);
  const isLoggingOutRef = useRef(false);
  const [, bumpRefreshTick] = useReducer((tick: number) => tick + 1, 0);

  const refreshCurrentUser = useCallback(() => {
    bumpRefreshTick();
  }, []);

  const attemptEnsureUserDocument = useCallback(async (user: User) => {
    try {
      await ensureUserDocument(user);
      setProfileCreationError(null);
    } catch (error) {
      console.error("Failed to create user document", error);
      setProfileCreationError(error instanceof Error ? error : new Error(String(error)));
    }
  }, []);

  const retryProfileCreation = useCallback(() => {
    if (!auth.currentUser) return;
    void attemptEnsureUserDocument(auth.currentUser);
  }, [attemptEnsureUserDocument]);

  // Track Firebase Auth state and ensure the users/{uid} document exists.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setUserProfile(null);
        setProfileCreationError(null);
        setProfileResolved(true); // nothing to load while logged out
        setAuthResolved(true);
        return;
      }

      await attemptEnsureUserDocument(user);
      // profileResolved flips once the onSnapshot listener below delivers
      // its first snapshot for this uid — not here, so a slow subscription
      // can't be mistaken for "data loaded".
      setAuthResolved(true);
    });

    return unsubscribe;
  }, [attemptEnsureUserDocument]);

  // Live-subscribe to the user's own document once authenticated, so any
  // write (from this device or another) is reflected everywhere immediately
  // without ever needing a manual refetch-and-overwrite.
  useEffect(() => {
    if (!currentUser) return;

    setProfileResolved(false);
    const unsubscribe = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snapshot) => {
        setUserProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
        setProfileResolved(true);
      },
      (error) => {
        console.error("Failed to subscribe to user document", error);
        setProfileResolved(true);
      },
    );

    return unsubscribe;
  }, [currentUser]);

  // Self-heal pre-rollout test data: since real user data collection hadn't
  // started when the nationwide rollout shipped, any leftover legacy
  // "area-*" slugs in followedAreaIds are just dropped here via the same
  // arrayRemove-based unfollowArea everything else uses — no migration
  // script, no full-document overwrite. Idempotent (removing an
  // already-removed id from the array is a harmless no-op), so this can't
  // loop even though it re-runs every time `userProfile` updates.
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    const legacyIds = userProfile.followedAreaIds?.filter((id) =>
      id.startsWith(LEGACY_AREA_ID_PREFIX),
    );
    if (!legacyIds || legacyIds.length === 0) return;

    console.warn(
      "Removing legacy (pre-nationwide-rollout) followedAreaIds from test account:",
      legacyIds,
    );
    for (const legacyId of legacyIds) {
      void unfollowArea(currentUser.uid, legacyId);
    }
  }, [currentUser, userProfile]);

  const loading = !authResolved || !profileResolved;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        profileCreationError,
        retryProfileCreation,
        isLoggingOutRef,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
