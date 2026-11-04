import { randomBytes } from "node:crypto";
import path from "node:path";

import { getStore } from "@netlify/blobs";

import { UPLOAD_LIMITS, UPLOAD_MIME } from "@/lib/constants";

// Validation root only: files live in Netlify Blobs, keyed by the normalized storage key.
const STORAGE_ROOT = path.join(process.cwd(), "storage");

/** Netlify Blobs store holding every uploaded file (strongly consistent so reads follow writes). */
export function mediaStore() {
  return getStore({ name: "media", consistency: "strong" });
}

/** Validates a storage key and returns its canonical Blobs key (forward slashes, no leading slash). */
export function blobKey(key: string): string {
  const full = storagePath(key);
  return path.relative(STORAGE_ROOT, full).split(path.sep).join("/");
}

export function storagePath(key: string): string {
  const normalized = path.normalize(key.replace(/\\/g, "/")).replace(/^([/\\])+/, "");
  const full = path.join(STORAGE_ROOT, normalized);
  if (!full.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid storage key");
  }
  return full;
}

export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  if (buf.toString("ascii", 0, 4) === "GIF8") return "image/gif";
  if (buf.toString("ascii", 4, 8) === "ftyp") return "video/mp4";
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "video/webm";
  if (buf.toString("ascii", 0, 4) === "%PDF") return "application/pdf";
  return null;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "application/pdf": "pdf",
};

export type StoredUpload = {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

export async function saveUpload(buf: Buffer, kind: string): Promise<StoredUpload> {
  const allowed = UPLOAD_MIME[kind];
  if (!allowed) throw new Error("Unknown upload kind");

  const limit = UPLOAD_LIMITS[kind] ?? 10 * 1024 * 1024;
  if (buf.length === 0) throw new Error("Empty file");
  if (buf.length > limit) {
    throw new Error(`File too large. Maximum is ${Math.round(limit / (1024 * 1024))} MB.`);
  }

  const sniffed = sniffMime(buf);
  if (!sniffed || !allowed.includes(sniffed)) {
    throw new Error("Unsupported file type. Allowed: " + allowed.join(", "));
  }

  const now = new Date();
  const dir = path.posix.join(kind, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
  const ext = EXT_BY_MIME[sniffed] ?? "bin";
  const key = `${dir}/${randomBytes(10).toString("hex")}.${ext}`;

  const bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  await mediaStore().set(blobKey(key), bytes, { metadata: { mimeType: sniffed } });

  return { storageKey: key, mimeType: sniffed, sizeBytes: buf.length };
}

export async function deleteFile(key: string): Promise<void> {
  try {
    await mediaStore().delete(blobKey(key));
  } catch {
    // Already gone — nothing to do.
  }
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}
