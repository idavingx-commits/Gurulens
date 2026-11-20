import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { getObject, headObject, normalizeKind, resolveMimeForKind } from "@/lib/media";
import { finalizeUpload, isStorageKeyForKind, isUploadKind } from "@/lib/upload-record";

export const runtime = "nodejs";

const schema = z.object({
  key: z.string().min(1).max(300),
  kind: z.string().min(1).max(32),
});

/**
 * Step 2 of the direct-to-storage flow: verify the object exists, re-check its size
 * and magic bytes, then create the Media row.
 */
export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, schema);

  if (!isUploadKind(body.kind)) {
    throw new ApiError(400, "Invalid upload kind.", "bad_kind");
  }
  const kind = body.kind;

  if (!isStorageKeyForKind(body.key, kind)) {
    throw new ApiError(400, "Invalid storage key.", "bad_key");
  }

  if (kind === "doc" && auth.user.role === "student") {
    throw new ApiError(403, "Only teachers can upload documents.", "forbidden");
  }

  const { mimeTypes, limit } = normalizeKind(kind);

  const head = await headObject(body.key);
  if (!head) {
    throw new ApiError(400, "Upload not found. Please try again.", "missing_object");
  }
  if (head.size <= 0 || head.size > limit) {
    throw new ApiError(400, "Uploaded file has an invalid size.", "bad_size");
  }

  const probe = await getObject(body.key, "bytes=0-15").catch(() => null);
  if (!probe || !probe.ok) {
    throw new ApiError(400, "Could not verify the uploaded file.", "probe_failed");
  }

  const sniffed = resolveMimeForKind(await probe.arrayBuffer(), mimeTypes);
  if (!sniffed) {
    throw new ApiError(
      400,
      "Unsupported file type. Allowed: " + mimeTypes.join(", "),
      "bad_mime",
    );
  }

  const media = await finalizeUpload({
    userId: auth.user.id,
    role: auth.user.role,
    kind,
    storageKey: body.key,
    mimeType: sniffed,
    sizeBytes: head.size,
  });

  return ok({
    media: {
      id: media.id,
      kind: media.kind,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      url: `/api/media/${media.id}`,
    },
  });
});
