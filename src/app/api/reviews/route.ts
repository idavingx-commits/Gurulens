import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { reviewSchema } from "@/lib/validation";

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, reviewSchema);

  if (auth.user.id === body.teacherId) {
    throw new ApiError(400, "You cannot review yourself.", "self_review");
  }

  const rl = rateLimit(`review:${auth.user.id}`, 6, 60 * 60 * 1000);
  if (!rl.ok) {
    throw new ApiError(429, "Too many review attempts. Please try again later.", "rate_limited");
  }

  const teacher = await db.user.findUnique({
    where: { id: body.teacherId },
    select: { id: true, name: true, role: true, status: true },
  });
  if (!teacher || teacher.role !== "teacher" || teacher.status !== "active") {
    throw new ApiError(404, "Teacher not found.", "not_found");
  }

  const eligibility = await db.reviewEligibility.findUnique({
    where: { teacherId_studentId: { teacherId: teacher.id, studentId: auth.user.id } },
  });
  if (!eligibility || eligibility.status === "revoked") {
    throw new ApiError(
      403,
      "Only students verified through this teacher's enrollment codes can review.",
      "not_eligible",
    );
  }

  const existing = await db.review.findUnique({
    where: { teacherId_authorId: { teacherId: teacher.id, authorId: auth.user.id } },
  });
  if (existing && existing.status === "published") {
    throw new ApiError(409, "You have already reviewed this teacher.", "already_reviewed");
  }

  const data = {
    stars: body.stars,
    clarity: body.clarity ?? null,
    support: body.support ?? null,
    organization: body.organization ?? null,
    feedback: body.feedback,
    eligibilityStatus: eligibility.status === "verified" ? "verified" : "pending",
    status: "published",
  };

  const review = existing
    ? await db.review.update({ where: { id: existing.id }, data })
    : await db.review.create({
        data: { teacherId: teacher.id, authorId: auth.user.id, ...data },
      });

  if (eligibility.status !== "verified") {
    await db.reviewEligibility
      .update({ where: { id: eligibility.id }, data: { status: "verified" } })
      .catch(() => undefined);
  }

  await writeAudit(auth.user.id, existing ? "review.create" : "review.submit", review.id, {
    teacherId: teacher.id,
    stars: body.stars,
  });

  const teacherProfile = await db.teacherProfile.findUnique({
    where: { userId: teacher.id },
    select: { handle: true },
  });

  await notify(
    teacher.id,
    "review",
    `${auth.user.name} reviewed your classes`,
    `${body.stars}/5 — ${body.feedback.slice(0, 120)}`,
    teacherProfile ? `/teacher/${teacherProfile.handle}?tab=reviews` : null,
  );

  return ok({ reviewId: review.id }, { status: existing ? 200 : 201 });
});
