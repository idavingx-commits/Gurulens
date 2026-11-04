import { type NextRequest } from "next/server";

import { ApiError, ok, requireAuth, route } from "@/lib/api";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ handle: string }> };

async function getTeacher(handle: string) {
  const profile = await db.teacherProfile.findUnique({
    where: { handle },
    select: { userId: true, consentPublic: true, user: { select: { status: true, role: true } } },
  });
  if (!profile || profile.user.role !== "teacher" || profile.user.status !== "active") {
    throw new ApiError(404, "Teacher not found.", "not_found");
  }
  return profile;
}

export const POST = route<Ctx>(async (req: NextRequest, ctx) => {
  const auth = await requireAuth(req);
  const { handle } = await ctx.params;
  const profile = await getTeacher(handle);

  if (profile.userId === auth.user.id) {
    throw new ApiError(400, "You cannot follow yourself.", "self_follow");
  }

  await db.follow.upsert({
    where: { followerId_teacherId: { followerId: auth.user.id, teacherId: profile.userId } },
    create: { followerId: auth.user.id, teacherId: profile.userId },
    update: {},
  });

  const followerCount = await db.follow.count({ where: { teacherId: profile.userId } });
  return ok({ following: true, followerCount });
});

export const DELETE = route<Ctx>(async (req: NextRequest, ctx) => {
  const auth = await requireAuth(req);
  const { handle } = await ctx.params;
  const profile = await getTeacher(handle);

  await db.follow.deleteMany({
    where: { followerId: auth.user.id, teacherId: profile.userId },
  });

  const followerCount = await db.follow.count({ where: { teacherId: profile.userId } });
  return ok({ following: false, followerCount });
});
