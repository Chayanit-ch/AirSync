// Vercel serverless function — generates personalized short-term/long-term
// air-quality recommendations via DeepSeek. Stateless proxy only: this
// function never touches Firestore — the client reads/writes the
// `users/{uid}/aiAdvice/current` cache doc itself (see `useAiAdvice`), so
// this file has no Admin SDK / service-account dependency, matching every
// other serverless function in this repo.
//
// DEEPSEEK_API_KEY is server-side only (no VITE_ prefix, never sent to the
// client) — exactly like CLOUDINARY_API_SECRET in api/cloudinary-signature.ts.
//
// API verified directly against https://api-docs.deepseek.com/ on 2026-07-23:
//   - POST https://api.deepseek.com/chat/completions
//   - model: "deepseek-v4-flash" (NOT "deepseek-chat"/"deepseek-reasoner" —
//     those are deprecated 2026-07-24)
//   - response_format: {"type": "json_object"} enables JSON mode, but the
//     docs explicitly warn the prompt must also instruct the model to
//     produce JSON or it can generate unbounded whitespace — the system
//     prompt below states the exact JSON shape required.
//   - generated text lives at choices[0].message.content
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-flash";
const FETCH_TIMEOUT_MS = 20000;

// Reused here purely to verify a Firebase ID token via the REST lookup
// endpoint — same approach as api/cloudinary-signature.ts, duplicated
// rather than imported (see api/air4thai.ts's documented note on why
// relative imports crossing out of api/ aren't trusted in this project's
// Vercel build).
const FIREBASE_WEB_API_KEY = process.env.VITE_FIREBASE_API_KEY;
const AUTH_VERIFY_TIMEOUT_MS = 5000;

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

interface DailyContext {
  commuteMethod?: string;
  worksOutdoors?: boolean;
  hasOutdoorPlansToday?: boolean;
  exerciseOutdoors?: boolean;
}

interface AdviceRequestBody {
  aqi: number;
  pm25: number;
  severity: string;
  riskGroup: string;
  dailyContext?: DailyContext;
  /** User-provided free text — sent to DeepSeek because it's needed to personalize advice, never logged or stored by this function. No email/name/uid is ever included in this request body by design. */
  healthNotes?: string;
  language: "th" | "en";
}

function yesNo(value: boolean | undefined, language: "th" | "en"): string {
  if (value === undefined) return language === "th" ? "ไม่ระบุ" : "not specified";
  if (language === "th") return value ? "ใช่" : "ไม่ใช่";
  return value ? "yes" : "no";
}

function buildSystemPrompt(language: "th" | "en"): string {
  const languageName = language === "th" ? "Thai (ภาษาไทย)" : "English";
  return `You are a friendly air-quality health advisor inside AirSync, a Thai air-quality app. Given a user's current air quality conditions and personal context, produce two short recommendation sections.

Rules you must follow exactly:
- Respond entirely in ${languageName}.
- Tone: friendly, encouraging, practical, and easy to read on a mobile screen.
- Each section must be roughly 3-4 sentences — concise, not a long essay.
- Never give specific medical advice: no drug names, no dosages, no diagnoses. You may suggest consulting a healthcare professional if symptoms worsen, and nothing more specific than that.
- Base your advice only on the context given to you. Do not invent facts.
- "shortTerm": practical actions to consider today or this week, based on the current AQI/conditions and the user's personal context.
- "longTerm": sustainable habits and behavioral changes (transportation choices, environmental practices, exposure-reduction habits, energy usage).
- Respond with ONLY a JSON object in exactly this shape, and nothing else before or after it: {"shortTerm": "...", "longTerm": "..."}`;
}

function buildUserPrompt(body: AdviceRequestBody): string {
  const dc = body.dailyContext;
  const lines = [
    `Current air quality: AQI ${body.aqi} (${body.severity}), PM2.5 ${body.pm25} µg/m³.`,
    `Risk group: ${body.riskGroup}.`,
    `Commute method: ${dc?.commuteMethod ?? (body.language === "th" ? "ไม่ระบุ" : "not specified")}.`,
    `Works outdoors: ${yesNo(dc?.worksOutdoors, body.language)}.`,
    `Has outdoor plans today: ${yesNo(dc?.hasOutdoorPlansToday, body.language)}.`,
    `Exercises outdoors: ${yesNo(dc?.exerciseOutdoors, body.language)}.`,
    `User-provided health notes (optional): ${body.healthNotes?.trim() || (body.language === "th" ? "ไม่มี" : "none provided")}.`,
  ];
  return lines.join("\n");
}

function isValidBody(body: unknown): body is AdviceRequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.aqi === "number" &&
    typeof b.pm25 === "number" &&
    typeof b.severity === "string" &&
    typeof b.riskGroup === "string" &&
    (b.language === "th" || b.language === "en")
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
        temperature: 0.7,
        max_tokens: 500,
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

    const parsed = JSON.parse(raw) as { shortTerm?: unknown; longTerm?: unknown };
    if (typeof parsed.shortTerm !== "string" || typeof parsed.longTerm !== "string") {
      throw new Error("DeepSeek response JSON missing shortTerm/longTerm string fields");
    }

    res.status(200).json({ ok: true, shortTerm: parsed.shortTerm, longTerm: parsed.longTerm });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`deepseek-advice failed for uid ${uid}: ${message}`);
    res.status(502).json({ ok: false, error: message });
  } finally {
    clearTimeout(timeoutId);
  }
}
