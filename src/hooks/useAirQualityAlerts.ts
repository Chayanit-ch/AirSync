import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "./useTranslation";
import { getLiveAirQuality, resolveStationReading } from "../services/airQuality";
import { isSeverityWorse } from "../utils/aqi";
import type { AQISeverityLevel } from "../types";

/** `api/air4thai.ts` already caches the real upstream fetch for ~12 minutes, so polling this proxy every 5 minutes from here is cheap. */
const POLL_INTERVAL_MS = 5 * 60 * 1000;
/** Spec'd cooldown: the same area can't trigger another alert within this window even if severity keeps changing. */
const COOLDOWN_MS = 30 * 60 * 1000;
/** Tier 2 (optional): set once the user has either granted or dismissed the contextual explanation — never re-prompted after that either way. */
const PERMISSION_EXPLAINED_KEY = "notification-permission-explained";

interface StoredSeverity {
  severity: AQISeverityLevel;
  lastAlertAt: number | null;
}

export interface AirQualityAlert {
  areaId: string;
  areaName: string;
  severity: AQISeverityLevel;
}

function storageKey(stationId: string): string {
  return `last-severity-${stationId}`;
}

function readStored(stationId: string): StoredSeverity | null {
  try {
    const raw = window.localStorage.getItem(storageKey(stationId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredSeverity;
  } catch (error) {
    console.warn(`Failed to read stored AQI severity for station ${stationId}:`, error);
    return null;
  }
}

function writeStored(stationId: string, value: StoredSeverity) {
  try {
    window.localStorage.setItem(storageKey(stationId), JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist AQI severity for station ${stationId}:`, error);
  }
}

/**
 * Self-contained: reads auth/profile itself so `<AirQualityAlertBanner>` can
 * be mounted once globally with no prop-drilling. Runs its own 5-minute poll
 * loop — `useAllStations()` only fetches once on mount, so this can't piggy-
 * back on it without changing behavior for the Map/Home hero card too (see
 * the plan doc for why that was deliberately avoided).
 */
export function useAirQualityAlerts() {
  const { currentUser, userProfile } = useAuth();
  const { t, dict } = useTranslation();
  const [queue, setQueue] = useState<AirQualityAlert[]>([]);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const followedAreaIds = userProfile?.followedAreaIds ?? [];
  const pushEnabled = userProfile?.notificationSettings?.pushEnabled ?? false;
  const enabled = Boolean(currentUser) && pushEnabled && followedAreaIds.length > 0;

  // Tier 2 (optional, additive on top of Tier 1's in-app banner — never a
  // replacement for it). Only ever surfaces the contextual prompt once:
  // not on every mount, not again after a grant/dismiss either way.
  useEffect(() => {
    if (!enabled) return;
    if (typeof Notification === "undefined") return; // unsupported browser — in-app banner still works fine
    if (Notification.permission !== "default") return; // already decided, nothing to ask
    if (window.localStorage.getItem(PERMISSION_EXPLAINED_KEY) === "true") return;
    setShowPermissionPrompt(true);
  }, [enabled]);

  const requestNotificationPermission = useCallback(async () => {
    setShowPermissionPrompt(false);
    window.localStorage.setItem(PERMISSION_EXPLAINED_KEY, "true");
    try {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        console.warn(`Browser notification permission was not granted (result: "${result}") — continuing with in-app alerts only.`);
      }
    } catch (error) {
      console.warn("Notification.requestPermission() failed — continuing with in-app alerts only:", error);
    }
  }, []);

  const dismissPermissionPrompt = useCallback(() => {
    setShowPermissionPrompt(false);
    window.localStorage.setItem(PERMISSION_EXPLAINED_KEY, "true");
  }, []);

  const checkForAlerts = useCallback(async () => {
    try {
      const { stations } = await getLiveAirQuality();
      const now = Date.now();
      const newAlerts: AirQualityAlert[] = [];

      for (const areaId of followedAreaIds) {
        const { station, isLive } = resolveStationReading(areaId, stations);
        // Synthetic/placeholder readings (isLive: false) fluctuate from a
        // seeded wave function, not real conditions — never alert on those.
        if (!isLive) continue;

        const currentSeverity = station.severity;
        const stored = readStored(areaId);

        if (!stored) {
          // Nothing to compare against yet — record a baseline silently,
          // never alert on the very first check (would just be noise).
          writeStored(areaId, { severity: currentSeverity, lastAlertAt: null });
          continue;
        }

        if (isSeverityWorse(currentSeverity, stored.severity)) {
          const withinCooldown =
            stored.lastAlertAt !== null && now - stored.lastAlertAt < COOLDOWN_MS;
          if (withinCooldown) {
            // Still worse, but suppressed by cooldown — keep the severity
            // current so a later check compares against reality, not a
            // stale baseline, while leaving lastAlertAt untouched.
            writeStored(areaId, { severity: currentSeverity, lastAlertAt: stored.lastAlertAt });
          } else {
            newAlerts.push({ areaId, areaName: station.name, severity: currentSeverity });
            writeStored(areaId, { severity: currentSeverity, lastAlertAt: now });
          }
        } else if (currentSeverity !== stored.severity) {
          // Improved or otherwise changed without worsening — update
          // silently, never notify (per spec).
          writeStored(areaId, { severity: currentSeverity, lastAlertAt: stored.lastAlertAt });
        }
      }

      if (newAlerts.length > 0) {
        setQueue((prev) => [...prev, ...newAlerts]);

        // Tier 2 (optional): fire a browser notification alongside the
        // in-app banner, never instead of it — only when permission was
        // already granted (never requests it here; that only ever happens
        // from the explicit contextual prompt above).
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          for (const alert of newAlerts) {
            try {
              new Notification(t("alertBanner.title"), {
                body: `${alert.areaName} · ${dict.common.severity[alert.severity]}`,
              });
            } catch (error) {
              console.warn(`Failed to show browser notification for ${alert.areaId}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Air quality alert check failed:", error);
    }
    // followedAreaIds is a fresh array every render — compare by content,
    // not identity, so this only changes when the actual list of ids does.
    // t/dict are intentionally excluded too: they're stable in practice
    // (only change if the user switches language mid-poll-cycle), and
    // including them would recreate this callback (and thus the polling
    // effect below) far more often than necessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followedAreaIds.join(",")]);

  useEffect(() => {
    if (!enabled) return;
    checkForAlerts();
    const interval = setInterval(checkForAlerts, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, checkForAlerts]);

  const dismiss = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  return {
    currentAlert: queue[0] ?? null,
    dismiss,
    showPermissionPrompt,
    requestNotificationPermission,
    dismissPermissionPrompt,
  };
}
