import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { subscribeToMyReports } from "../services/reports";
import type { Report } from "../types";

/**
 * Live-subscribes to the current user's own reports — the exact same
 * `subscribeToMyReports` query the Report page uses, shared here so Profile
 * and Report can never show different data for "my reports" the way
 * Home/Profile once disagreed on followed areas.
 */
export function useMyReports(): { reports: Report[]; isLoading: boolean } {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setReports([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToMyReports(
      currentUser.uid,
      (nextReports) => {
        setReports(nextReports);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );

    return unsubscribe;
  }, [currentUser]);

  return { reports, isLoading };
}
