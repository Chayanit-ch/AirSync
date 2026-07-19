import { auth } from "../firebase";

const SIGNATURE_ENDPOINT = "/api/cloudinary-signature";

interface UploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
}

/**
 * Requests a short-lived signed-upload credential from
 * `api/cloudinary-signature.ts`. Requires a signed-in user — throws if
 * there's no current user or the endpoint rejects the request (expired
 * token, Cloudinary not configured, etc.), so callers always know an upload
 * cannot proceed rather than silently getting a bad signature.
 */
async function getUploadSignature(): Promise<UploadSignature> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Must be signed in to upload images");
  }

  const idToken = await user.getIdToken();
  const response = await fetch(SIGNATURE_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });

  const data = (await response.json().catch(() => null)) as
    | (UploadSignature & { ok: true })
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !data || !data.ok) {
    const message = data && !data.ok ? data.error : undefined;
    throw new Error(message ?? `Failed to get upload signature (HTTP ${response.status})`);
  }

  return data;
}

/**
 * Uploads a single image file directly to Cloudinary using a freshly-issued
 * signature (never an unsigned upload preset — see `api/cloudinary-signature.ts`).
 * Returns the `secure_url` to store in `Report.imageUrls`. Throws on any
 * failure; callers should treat a thrown upload as "don't create the report
 * yet", not as a partial success.
 */
export async function uploadImage(file: File): Promise<string> {
  const { signature, timestamp, apiKey, cloudName } = await getUploadSignature();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = (await response.json().catch(() => null)) as
    | { secure_url?: string; error?: { message?: string } }
    | null;

  if (!response.ok || !data?.secure_url) {
    throw new Error(data?.error?.message ?? `Image upload failed (HTTP ${response.status})`);
  }

  return data.secure_url;
}
