import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { profileUpdateSchema } from "@/lib/validation";

export const PATCH = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, profileUpdateSchema);

  const data: { name?: string; avatarKey?: string | null } = {};

  if (body.name !== undefined) data.name = body.name;

  if (body.avatarMediaId !== undefined) {
    if (body.avatarMediaId === null) {
      data.avatarKey = null;
    } else {
      const media = await db.media.findUnique({
        where: { id: body.avatarMediaId },
        select: { id: true, ownerId: true, kind: true },
      });
      if (!media || media.ownerId !== auth.user.id || media.kind !== "avatar") {
        throw new ApiError(400, "Invalid avatar image.", "bad_avatar");
      }
      data.avatarKey = media.id;
    }
  }

  if (Object.keys(data).length > 0) {
    await db.user.update({ where: { id: auth.user.id }, data });
  }

  const t = body.teacher;
  if (t) {
    if (auth.user.role !== "teacher") {
      throw new ApiError(403, "Only teachers can update teacher profile fields.", "forbidden");
    }
    const profile = await db.teacherProfile.findUnique({
      where: { userId: auth.user.id },
      select: { id: true },
    });
    if (!profile) throw new ApiError(404, "Teacher profile not found.", "not_found");

    let coverKey: string | null | undefined;
    if (t.coverMediaId !== undefined) {
      if (t.coverMediaId === null) {
        coverKey = null;
      } else {
        const media = await db.media.findUnique({
          where: { id: t.coverMediaId },
          select: { id: true, ownerId: true, kind: true },
        });
        if (!media || media.ownerId !== auth.user.id || media.kind !== "cover") {
          throw new ApiError(400, "Invalid cover image.", "bad_cover");
        }
        coverKey = media.id;
      }
    }

    await db.$transaction(async (tx) => {
      await tx.teacherProfile.update({
        where: { id: profile.id },
        data: {
          ...(t.tagline !== undefined ? { tagline: t.tagline } : {}),
          ...(t.bio !== undefined ? { bio: t.bio } : {}),
          ...(t.mode !== undefined ? { mode: t.mode } : {}),
          ...(t.experienceYears !== undefined ? { experienceYears: t.experienceYears } : {}),
          ...(t.qualifications !== undefined ? { qualifications: t.qualifications } : {}),
          ...(t.contactPhone !== undefined ? { contactPhone: t.contactPhone } : {}),
          ...(t.contactEmail !== undefined ? { contactEmail: t.contactEmail } : {}),
          ...(t.whatsapp !== undefined ? { whatsapp: t.whatsapp } : {}),
          ...(t.consentPublic !== undefined ? { consentPublic: t.consentPublic } : {}),
          ...(coverKey !== undefined ? { coverKey } : {}),
        },
      });

      if (t.subjects !== undefined) {
        const found = await tx.subject.findMany({
          where: { slug: { in: t.subjects } },
          select: { id: true },
        });
        if (found.length !== t.subjects.length) {
          throw new ApiError(400, "One or more subjects are invalid.", "bad_subject");
        }
        await tx.teacherSubject.deleteMany({ where: { teacherId: profile.id } });
        await tx.teacherSubject.createMany({
          data: found.map((f) => ({ teacherId: profile.id, subjectId: f.id })),
        });
      }

      if (t.districts !== undefined) {
        const found = await tx.district.findMany({
          where: { slug: { in: t.districts } },
          select: { id: true },
        });
        if (found.length !== t.districts.length) {
          throw new ApiError(400, "One or more districts are invalid.", "bad_district");
        }
        await tx.teacherDistrict.deleteMany({ where: { teacherId: profile.id } });
        await tx.teacherDistrict.createMany({
          data: found.map((f) => ({ teacherId: profile.id, districtId: f.id })),
        });
      }

      if (t.grades !== undefined) {
        const found = await tx.grade.findMany({
          where: { slug: { in: t.grades } },
          select: { id: true },
        });
        if (found.length !== t.grades.length) {
          throw new ApiError(400, "One or more grades are invalid.", "bad_grade");
        }
        await tx.teacherGrade.deleteMany({ where: { teacherId: profile.id } });
        await tx.teacherGrade.createMany({
          data: found.map((f) => ({ teacherId: profile.id, gradeId: f.id })),
        });
      }

      if (t.languages !== undefined) {
        const found = await tx.language.findMany({
          where: { slug: { in: t.languages } },
          select: { id: true },
        });
        if (found.length !== t.languages.length) {
          throw new ApiError(400, "One or more languages are invalid.", "bad_language");
        }
        await tx.teacherLanguage.deleteMany({ where: { teacherId: profile.id } });
        await tx.teacherLanguage.createMany({
          data: found.map((f) => ({ teacherId: profile.id, languageId: f.id })),
        });
      }
    });
  }

  await writeAudit(auth.user.id, "profile.update", auth.user.id, {
    fields: [...Object.keys(data), ...(t ? ["teacher"] : [])],
  });

  return ok({ updated: true });
});
