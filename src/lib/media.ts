import { randomBytes } from "node:crypto";

import { AwsClient } from "aws4fetch";

import { UPLOAD_LIMITS, UPLOAD_MIME } from "@/lib/constants";

/**
 * Media storage on an S3-compatible provider.
 *
 * Neon Object Storage is the default when Neon's branch credentials are
 * present (AWS_ENDPOINT_URL_S3 + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY).
 * Cloudflare R2 remains supported as a fallback.
 *
 * Why the S3 API instead of a binding?
 * - It works identically in local dev (Node) and on Workers.
 * - It lets us issue presigned PUT URLs so large videos bypass the Worker
 *   request-body limit (100 MB on Cloudflare).
 *
 * Neon environment variables (pulled by `neon deploy`):
 *   AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 *   MEDIA_BUCKET (defaults to "assets", the bucket declared in neon.ts)
 * R2 fallback:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 * Optional:
 *   MEDIA_PUBLIC_URL (e.g. https://media.gurulens.us) for public delivery
 */

type StorageConfig = {
  client: AwsClient;
  bucket: string;
  endpoint: string;
};

let cachedConfig: StorageConfig | null | undefined;

export function storageConfig(): StorageConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;

  const neonEndpoint = process.env.AWS_ENDPOINT_URL_S3?.trim();
  const neonAccessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const neonSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const neonBucket = process.env.MEDIA_BUCKET?.trim() || "assets";

  if (neonEndpoint && neonAccessKeyId && neonSecretAccessKey && neonBucket) {
    cachedConfig = {
      client: new AwsClient({
        accessKeyId: neonAccessKeyId,
        secretAccessKey: neonSecretAccessKey,
        service: "s3",
        region: process.env.AWS_REGION?.trim() || "auto",
      }),
      bucket: neonBucket,
      endpoint: neonEndpoint.replace(/\/+$/, ""),
    };
    return cachedConfig;
  }

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
  return storageConfig() !== null;
}

function requireConfig(): StorageConfig {
  const config = storageConfig();
  if (!config) {
    throw new Error(
      "Media storage is not configured. Set Neon object-storage variables or R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.",
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
  if (response.ok) {
    const length = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
    return {
      size: Number.isFinite(length) ? length : 0,
      contentType: response.headers.get("content-type"),
    };
  }

  // Some S3-compatible gateways reject HEAD for private objects even when the
  // signature is valid. A one-byte ranged GET gives us the same metadata.
  const probe = await config.client.fetch(objectUrl(key), {
    method: "GET",
    headers: { range: "bytes=0-0" },
  });
  if (!probe.ok) {
    console.warn(`[media:head] HEAD ${response.status}, ranged GET ${probe.status}`);
    return null;
  }
  await probe.arrayBuffer();

  const contentRange = probe.headers.get("content-range") ?? "";
  const total = Number.parseInt(contentRange.split("/")[1] ?? "0", 10);
  const length = Number.parseInt(probe.headers.get("content-length") ?? "0", 10);
  let size = length;
  if (Number.isFinite(total) && total > 0) size = total;
  if (!Number.isFinite(size)) size = 0;

  return {
    size,
    contentType: probe.headers.get("content-type"),
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
