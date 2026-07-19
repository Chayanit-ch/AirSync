import { useCallback, useEffect, useState } from "react";
import type { GeoPoint } from "../types";

export type UserLocationStatus =
  | "locating"
  | "granted"
  | "denied"
  | "unsupported";

interface UseUserLocationResult {
  coords: GeoPoint | null;
  status: UserLocationStatus;
  /** Re-requests the browser's geolocation permission — wired to a visible
   * "retry" control so a denied/unsupported user is never permanently stuck. */
  retry: () => void;
}

const GEOLOCATION_TIMEOUT_MS = 10000;

/**
 * Wraps `navigator.geolocation.getCurrentPosition` behind one shared hook so
 * the Home hero card and the Map page ask for (and agree on) the same
 * permission state, instead of each independently prompting the user.
 */
export function useUserLocation(): UseUserLocationResult {
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [status, setStatus] = useState<UserLocationStatus>("locating");

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus("granted");
      },
      () => {
        setCoords(null);
        setStatus("denied");
      },
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { coords, status, retry: request };
}
