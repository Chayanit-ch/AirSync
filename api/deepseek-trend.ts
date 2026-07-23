// Vercel serverless function — generates a qualitative "AI Trend Guidance"
// read of a station's recent air-quality history via DeepSeek. Deliberately
// NOT a forecast: the system prompt below forbids numeric predictions and
// the word "forecast"/"predict" outright — see the plan doc's scientific-
// accuracy requirement.
//
// Stateless proxy only, same as api/deepseek-advice.ts: this function never
// touches Firestore. The client checks/writes the shared
// `stationTrendGuidance/{stationId}` cache doc itself (see
// `useTrendGuidance`), so there's no Admin SDK dependency here.
//
// API verified directly against https://api-docs.deepseek.com/ on 2026-07-23
// — same endpoint/model/JSON-mode details as api/deepseek-advice.ts (see
// that file's header comment for the full verification notes).
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-flash";
const FETCH_TIMEOUT_MS = 20000;

const FIREBASE_WEB_API_KEY = process.env.VITE_FIREBASE_API_KEY;
const AUTH_VERIFY_TIMEOUT_MS = 5000;

/** Hard cap regardless of what the client sends — keeps a single request's
 * token cost bounded even if a caller passes an unexpectedly long history. */
const MAX_HISTORY_POINTS = 60;

interface JsonResponse {
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (name: string, value: string) => void;
}

interface IncomingRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

function getBearerToken(req: IncomingRequest): string | null {
  const raw = req.headers?.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  if (!FIREBASE_WEB_API_KEY) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_VERIFY_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { users?: Array<{ localId?: string }> };
    return data.users?.[0]?.localId ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface HistoryPoint {
  timestamp: string;
  pm25: number;
  aqi: number;
}

interface TrendRequestBody {
  stationId: string;
  stationName: string;
  history: HistoryPoint[];
  language: "th" | "en";
}

function buildSystemPrompt(language: "th" | "en"): string {
  const languageName = language === "th" ? "Thai (ภาษาไทย)" : "English";
  return `You are an air-quality trend analyst inside AirSync, a Thai air-quality app. You are given a monitoring station's recent historical PM2.5/AQI readings. Your job is to describe the QUALITATIVE trend only.

Rules you must follow exactly:
- You are NOT a forecasting model. NEVER state a specific numeric AQI or PM2.5 value for any future time, and NEVER use the words "forecast" or "predict" anywhere in your answer — this feature is called "AI Trend Guidance", not a forecast.
- Respond entirely in ${languageName}.
- Base your description only on the pattern in the data given to you — do not invent readings.
- Describe whether conditions have been improving, worsening, stable, or fluctuating, and mention any notable time-of-day pattern (e.g. mornings vs evenings) if the data shows one, in plain qualitative language (e.g. "conditions may become less favorable" rather than any number).
- Keep it concise: about 3-5 sentences, easy to read on a mobile screen.
- Respond with ONLY a JSON object in exactly this shape, and nothing else before or after it: {"guidance": "..."}`;
}

function buildUserPrompt(body: TrendRequestBody): string {
  const points = body.history.slice(0, MAX_HISTORY_POINTS);
  const rows = points
    .map((p) => `${p.timestamp}, PM2.5 ${p.pm25}, AQI ${p.aqi}`)
    .join("\n");
  return `Station: ${body.stationName} (${body.stationId}).\nRecent readings (most recent first):\n${rows}`;
}

function isValidBody(body: unknown): body is TrendRequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (typeof b.stationId !== "string" || typeof b.stationName !== "string") return false;
  if (!(b.language === "th" || b.language === "en")) return false;
  if (!Array.isArray(b.history) || b.history.length === 0) return false;
  return b.history.every(
    (p) =>
      p &&
      typeof p === "object" &&
      typeof (p as Record<string, unknown>).timestamp === "string" &&
      typeof (p as Record<string, unknown>).pm25 === "number" &&
      typeof (p as Record<string, unknown>).aqi === "number",
  );
}

export default async function handler(req: IncomingRequest, res: JsonResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method && req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!DEEPSEEK_API_KEY) {
    res.status(503).json({ ok: false, error: "DeepSeek is not configured" });
    return;
  }

  const idToken = getBearerToken(req);
  if (!idToken) {
    res.status(401).json({ ok: false, error: "Missing Authorization: Bearer <idToken> header" });
    return;
  }
  const uid = await verifyFirebaseIdToken(idToken);
  if (!uid) {
    res.status(401).json({ ok: false, error: "Invalid or expired auth token" });
    return;
  }

  const body = req.body;
  if (!isValidBody(body)) {
    res.status(400).json({ ok: false, error: "Invalid request body" });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const deepseekRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt(body.language) },
          { role: "user", content: buildUserPrompt(body) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 400,
      }),
      signal: controller.signal,
    });

    if (!deepseekRes.ok) {
      const text = await deepseekRes.text().catch(() => "");
      throw new Error(`DeepSeek responded with HTTP ${deepseekRes.status}: ${text.slice(0, 300)}`);
    }

    const data = (await deepseekRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("DeepSeek response missing choices[0].message.content");

    const parsed = JSON.parse(raw) as { guidance?: unknown };
    if (typeof parsed.guidance !== "string") {
      throw new Error("DeepSeek response JSON missing guidance string field");
    }

    res.status(200).json({ ok: true, guidance: parsed.guidance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`deepseek-trend failed for station ${body.stationId}: ${message}`);
    res.status(502).json({ ok: false, error: message });
  } finally {
    clearTimeout(timeoutId);
  }
}
