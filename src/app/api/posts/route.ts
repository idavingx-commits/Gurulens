import type { Prisma } from "@prisma/client";
import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { getAuth } from "@/lib/auth";
import { hydratePosts, POST_INCLUDE } from "@/lib/data";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { postSchema } from "@/lib/validation";

export const GET = route(async (req: NextRequest) => {
  const auth = await getAuth();
  const viewerId = auth?.user.id ?? null;
  const sp = req.nextUrl.searchParams;

  const limit = Math.min(40, Math.max(1, Number(sp.get("limit") ?? 12) || 12));
  const scope = sp.get("scope") ?? "latest";
  const type = sp.get("type");
  const subjectSlug = sp.get("subject");
  const authorHandle = sp.get("author");
  const before = sp.get("before");

  if (scope === "following" && !viewerId) {
    return ok({ posts: [], nextCursor: null });
  }

  const where: Prisma.PostWhereInput = { moderationStatus: "approved" };

  if (viewerId) {
    const memberships = await db.membership.findMany({
      where: { memberId: viewerId, status: "active" },
      select: { tier: { select: { teacherId: true } } },
    });
    const memberTeacherIds = memberships.map((m) => m.tier.teacherId);
    const or: Prisma.PostWhereInput[] = [{ visibility: "public" }];
    if (memberTeacherIds.length > 0) {
      or.push({ visibility: "members", authorId: { in: memberTeacherIds } });
    }
    where.OR = or;
  } else {
    where.visibility = "public";
  }

  if (scope === "following" && viewerId) {
    const follows = await db.follow.findMany({
      where: { followerId: viewerId },
      select: { teacherId: true },
    });
    where.authorId = { in: follows.map((f) => f.teacherId) };
  }

  if (authorHandle) {
    const profile = await db.teacherProfile.findUnique({
      where: { handle: authorHandle },
      select: { userId: true },
    });
    if (!profile) throw new ApiError(404, "Teacher not found.", "not_found");
    where.authorId = profile.userId;
  }

  if (type === "media") {
    where.type = { in: ["reel", "video"] };
  } else if (type) {
    where.type = type;
  }

  if (subjectSlug) {
    const subject = await db.subject.findUnique({
      where: { slug: subjectSlug },
      select: { id: true },
    });
    where.subjectId = subject?.id ?? "__none__";
  }

  if (before) {
    const d = new Date(before);
    if (!Number.isNaN(d.getTime())) where.publishedAt = { lt: d };
  }

  const posts = await db.post.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...POST_INCLUDE,
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;
  const views = await hydratePosts(page, viewerId);
  const nextCursor = hasMore
    ? page[page.length - 1]!.publishedAt.toISOString()
    : null;

  return ok({ posts: views, nextCursor });
});

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req, ["teacher", "admin", "moderator"]);

  const rl = rateLimit(`post:create:${auth.user.id}`, 12, 60 * 60 * 1000);
  if (!rl.ok) {
    throw new ApiError(
      429,
      `You can publish up to 12 posts per hour. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minutes.`,
      "rate_limited",
    );
  }

  if (auth.user.role === "teacher") {
    const profile = await db.teacherProfile.findUnique({
      where: { userId: auth.user.id },
      select: { consentPublic: true },
    });
    if (!profile || !profile.consentPublic) {
      throw new ApiError(
        403,
        "Please enable your public teacher profile before posting.",
        "consent_required",
      );
    }
  }

  const body = await parseBody(req, postSchema);

  if (body.mediaIds.length > 0) {
    const medias = await db.media.findMany({
      where: { id: { in: body.mediaIds }, ownerId: auth.user.id },
      select: { id: true, mimeType: true },
    });
    const uniqueIds = new Set(body.mediaIds);
    if (medias.length !== uniqueIds.size) {
      throw new ApiError(400, "One or more attachments are invalid.", "bad_media");
    }
    if (medias.some((m) => !m.mimeType.startsWith("image/"))) {
      throw new ApiError(400, "Attachments must be image files.", "bad_media");
    }
  }

  if (body.videoId) {
    const video = await db.media.findUnique({
      where: { id: body.videoId },
      select: { ownerId: true, mimeType: true },
    });
    if (!video || video.ownerId !== auth.user.id || !video.mimeType.startsWith("video/")) {
      throw new ApiError(400, "The video file is invalid.", "bad_video");
    }
  }

  if ((body.type === "reel" || body.type === "video") && !body.videoId) {
    throw new ApiError(400, "Reels and videos require a video file.", "missing_video");
  }

  const post = await db.post.create({
    data: {
      authorId: auth.user.id,
      type: body.type,
      title: body.title ?? null,
      text: body.text,
      mediaIds: body.mediaIds.length > 0 ? JSON.stringify(body.mediaIds) : null,
      videoId: body.videoId ?? null,
      subjectId: body.subjectId ?? null,
      gradeId: body.gradeId ?? null,
      visibility: body.visibility,
      moderationStatus: "approved",
    },
    ...POST_INCLUDE,
  });

  await writeAudit(auth.user.id, "post.create", post.id, { type: body.type });

  const [view] = await hydratePosts([post], auth.user.id);
  return ok({ post: view }, { status: 201 });
});
