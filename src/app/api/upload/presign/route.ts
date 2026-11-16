import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import {
  buildStorageKey,
  normalizeKind,
  presignUpload,
  publicMediaUrl,
} from "@/lib/media";
import { UPLOAD_KINDS, isUploadKind } from "@/lib/upload-record";

export const runtime = "nodejs";

const schema = z.object({
  kind: z.string().min(1).max(32),
  contentType: z.string().min(3).max(120),
  size: z.number().int().positive(),
});

/**
 * Step 1 of the direct-to-R2 upload flow.
 *
 * The browser uploads the file straight to R2 with a short-lived signed URL,
 * which keeps large videos under the Worker request-body limit (100 MB on
 * Cloudflare) and avoids buffering a file in Worker memory.
 */
export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, schema);

  if (!isUploadKind(body.kind)) {
    throw new ApiError(400, "Invalid upload kind.", "bad_kind");
  }
  const kind = body.kind;

  if (kind === "doc" && auth.user.role === "student") {
    throw new ApiError(403, "Only teachers can upload documents.", "forbidden");
  }

  const { mimeTypes, limit } = normalizeKind(kind);

  if (!mimeTypes.includes(body.contentType)) {
    throw new ApiError(
      400,
      "Unsupported file type. Allowed: " + mimeTypes.join(", "),
      "bad_mime",
    );
  }

  if (body.size > limit) {
    throw new ApiError(
      400,
      `File too large. Maximum is ${Math.round(limit / (1024 * 1024))} MB.`,
      "too_large",
    );
  }

  const key = buildStorageKey(kind, body.contentType);
  const uploadUrl = await presignUpload(key, body.contentType, 900);

  return ok({
    upload: {
      key,
      url: uploadUrl,
      headers: { "content-type": body.contentType },
      expiresIn: 900,
      publicUrl: publicMediaUrl(key),
      kinds: UPLOAD_KINDS,
    },
  });
});
