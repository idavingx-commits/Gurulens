import { randomBytes } from "node:crypto";

import { AwsClient } from "aws4fetch";

import { UPLOAD_LIMITS, UPLOAD_MIME } from "@/lib/constants";

/**
 * Media storage on Cloudflare R2 using the S3-compatible API.
 *
 * Why the S3 API instead of the R2 binding?
 * - It works identically in local dev (Node) and on Workers.
 * - It lets us issue presigned PUT URLs so large videos bypass the Worker
 *   request-body limit (100 MB on Cloudflare).
 *
 * Required environment variables:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 * Optional:
 *   MEDIA_PUBLIC_URL (e.g. https://media.gurulens.us) for public delivery
 */

type R2Config = {
  client: AwsClient;
  bucket: string;
  endpoint: string;
};

let cachedConfig: R2Config | null | undefined;

export function r2Config(): R2Config | null {
  if (cachedConfig !== undefined) return cachedConfig;

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    cachedConfig = null;
    return null;
  }

  cachedConfig = {
    client: new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    }),
    bucket,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };

  return cachedConfig;
}

export function mediaStorageReady(): boolean {
  return r2Config() !== null;
}

function requireConfig(): R2Config {
  const config = r2Config();
  if (!config) {
    throw new Error(
      "Media storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.",
    );
  }
  return config;
}

function encodeKey(key: string): string {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function objectUrl(key: string): string {
  const config = requireConfig();
  return `${config.endpoint}/${config.bucket}/${encodeKey(key)}`;
}

/** Public CDN URL for a storage key, or null when no public bucket domain is configured. */
export function publicMediaUrl(key: string): string | null {
  const base = process.env.MEDIA_PUBLIC_URL?.trim().replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/${encodeKey(key)}`;
}

export function sniffMime(buf: ArrayBuffer | Uint8Array): string | null {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  const ascii4 = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (ascii4 === "GIF8") return "image/gif";
  const ascii8 = String.fromCharCode(
    bytes[4],
    bytes[5],
    bytes[6],
    bytes[7],
    bytes[8],
    bytes[9],
    bytes[10],
    bytes[11],
  );
  if (ascii8.startsWith("ftyp")) return "video/mp4";
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3)
    return "video/webm";
  if (ascii4 === "%PDF") return "application/pdf";
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

export const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
};

export type StoredUpload = {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

export function extensionForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}

export function normalizeKind(kind: string): { mimeTypes: string[]; limit: number } {
  const mimeTypes = UPLOAD_MIME[kind];
  if (!mimeTypes) throw new Error("Unknown upload kind");
  return { mimeTypes, limit: UPLOAD_LIMITS[kind] ?? 10 * 1024 * 1024 };
}

export function buildStorageKey(kind: string, mimeType: string): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${kind}/${now.getFullYear()}/${month}/${randomBytes(10).toString("hex")}.${extensionForMime(mimeType)}`;
}

export async function putObject(
  key: string,
  body: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const config = requireConfig();
  const response = await config.client.fetch(objectUrl(key), {
    method: "PUT",
    headers: { "content-type": contentType },
    body: body as BodyInit,
  });

  if (!response.ok) {
    throw new Error(`Storage upload failed (${response.status}).`);
  }
}

export async function saveUpload(buf: Buffer, kind: string): Promise<StoredUpload> {
  const { mimeTypes, limit } = normalizeKind(kind);

  if (buf.length === 0) throw new Error("Empty file");
  if (buf.length > limit) {
    throw new Error(`File too large. Maximum is ${Math.round(limit / (1024 * 1024))} MB.`);
  }

  const sniffed = sniffMime(buf);
  if (!sniffed || !mimeTypes.includes(sniffed)) {
    throw new Error("Unsupported file type. Allowed: " + mimeTypes.join(", "));
  }

  const key = buildStorageKey(kind, sniffed);
  await putObject(key, buf, sniffed);

  return { storageKey: key, mimeType: sniffed, sizeBytes: buf.length };
}

/** Returns a signed PUT URL so the browser can upload directly to R2. */
export async function presignUpload(
  key: string,
  contentType: string,
  expiresInSeconds = 900,
): Promise<string> {
  const config = requireConfig();
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
  const signed = await config.client.sign(
    new Request(url, { method: "PUT", headers: { "content-type": contentType } }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

export async function headObject(
  key: string,
): Promise<{ size: number; contentType: string | null } | null> {
  const config = requireConfig();
  const response = await config.client.fetch(objectUrl(key), { method: "HEAD" });
  if (!response.ok) return null;

  const length = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
  return {
    size: Number.isFinite(length) ? length : 0,
    contentType: response.headers.get("content-type"),
  };
}

export async function getObject(key: string, range?: string | null): Promise<Response> {
  const config = requireConfig();
  const headers: Record<string, string> = {};
  if (range) headers.range = range;

  return config.client.fetch(objectUrl(key), { method: "GET", headers });
}

export async function deleteFile(key: string): Promise<void> {
  try {
    const config = requireConfig();
    await config.client.fetch(objectUrl(key), { method: "DELETE" });
  } catch {
    // Already gone or storage not configured — nothing meaningful to do.
  }
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}
