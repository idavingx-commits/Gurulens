import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { type NextRequest } from "next/server";

import { getAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { storagePath } from "@/lib/media";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;

  const media = await db.media.findUnique({ where: { id } });
  if (!media) return new Response("Not found", { status: 404 });

  if (media.visibility !== "public") {
    const auth = await getAuth();
    const allowed =
      auth !== null &&
      (auth.user.id === media.ownerId || ADMIN_ROLES.includes(auth.user.role));
    if (!allowed) return new Response("Forbidden", { status: 403 });
  }

  let full: string;
  let info;
  try {
    full = storagePath(media.storageKey);
    info = await stat(full);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const etag = `"${media.id}-${info.size}"`;
  const cacheControl =
    media.visibility === "public"
      ? "public, max-age=31536000, immutable"
      : "private, max-age=3600";

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304 });
  }

  const headers: Record<string, string> = {
    "content-type": media.mimeType,
    "accept-ranges": "bytes",
    "cache-control": cacheControl,
    etag,
  };

  const range = req.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      const start = match[1] ? Number.parseInt(match[1], 10) : 0;
      const end = match[2]
        ? Math.min(Number.parseInt(match[2], 10), info.size - 1)
        : info.size - 1;

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= info.size) {
        return new Response(null, {
          status: 416,
          headers: { "content-range": `bytes */${info.size}` },
        });
      }

      const stream = Readable.toWeb(
        createReadStream(full, { start, end }),
      ) as unknown as ReadableStream;
      return new Response(stream, {
        status: 206,
        headers: {
          ...headers,
          "content-length": String(end - start + 1),
          "content-range": `bytes ${start}-${end}/${info.size}`,
        },
      });
    }
  }

  const stream = Readable.toWeb(createReadStream(full)) as unknown as ReadableStream;
  return new Response(stream, {
    headers: { ...headers, "content-length": String(info.size) },
  });
}
