import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TOUR_STEPS, type TourStep } from "../components/onboarding/tourSteps";
import { useAuth } from "./AuthContext";
import { completeOnboarding } from "../services/userProfile";

interface OnboardingTourContextValue {
  isActive: boolean;
  stepIndex: number;
  steps: TourStep[];
  /** Starts the tour from step 1 — used both by the first-run auto-trigger and the "How to Use" replay button. */
  start: () => void;
  /** Advances to the next step, or finishes the tour if already on the last one. */
  next: () => void;
  /** Ends the tour early — still marks `hasCompletedOnboarding`, per "never trap users" (see Section 2 spec). */
  skip: () => void;
}

const OnboardingTourContext = createContext<OnboardingTourContextValue | undefined>(undefined);

/**
 * Owns the first-run guided tour's state: which step is active, and the
 * auto-start-once-per-account logic. Mounted around the whole app (see
 * `App.tsx`) so `TourOverlay` (rendered once in `PageLayout`) and the "How to
 * Use" replay buttons (`Sidebar`, `MobileNavDrawer`) all share one instance.
 */
export function OnboardingTourProvider({ children }: { children: ReactNode }) {
  const { currentUser, userProfile, loading } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const hasAutoStartedForUidRef = useRef<string | null>(null);

  const start = useCallback(() => {
    setStepIndex(0);
    setIsActive(true);
  }, []);

  const finish = useCallback(() => {
    setIsActive(false);
    setStepIndex(0);
    if (!currentUser) return;
    void completeOnboarding(currentUser.uid).catch((error) => {
      console.warn("Failed to save onboarding completion", error);
    });
  }, [currentUser]);

  const next = useCallback(() => {
    setStepIndex((prev) => {
      if (prev >= TOUR_STEPS.length - 1) {
        finish();
        return prev;
      }
      return prev + 1;
    });
  }, [finish]);

  // Auto-start once per signed-in session, only for accounts that haven't
  // completed (or skipped) the tour yet. Guarded by uid (not a plain
  // boolean) so switching accounts within the same page load re-evaluates
  // correctly instead of being permanently suppressed by the first account's flag.
  useEffect(() => {
    if (loading || !currentUser || !userProfile) return;
    if (hasAutoStartedForUidRef.current === currentUser.uid) return;
    hasAutoStartedForUidRef.current = currentUser.uid;
    if (userProfile.hasCompletedOnboarding !== true) {
      start();
    }
  }, [loading, currentUser, userProfile, start]);

  return (
    <OnboardingTourContext.Provider
      value={{ isActive, stepIndex, steps: TOUR_STEPS, start, next, skip: finish }}
    >
      {children}
    </OnboardingTourContext.Provider>
  );
}

export function useOnboardingTour(): OnboardingTourContextValue {
  const ctx = useContext(OnboardingTourContext);
  if (!ctx) throw new Error("useOnboardingTour must be used within OnboardingTourProvider");
  return ctx;
}
