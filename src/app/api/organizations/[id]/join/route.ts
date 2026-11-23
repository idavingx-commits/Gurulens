/**
 * Self-registration into a school with school-specific identifiers.
 * Students: admission number (required), index number (optional), class.
 * Teachers: staff ID (required).
 *
 * The membership starts as "invited" — a school owner/admin approves it from
 * the manage page. Identifiers are unique within the school.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { db } from "@/lib/db";
import { commitSchoolMembership, prepareSchoolRegistration } from "@/lib/school";

type Ctx = { params: Promise<{ id: string }> };

const joinSchema = z.object({
  role: z.enum(["student", "teacher"]),
  admissionNo: z.string().trim().max(40).optional(),
  indexNo: z.string().trim().max(40).optional(),
  staffId: z.string().trim().max(40).optional(),
  schoolClassId: z.string().trim().min(1).nullable().optional(),
});

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const body = await parseBody(req, joinSchema);

  if (body.role === "student" && auth.user.role !== "student") {
    throw new ApiError(400, "Use a student account to join as a student.", "wrong_account_role");
  }
  if (body.role === "teacher" && auth.user.role === "student") {
    throw new ApiError(
      400,
      "Register a teacher account first, then join with your staff ID.",
      "wrong_account_role",
    );
  }

  const org = await db.organization.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!org || org.type !== "school") {
    throw new ApiError(404, "School not found.", "not_found");
  }

  const prepared = await prepareSchoolRegistration({
    organizationId: id,
    userId: auth.user.id,
    role: body.role,
    admissionNo: body.admissionNo,
    indexNo: body.indexNo,
    staffId: body.staffId,
    schoolClassId: body.schoolClassId,
  });

  const membership = await commitSchoolMembership(auth.user.id, auth.user.name, prepared);

  return ok(
    {
      membershipId: membership.id,
      status: "invited",
      message: "Registration sent. The school will approve your account soon.",
    },
    { status: 201 },
  );
});
