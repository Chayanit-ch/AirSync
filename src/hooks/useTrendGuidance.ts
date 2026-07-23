import { useCallback, useEffect, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { getAreaAirQualityHistory } from "../services/airQuality";

/** Middle of the spec's 1-2h cache window. */
const CACHE_TTL_MS = 90 * 60 * 1000;
/** Upper end of the spec's "24-48 hours of historical data" window. */
const HISTORY_WINDOW_MS = 48 * 60 * 60 * 1000;

interface CachedTrend {
  guidance: string;
  generatedAt?: Timestamp;
  language: string;
}

interface UseTrendGuidanceResult {
  guidance: string | null;
  isLoading: boolean;
  error: boolean;
  /** Checks the shared `stationTrendGuidance/{stationId}` cache first; only calls DeepSeek on a miss/stale/language-mismatch. Never called automatically — only on explicit user action (button click). */
  fetchOrGenerate: () => Promise<void>;
}

/**
 * `stationTrendGuidance` is shared across every user (public air-quality
 * data, not personal) — the cache doc is keyed by `stationId` alone, so the
 * first person to click after expiry pays the DeepSeek call and everyone
 * else within the window reads Firestore only.
 */
export function useTrendGuidance(
  stationId: string,
  stationName: string,
  language: "th" | "en",
): UseTrendGuidanceResult {
  const [guidance, setGuidance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const inFlightRef = useRef(false);

  // A freshly-selected station must never show the previous station's
  // guidance text while the new one hasn't been requested yet.
  useEffect(() => {
    setGuidance(null);
    setError(false);
  }, [stationId]);

  const fetchOrGenerate = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError(false);
    try {
      const cacheRef = doc(db, "stationTrendGuidance", stationId);
      const snap = await getDoc(cacheRef);
      if (snap.exists()) {
        const cached = snap.data() as CachedTrend;
        const generatedAtMs = cached.generatedAt?.toMillis() ?? 0;
        const isFresh = Date.now() - generatedAtMs < CACHE_TTL_MS;
        if (isFresh && cached.language === language) {
          setGuidance(cached.guidance);
          return; // cache hit — no DeepSeek call
        }
      }

      // Cache miss/stale/language-mismatch — pull recent history (reusing
      // the same merged real+synthetic source every other historical-data
      // view in this app already uses, including its own console.warn when
      // real data isn't available yet for this station) and call DeepSeek.
      const records = await getAreaAirQualityHistory([stationId]);
      const cutoff = Date.now() - HISTORY_WINDOW_MS;
      const recentHistory = records
        .filter((r) => new Date(r.timestamp).getTime() >= cutoff)
        .map((r) => ({ timestamp: r.timestamp, pm25: r.pm25, aqi: r.aqi }));

      if (recentHistory.length === 0) {
        throw new Error(`No recent history available for station ${stationId}`);
      }

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("No signed-in user available for AI trend guidance request");

      const response = await fetch("/api/deepseek-trend", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ stationId, stationName, history: recentHistory, language }),
      });
      const data = (await response.json()) as { ok: boolean; guidance?: string; error?: string };
      if (!data.ok || !data.guidance) {
        throw new Error(data.error ?? `AI trend guidance request failed with HTTP ${response.status}`);
      }

      setGuidance(data.guidance);
      await setDoc(cacheRef, {
        guidance: data.guidance,
        generatedAt: serverTimestamp(),
        language,
      });
    } catch (err) {
      // No silent fallback: log exactly why, surface `error` so the caller
      // can simply not render the panel rather than show something broken.
      console.warn(`AI trend guidance unavailable for station ${stationId}:`, err);
      setError(true);
      setGuidance(null);
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }, [stationId, stationName, language]);

  return { guidance, isLoading, error, fetchOrGenerate };
}
