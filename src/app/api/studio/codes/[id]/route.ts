import { type NextRequest } from "next/server";

import { ApiError, ok, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req, ["teacher", "admin"]);
  const { id } = await ctx.params;

  const code = await db.enrollmentCode.findUnique({
    where: { id },
    select: { id: true, teacherId: true, _count: { select: { eligibilities: true } } },
  });
  if (!code) throw new ApiError(404, "Enrollment code not found.", "not_found");
  if (code.teacherId !== auth.user.id && auth.user.role !== "admin") {
    throw new ApiError(403, "You can only manage your own codes.", "forbidden");
  }
  if (code._count.eligibilities > 0) {
    throw new ApiError(
      400,
      "This code has verified students, so it is kept for the record.",
      "code_in_use",
    );
  }

  await db.enrollmentCode.delete({ where: { id } });
  await writeAudit(auth.user.id, "enrollment_code.delete", id, {});
  return ok({ deleted: true });
});
