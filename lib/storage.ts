import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "./constants";

// Uploaded receipts/serial photos are PRIVATE (they contain PII) and are only
// served through the authenticated /api/files/[assetId] route.
//
// Two backends, chosen at runtime:
//  - Disk at UPLOAD_DIR (default ./storage/uploads). On Railway, point
//    UPLOAD_DIR at a mounted Volume (e.g. /data/uploads) so files persist
//    across deploys. This is the default path — no external service needed.
//  - Supabase Storage (a private bucket) when SUPABASE_URL + service-role key
//    are set — an alternative for serverless hosts (e.g. Vercel) with no
//    persistent disk. Accessed via its plain HTTP API (no SDK, so no
//    dependency weight or global-type pollution on the server bundle).

const STORAGE_ROOT =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "receipts";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

function useSupabase(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function objectUrl(fileKey: string): string {
  const base = process.env.SUPABASE_URL!.replace(/\/$/, "");
  // Encode each path segment but keep the "/" separators.
  const encoded = fileKey.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/${BUCKET}/${encoded}`;
}

function serviceHeaders(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { Authorization: `Bearer ${key}`, apikey: key };
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    return `Unsupported file type: ${file.type || "unknown"}`;
  if (file.size > MAX_UPLOAD_BYTES) return "File is larger than 10 MB";
  if (file.size === 0) return "File is empty";
  return null;
}

/** Saves an uploaded file under the owner's folder; returns the file key. */
export async function saveUpload(userId: string, file: File): Promise<string> {
  const ext = EXT_BY_MIME[file.type] ?? ".bin";
  const key = `${userId}/${randomUUID()}${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (useSupabase()) {
    const res = await fetch(objectUrl(key), {
      method: "POST",
      headers: {
        ...serviceHeaders(),
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: bytes,
    });
    if (!res.ok) {
      throw new Error(`Storage upload failed (${res.status})`);
    }
    return key;
  }

  const target = path.join(STORAGE_ROOT, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return key;
}

export async function readUpload(fileKey: string): Promise<Buffer> {
  if (useSupabase()) {
    const res = await fetch(objectUrl(fileKey), { headers: serviceHeaders() });
    if (!res.ok) throw new Error(`File missing (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  const target = path.resolve(STORAGE_ROOT, fileKey);
  // Guard against path traversal in stored keys.
  if (!target.startsWith(path.resolve(STORAGE_ROOT))) {
    throw new Error("Invalid file key");
  }
  return readFile(target);
}

export async function deleteUpload(fileKey: string): Promise<void> {
  try {
    if (useSupabase()) {
      await fetch(objectUrl(fileKey), {
        method: "DELETE",
        headers: serviceHeaders(),
      });
      return;
    }
    const target = path.resolve(STORAGE_ROOT, fileKey);
    if (!target.startsWith(path.resolve(STORAGE_ROOT))) return;
    await unlink(target);
  } catch {
    // Missing file on delete is not fatal.
  }
}
