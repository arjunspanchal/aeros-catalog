// Server-side Supabase Storage helpers. No SDK — direct fetch.
// Used by attachment uploads (Customer PO PDFs, user photos, Aadhar, LR files,
// clearance photos, catalog images).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function ensureConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase Storage not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)");
  }
}

const auth = () => ({ Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` });

function base64ToBytes(b64) {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

const encodePath = (p) => encodeURI(p).replace(/%2F/g, "/");

/**
 * Upload an object to a bucket. Idempotent (x-upsert: true).
 * Pass either fileBase64 (preferred from API routes) or raw bytes.
 */
export async function uploadToBucket({ bucket, path, contentType, fileBase64, bytes }) {
  ensureConfig();
  const body = bytes || (fileBase64 ? base64ToBytes(fileBase64) : null);
  if (!body) throw new Error("uploadToBucket: missing fileBase64 or bytes");
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodePath(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...auth(), "Content-Type": contentType || "application/octet-stream", "x-upsert": "true" },
    body,
  });
  if (!res.ok) throw new Error(`Storage upload ${bucket}/${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return { path, size: body.byteLength };
}

export async function deleteFromBucket(bucket, path) {
  ensureConfig();
  if (!path) return;
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodePath(path)}`;
  const res = await fetch(url, { method: "DELETE", headers: auth() });
  if (!res.ok && res.status !== 404 && res.status !== 400) {
    throw new Error(`Storage delete ${bucket}/${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

export async function signStorageUrl(bucket, path, expiresIn = 3600) {
  ensureConfig();
  if (!path) return null;
  const url = `${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${encodePath(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) throw new Error(`Storage sign ${bucket}/${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const rel = json.signedURL || json.signedUrl;
  if (!rel) return null;
  return `${SUPABASE_URL}/storage/v1${rel.startsWith("/") ? rel : `/${rel}`}`;
}

/** Public URL — only meaningful for buckets marked public=true (e.g. clearance-photos). */
export function publicStorageUrl(bucket, path) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodePath(path)}`;
}

export function safeFilename(name) {
  return String(name || "file").replace(/[^A-Za-z0-9._-]/g, "_");
}
