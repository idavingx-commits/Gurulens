import { type NextRequest } from "next/server";

import { getAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { getObject, publicMediaUrl } from "@/lib/media";

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

  // Public files are served straight from the R2 custom domain so byte-range
  // video requests never flow through the Worker.
  if (media.visibility === "public") {
    const cdnUrl = publicMediaUrl(media.storageKey);
    if (cdnUrl) {
      return new Response(null, {
        status: 302,
        headers: {
          location: cdnUrl,
          "cache-control": "public, max-age=300",
        },
      });
    }
  }

  let upstream: Response;
  try {
    upstream = await getObject(media.storageKey, req.headers.get("range"));
  } catch {
    return new Response("Not found", { status: 404 });
  }

  if (!upstream.ok) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("content-type", media.mimeType);
  headers.set("accept-ranges", "bytes");
  headers.set(
    "cache-control",
    media.visibility === "public"
      ? "public, max-age=31536000, immutable"
      : "private, max-age=3600",
  );

  const length = upstream.headers.get("content-length");
  if (length) headers.set("content-length", length);

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("content-range", contentRange);

  const etag = upstream.headers.get("etag");
  if (etag) headers.set("etag", etag);

  return new Response(upstream.body, { status: upstream.status, headers });
}
