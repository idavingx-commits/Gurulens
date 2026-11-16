import { type NextRequest } from "next/server";

import { ApiError, ok, requireAuth, route } from "@/lib/api";
import { saveUpload } from "@/lib/media";
import { finalizeUpload, isUploadKind } from "@/lib/upload-record";

export const runtime = "nodejs";

/**
 * Multipart upload for small files (avatars, covers, images, documents).
 * Large videos use the presigned direct-to-R2 flow at /api/upload/presign.
 */
export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);

  const form = await req.formData().catch(() => null);
  if (!form) throw new ApiError(400, "Invalid upload request.", "bad_form");

  const file = form.get("file");
  const kindRaw = form.get("kind");

  if (!(file instanceof File)) throw new ApiError(400, "No file provided.", "no_file");
  if (typeof kindRaw !== "string" || !isUploadKind(kindRaw)) {
    throw new ApiError(400, "Invalid upload kind.", "bad_kind");
  }
  const kind = kindRaw;

  if (kind === "doc" && auth.user.role === "student") {
    throw new ApiError(403, "Only teachers can upload documents.", "forbidden");
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let stored;
  try {
    stored = await saveUpload(buf, kind);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    throw new ApiError(400, message, "upload_failed");
  }

  const media = await finalizeUpload({
    userId: auth.user.id,
    role: auth.user.role,
    kind,
    storageKey: stored.storageKey,
    mimeType: stored.mimeType,
    sizeBytes: stored.sizeBytes,
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
