/**
 * School-specific helpers: grade/section groups ("10-A"), weekly period
 * timetables and school-ID membership context.
 *
 * Access rule: anyone can see a school's public profile and published posts,
 * but timetables and other school-only content require an ACTIVE membership
 * (student, teacher, staff or manager) — or a GuruLens system admin.
 */

import { db } from "./db";
import { ApiError } from "./api";
import { notify, writeAudit } from "./audit";
import { ADMIN_ROLES, type Role } from "./constants";
import { MAX_PERIODS, SCHOOL_DAYS } from "./school-days";

export { MAX_PERIODS, SCHOOL_DAYS };

export type TimetableEntryInput = {
  dayOfWeek: number;
  period: number;
  subject: string;
  teacher?: string | null;
  room?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
};

/** Public school list for the registration / join forms. */
export async function getPublicSchools() {
  return db.organization.findMany({
    where: { type: "school" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      schoolClasses: {
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });
}

export async function getSchoolClasses(organizationId: string) {
  return db.schoolClass.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          members: { where: { status: "active", role: "student" } },
        },
      },
    },
  });
}

export async function getSchoolTimetable(organizationId: string, schoolClassId?: string) {
  return db.timetableEntry.findMany({
    where: {
      organizationId,
      ...(schoolClassId ? { schoolClassId } : {}),
    },
    orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }],
  });
}

/**
 * The viewer's school membership context. `isMember` is true only for ACTIVE
 * members; `isPending` marks a registration waiting for school approval.
 */
export async function getSchoolContext(userId: string | null, organizationId: string) {
  if (!userId) {
    return { isMember: false, isPending: false, isSystemAdmin: false, membership: null };
  }
  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: {
      id: true,
      role: true,
      status: true,
      admissionNo: true,
      indexNo: true,
      staffId: true,
      schoolClassId: true,
      schoolClass: { select: { id: true, name: true } },
    },
  });
  return {
    isMember: membership?.status === "active",
    isPending: membership?.status === "invited",
    isSystemAdmin: false,
    membership,
  };
}

export function canViewSchoolContent(
  userRole: string | null,
  isMember: boolean,
): boolean {
  if (userRole && ADMIN_ROLES.includes(userRole as Role)) return true;
  return isMember;
}

/** Replace a class's whole week in one transaction (the builder saves a week). */
export async function saveTimetableWeek(
  organizationId: string,
  schoolClassId: string,
  entries: TimetableEntryInput[],
) {
  const rows = entries
    .filter((e) => e.subject.trim().length > 0)
    .map((e) => ({
      organizationId,
      schoolClassId,
      dayOfWeek: e.dayOfWeek,
      period: e.period,
      subject: e.subject.trim().slice(0, 120),
      teacher: e.teacher?.trim().slice(0, 120) || null,
      room: e.room?.trim().slice(0, 60) || null,
      startTime: e.startTime?.trim().slice(0, 10) || null,
      endTime: e.endTime?.trim().slice(0, 10) || null,
      note: e.note?.trim().slice(0, 200) || null,
    }));

  await db.$transaction([
    db.timetableEntry.deleteMany({ where: { schoolClassId } }),
    ...(rows.length > 0 ? [db.timetableEntry.createMany({ data: rows })] : []),
  ]);
  return rows.length;
}

/** Normalize a Sri Lankan school identifier (admission / index / staff). */
export function normalizeSchoolId(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "").slice(0, 40);
}

export type SchoolRegistrationInput = {
  organizationId: string;
  role: "student" | "teacher";
  userId?: string;
  admissionNo?: string | null;
  indexNo?: string | null;
  staffId?: string | null;
  schoolClassId?: string | null;
};

export type PreparedSchoolRegistration = {
  organizationId: string;
  orgName: string;
  orgSlug: string;
  role: "student" | "teacher";
  admissionNo: string | null;
  indexNo: string | null;
  staffId: string | null;
  schoolClassId: string | null;
  existingMembershipId: string | null;
};

/**
 * Validate a school registration (identifiers unique per school, class belongs
 * to the school, membership state allows joining). Throws ApiError on failure.
 * Call BEFORE creating the account so a taken identifier never leaves an
 * orphan user behind.
 */
export async function prepareSchoolRegistration(
  input: SchoolRegistrationInput,
): Promise<PreparedSchoolRegistration> {
  const org = await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, type: true, name: true, slug: true },
  });
  if (!org || org.type !== "school") {
    throw new ApiError(404, "School not found.", "not_found");
  }

  const admissionNo = input.admissionNo ? normalizeSchoolId(input.admissionNo) : null;
  const indexNo = input.indexNo ? normalizeSchoolId(input.indexNo) : null;
  const staffId = input.staffId ? normalizeSchoolId(input.staffId) : null;

  if (input.role === "student" && !admissionNo) {
    throw new ApiError(400, "Your admission number is required.", "admission_required");
  }
  if (input.role === "teacher" && !staffId) {
    throw new ApiError(400, "Your staff ID is required.", "staff_id_required");
  }

  let existingMembershipId: string | null = null;
  if (input.userId) {
    const existing = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: org.id, userId: input.userId },
      },
      select: { id: true, status: true },
    });
    if (existing?.status === "active") {
      throw new ApiError(400, "You are already a member of this school.", "already_member");
    }
    if (existing?.status === "invited") {
      throw new ApiError(400, "Your registration is already waiting for approval.", "already_pending");
    }
    if (existing?.status === "suspended") {
      throw new ApiError(403, "Your membership at this school is suspended.", "suspended");
    }
    existingMembershipId = existing?.id ?? null;
  }

  const checks: Array<{
    field: "admissionNo" | "indexNo" | "staffId";
    value: string | null;
    label: string;
  }> = [
    { field: "admissionNo", value: input.role === "student" ? admissionNo : null, label: "admission number" },
    { field: "indexNo", value: input.role === "student" ? indexNo : null, label: "index number" },
    { field: "staffId", value: input.role === "teacher" ? staffId : null, label: "staff ID" },
  ];
  for (const check of checks) {
    if (!check.value) continue;
    const clash = await db.organizationMember.findFirst({
      where: {
        organizationId: org.id,
        [check.field]: check.value,
        status: { not: "removed" },
        ...(input.userId ? { userId: { not: input.userId } } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ApiError(
        409,
        `That ${check.label} is already registered at this school. Contact the school office if this is yours.`,
        "id_taken",
      );
    }
  }

  let schoolClassId: string | null = null;
  if (input.schoolClassId) {
    const schoolClass = await db.schoolClass.findFirst({
      where: { id: input.schoolClassId, organizationId: org.id },
      select: { id: true },
    });
    if (!schoolClass) throw new ApiError(400, "Choose a valid class.", "invalid_class");
    schoolClassId = schoolClass.id;
  }

  return {
    organizationId: org.id,
    orgName: org.name,
    orgSlug: org.slug,
    role: input.role,
    admissionNo: input.role === "student" ? admissionNo : null,
    indexNo: input.role === "student" ? indexNo : null,
    staffId: input.role === "teacher" ? staffId : null,
    schoolClassId,
    existingMembershipId,
  };
}

/** Create (or revive) the invited membership and notify the school's approvers. */
export async function commitSchoolMembership(
  userId: string,
  userName: string,
  prepared: PreparedSchoolRegistration,
) {
  const data = {
    role: prepared.role,
    status: "invited",
    admissionNo: prepared.admissionNo,
    indexNo: prepared.indexNo,
    staffId: prepared.staffId,
    schoolClassId: prepared.schoolClassId,
    invitedAt: new Date(),
  };

  const membership = prepared.existingMembershipId
    ? await db.organizationMember.update({
        where: { id: prepared.existingMembershipId },
        data,
      })
    : await db.organizationMember.create({
        data: { organizationId: prepared.organizationId, userId, ...data },
      });

  const approvers = await db.organizationMember.findMany({
    where: {
      organizationId: prepared.organizationId,
      role: { in: ["owner", "admin"] },
      status: "active",
    },
    select: { userId: true },
    take: 10,
  });
  await Promise.all(
    approvers.map((approver) =>
      notify(
        approver.userId,
        "campus",
        `New ${prepared.role} registration at ${prepared.orgName}`,
        `${userName} registered with ${
          prepared.role === "student"
            ? `admission no. ${prepared.admissionNo}`
            : `staff ID ${prepared.staffId}`
        }. Review and approve it in Manage → Team.`,
        `/campus/${prepared.orgSlug}/manage`,
      ),
    ),
  );

  await writeAudit(userId, "school.join.request", membership.id, {
    organizationId: prepared.organizationId,
    role: prepared.role,
    admissionNo: prepared.admissionNo,
    staffId: prepared.staffId,
  });

  return membership;
}
