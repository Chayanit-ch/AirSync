// Vercel serverless function — issues short-lived signed-upload credentials
// for Cloudinary so the client can upload a report photo directly to
// Cloudinary (bypassing this function for the actual file bytes) without
// ever holding `CLOUDINARY_API_SECRET`, which stays server-side only and is
// read nowhere else in this codebase.
//
// SECURITY: signed uploads only, deliberately — an unsigned upload preset
// would let anyone who discovers the Cloud Name (a public value, visible in
// every uploaded image URL) upload arbitrary files and burn the account's
// free quota. Every request here also requires a valid Firebase Auth ID
// token, so only signed-in users of this app can mint a signature at all.
import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
// Reused here purely to verify a Firebase ID token via the REST lookup
// endpoint below — this is Firebase's public Web API key (already shipped
// to every browser as `VITE_FIREBASE_API_KEY`; the `VITE_` prefix only
// controls what Vite bundles into the frontend build, Vercel still exposes
// every env var to serverless functions regardless of prefix). It is not a
// secret — Firebase's own docs describe it as safe to embed client-side,
// with real access control enforced by Firestore/Auth security rules, not
// by hiding this value.
const FIREBASE_WEB_API_KEY = process.env.VITE_FIREBASE_API_KEY;

const AUTH_VERIFY_TIMEOUT_MS = 5000;

interface JsonResponse {
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (name: string, value: string) => void;
}

interface IncomingRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}

function getBearerToken(req: IncomingRequest): string | null {
  const raw = req.headers?.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/**
 * Verifies a Firebase Auth ID token via Identity Toolkit's REST lookup
 * endpoint — no `firebase-admin`/service-account key needed for this one
 * check. Returns the token's `localId` (uid) on success, `null` on any
 * failure (expired, malformed, wrong project, network error) — the caller
 * always treats `null` as "reject the request", never as "let it through".
 */
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

export default async function handler(req: IncomingRequest, res: JsonResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method && req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(503).json({ ok: false, error: "Cloudinary is not configured" });
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

  const timestamp = Math.round(Date.now() / 1000);
  // Only `timestamp` is part of the signed params — the client sends exactly
  // these fields (plus `file`) to Cloudinary, so what's signed here must
  // match what's sent there exactly, or Cloudinary rejects the upload.
  const signature = cloudinary.utils.api_sign_request({ timestamp }, CLOUDINARY_API_SECRET);

  res.status(200).json({
    ok: true,
    signature,
    timestamp,
    apiKey: CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME,
  });
}
