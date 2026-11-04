import { type NextRequest } from "next/server";

import { ApiError, ok, requireAuth, route } from "@/lib/api";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { saveUpload } from "@/lib/media";

export const runtime = "nodejs";

const KINDS = ["avatar", "cover", "post_image", "video", "doc"] as const;
type Kind = (typeof KINDS)[number];

const VISIBILITY: Record<Kind, string> = {
  avatar: "public",
  cover: "public",
  post_image: "public",
  video: "public",
  doc: "private",
};

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);

  const form = await req.formData().catch(() => null);
  if (!form) throw new ApiError(400, "Invalid upload request.", "bad_form");

  const file = form.get("file");
  const kindRaw = form.get("kind");

  if (!(file instanceof File)) throw new ApiError(400, "No file provided.", "no_file");
  if (typeof kindRaw !== "string" || !KINDS.includes(kindRaw as Kind)) {
    throw new ApiError(400, "Invalid upload kind.", "bad_kind");
  }
  const kind = kindRaw as Kind;

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

  const media = await db.media.create({
    data: {
      ownerId: auth.user.id,
      kind,
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      visibility: VISIBILITY[kind],
    },
  });

  if (kind === "avatar") {
    await db.user.update({ where: { id: auth.user.id }, data: { avatarKey: media.id } });
  }

  if (kind === "cover" && (auth.user.role === "teacher" || ADMIN_ROLES.includes(auth.user.role))) {
    const profile = await db.teacherProfile.findUnique({ where: { userId: auth.user.id } });
    if (profile) {
      await db.teacherProfile.update({ where: { id: profile.id }, data: { coverKey: media.id } });
    }
  }

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
