// Vercel serverless function — analyzes a report's attached photo via
// Gemini and returns a short, neutral description plus basic
// self-protection guidance. Stateless proxy only: this function never
// touches Firestore — the client writes the result back onto
// `reports/{reportId}.aiImageAnalysis` itself (see
// `analyzeReportImageBestEffort` in `services/reports.ts`), matching every
// other serverless function in this repo (no Admin SDK / service-account
// dependency anywhere in live code).
//
// GEMINI_API_KEY is server-side only (no VITE_ prefix, never sent to the
// client) — exactly like DEEPSEEK_API_KEY / CLOUDINARY_API_SECRET.
//
// API verified directly against https://ai.google.dev/gemini-api/docs on
// 2026-07-25 (image-understanding guide, models list, and quickstart pages
// all agree):
//   - POST https://generativelanguage.googleapis.com/v1beta/interactions
//   - auth via the `x-goog-api-key` header, not a query param
//   - model: "gemini-3.6-flash" (current balanced/multimodal model)
//   - request body: { model, input: [{type:"text",text}, {type:"image",uri,mime_type}] }
//     — `uri` accepts an arbitrary external HTTPS URL directly (confirmed
//     explicitly in the docs), so the already-uploaded Cloudinary
//     `secure_url` is passed straight through — no base64/File API step.
//   - response: { status: "completed"|"failed", steps: [...] } — generated
//     text lives in the LAST step where `type === "model_output"`, at
//     `content[0].text` (there may be a preceding "thought" step, so this
//     is found by scanning, never assumed to be a fixed index).
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GEMINI_MODEL = "gemini-3.6-flash";
const FETCH_TIMEOUT_MS = 25000;

// Reused here purely to verify a Firebase ID token via the REST lookup
// endpoint — same approach as api/deepseek-advice.ts, duplicated rather
// than imported (relative imports crossing out of api/ aren't trusted in
// this project's Vercel build — see api/air4thai.ts's note).
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

interface VisionRequestBody {
  imageUrl: string;
  description: string;
  reportType: string;
  customTypeDescription?: string;
  language: "th" | "en";
}

function isValidBody(body: unknown): body is VisionRequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.imageUrl === "string" &&
    b.imageUrl.startsWith("https://") &&
    typeof b.description === "string" &&
    typeof b.reportType === "string" &&
    (b.customTypeDescription === undefined || typeof b.customTypeDescription === "string") &&
    (b.language === "th" || b.language === "en")
  );
}

function buildSystemPrompt(language: "th" | "en"): string {
  const languageName = language === "th" ? "Thai (ภาษาไทย)" : "English";
  return `You are an assistant inside AirSync, a Thai pollution-incident-reporting app. A citizen has attached a photo to a pollution report. Your job has exactly two parts:
1. Neutrally describe what is visibly relevant to the reported incident in the photo (e.g. "Thick black smoke rising from a chimney").
2. Give brief, practical self-protection guidance for people currently nearby (e.g. close windows, avoid the area, wear a mask).

Rules you must follow exactly:
- You are NOT an inspector, investigator, or legal authority, and this is NOT a legal or official finding. NEVER state or imply that any law, regulation, or rule was broken. NEVER name, identify, or blame any specific person, business, or organization for wrongdoing. Determining legality or liability is exclusively the job of human inspecting officials — never yours, under any circumstance.
- Describe only what is visibly evident in the image and the report's own text — never invent or speculate about causes, sources, or details not actually shown.
- Respond entirely in ${languageName}.
- Keep the entire response short — about 3-4 sentences total, comfortable to read on a mobile screen.
- Respond as plain prose text only. No markdown, no JSON, no headers, nothing before or after the sentences themselves.`;
}

function buildUserPrompt(body: VisionRequestBody): string {
  const typeLabel =
    body.reportType === "other" && body.customTypeDescription?.trim()
      ? body.customTypeDescription.trim()
      : body.reportType;
  const lines = [
    `Reported incident type: ${typeLabel}.`,
    `Citizen's own description: ${body.description.trim() || "(none provided)"}.`,
    "Analyze the attached photo per your instructions.",
  ];
  return lines.join("\n");
}

/** Cloudinary URLs don't reliably carry a real file extension (transformations can strip/rewrite it) — this is a best-effort hint, defaulting to the most common case rather than failing the request over it. */
function inferMimeType(url: string): string {
  const match = /\.(jpe?g|png|webp|heic|heif)(?:[?#]|$)/i.exec(url);
  const ext = match?.[1]?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return `image/${ext}`;
  return "image/jpeg";
}

function extractText(data: { status?: string; steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }): string | null {
  if (data.status !== "completed") return null;
  const steps = data.steps ?? [];
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i]?.type === "model_output") {
      const textBlock = steps[i]?.content?.find((c) => c.type === "text" && c.text?.trim());
      if (textBlock?.text) return textBlock.text.trim();
    }
  }
  return null;
}

export default async function handler(req: IncomingRequest, res: JsonResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method && req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!GEMINI_API_KEY) {
    res.status(503).json({ ok: false, error: "Gemini is not configured" });
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
    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input: [
          { type: "text", text: `${buildSystemPrompt(body.language)}\n\n${buildUserPrompt(body)}` },
          { type: "image", uri: body.imageUrl, mime_type: inferMimeType(body.imageUrl) },
        ],
      }),
      signal: controller.signal,
    });

    if (!geminiRes.ok) {
      const text = await geminiRes.text().catch(() => "");
      throw new Error(`Gemini responded with HTTP ${geminiRes.status}: ${text.slice(0, 300)}`);
    }

    const data = await geminiRes.json();
    const analysis = extractText(data);
    if (!analysis) {
      console.error(
        `gemini-vision got no usable model_output text for uid ${uid}. Full response: ${JSON.stringify(data).slice(0, 500)}`,
      );
      throw new Error("Gemini response missing a completed model_output text block");
    }

    res.status(200).json({ ok: true, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`gemini-vision failed for uid ${uid}: ${message}`);
    res.status(502).json({ ok: false, error: message });
  } finally {
    clearTimeout(timeoutId);
  }
}
