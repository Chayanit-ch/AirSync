import { useCallback, useEffect, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import type { AQISeverityLevel, DailyContext, RiskGroup } from "../types";

/** Middle of the spec's 3-6h refresh window. */
const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000;

interface UseAiAdviceParams {
  uid: string | undefined;
  aqi: number;
  pm25: number;
  severity: AQISeverityLevel;
  riskGroup: RiskGroup;
  dailyContext?: DailyContext;
  healthNotes?: string;
  /** Optional extra context — see the OpenWeather fallback in `services/airQuality.ts`. Omitted from the DeepSeek payload entirely when absent, never sent as `null`/`0`. */
  temperature?: number;
  language: "th" | "en";
}

interface CachedAdvice {
  tldr: string;
  shortTerm: string;
  longTerm: string;
  generatedAt?: Timestamp;
  severity: string;
  language: string;
}

interface AiAdviceState {
  tldr: string | null;
  shortTerm: string | null;
  longTerm: string | null;
  isAiGenerated: boolean;
  isLoading: boolean;
  refresh: () => void;
}

/**
 * The actual quota gate for `api/deepseek-advice`. DeepSeek is called only
 * when the cached `users/{uid}/aiAdvice/current` doc is missing, >4h old,
 * or the AQI severity/language has changed since it was generated — every
 * other Home load just reads Firestore. See the plan doc for the full
 * regeneration-condition rationale.
 */
export function useAiAdvice(params: UseAiAdviceParams): AiAdviceState {
  const { uid, severity, language } = params;
  const [tldr, setTldr] = useState<string | null>(null);
  const [shortTerm, setShortTerm] = useState<string | null>(null);
  const [longTerm, setLongTerm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inFlightRef = useRef(false);

  // `generate` must always read the LATEST context, but keeping every field
  // in its useCallback deps would recreate it (and, via the effect below,
  // risk re-running the cache-check) on every minor aqi/pm25 tick — a ref
  // sidesteps that stale-closure-vs-over-triggering tradeoff entirely.
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  });

  const generate = useCallback(async () => {
    if (!uid || inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    try {
      const { aqi, pm25, severity, riskGroup, dailyContext, healthNotes, temperature, language } =
        paramsRef.current;
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("No signed-in user available for AI advice request");

      const response = await fetch("/api/deepseek-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          aqi,
          pm25,
          severity,
          riskGroup,
          dailyContext,
          healthNotes,
          language,
          // Omitted entirely (not `null`/`0`) when unavailable — see the
          // "no placeholder values" rule on `UseAiAdviceParams.temperature`.
          ...(temperature != null ? { temperature } : {}),
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        tldr?: string;
        shortTerm?: string;
        longTerm?: string;
        error?: string;
      };
      if (!data.ok || !data.tldr || !data.shortTerm || !data.longTerm) {
        throw new Error(data.error ?? `AI advice request failed with HTTP ${response.status}`);
      }

      setTldr(data.tldr);
      setShortTerm(data.shortTerm);
      setLongTerm(data.longTerm);

      // Same DeepSeek response, no extra API call — `tldr` is just another
      // field on the existing cache doc (see the module doc comment).
      await setDoc(doc(db, "users", uid, "aiAdvice", "current"), {
        tldr: data.tldr,
        shortTerm: data.shortTerm,
        longTerm: data.longTerm,
        generatedAt: serverTimestamp(),
        severity,
        language,
      });
    } catch (error) {
      // No silent fallback: log exactly why, then let the caller's
      // rule-based recommendation take over (tldr/shortTerm/longTerm stay null).
      console.warn("AI advice generation failed, falling back to rule-based recommendation:", error);
      setTldr(null);
      setShortTerm(null);
      setLongTerm(null);
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    async function checkAndMaybeGenerate() {
      try {
        const snap = await getDoc(doc(db, "users", uid!, "aiAdvice", "current"));
        if (cancelled) return;

        if (!snap.exists()) {
          await generate();
          return;
        }

        const cached = snap.data() as CachedAdvice;
        const generatedAtMs = cached.generatedAt?.toMillis() ?? 0;
        const isStale = Date.now() - generatedAtMs > REFRESH_INTERVAL_MS;
        const severityChanged = cached.severity !== severity;
        const languageChanged = cached.language !== language;
        // Docs cached before the `tldr` field was added — regenerate once so
        // every cached doc ends up with all three fields, same as a fresh one.
        const missingTldr = !cached.tldr;

        // Show the (possibly stale) cached copy immediately — regeneration
        // happens in the background, never as a blank/loading state.
        setTldr(cached.tldr ?? null);
        setShortTerm(cached.shortTerm);
        setLongTerm(cached.longTerm);

        if (isStale || severityChanged || languageChanged || missingTldr) {
          await generate();
        }
      } catch (error) {
        console.warn(
          "Failed to read cached AI advice, falling back to rule-based recommendation:",
          error,
        );
      }
    }

    checkAndMaybeGenerate();
    return () => {
      cancelled = true;
    };
    // Deliberately re-checks only on uid/severity/language change, not on
    // every minor aqi/pm25 tick — a fluctuating AQI number within the same
    // severity band must never itself trigger a DeepSeek call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, severity, language, generate]);

  return {
    tldr,
    shortTerm,
    longTerm,
    isAiGenerated: tldr !== null && shortTerm !== null && longTerm !== null,
    isLoading,
    refresh: generate,
  };
}
