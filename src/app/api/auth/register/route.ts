import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, route } from "@/lib/api";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { notify } from "@/lib/audit";
import { db } from "@/lib/db";
import { isMailConfigured, sendEmail, verificationEmailHtml } from "@/lib/mail";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { commitSchoolMembership, prepareSchoolRegistration } from "@/lib/school";
import { createSubscription } from "@/lib/subscriptions";
import { isAgeEligible, registerStudentSchema, registerTeacherSchema } from "@/lib/validation";
import { issueCode, normalizeLkPhone } from "@/lib/verification";
import { z } from "zod";

const bodySchema = z.discriminatedUnion("role", [
  registerStudentSchema.extend({ role: z.literal("student") }),
  registerTeacherSchema.extend({ role: z.literal("teacher") }),
]);

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    throw new ApiError(429, "Too many sign-up attempts. Please try again later.", "rate_limited");
  }

  const body = await parseBody(req, bodySchema);

  if (!isAgeEligible(body.dateOfBirth, 13)) {
    throw new ApiError(
      400,
      "You must be at least 13 years old to create an account. Younger learners can ask a parent or guardian to manage an account.",
      "age",
    );
  }

  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists.", "email_taken");
  }

  // Teachers may add a mobile number at signup. It is stored unverified — no
  // OTP is requested during registration; email is the only signup gate.
  let phone: string | null = null;
  if (body.role === "teacher" && body.phone) {
    phone = normalizeLkPhone(body.phone);
    if (!phone) {
      throw new ApiError(
        400,
        "Enter a valid Sri Lankan mobile number (e.g. 077 123 4567).",
        "bad_phone",
      );
    }
    const phoneTaken = await db.user.findUnique({ where: { phone }, select: { id: true } });
    if (phoneTaken) {
      throw new ApiError(409, "This phone number is already linked to another account.", "phone_taken");
    }
  }

  // Validate the optional school registration BEFORE creating the account so
  // a taken admission/staff ID never leaves an orphan user behind.
  const schoolPrep = body.school
    ? await prepareSchoolRegistration({
        organizationId: body.school.organizationId,
        role: body.role === "student" ? "student" : "teacher",
        admissionNo: body.school.admissionNo,
        indexNo: body.school.indexNo,
        staffId: body.school.staffId,
        schoolClassId: body.school.schoolClassId,
      })
    : null;

  const passwordHash = await hashPassword(body.password);

  let userId: string;

  if (body.role === "student") {
    const user = await db.user.create({
      data: {
        email: body.email,
        passwordHash,
        role: "student",
        name: body.name,
        dateOfBirth: body.dateOfBirth,
        ageEligible: true,
      },
    });
    userId = user.id;
    await notify(
      user.id,
      "welcome",
      "Welcome to GuruLens! 🎓",
      "Explore trusted teachers, follow their lessons and share your learning experience.",
      "/explore",
    );
  } else {
    const handleTaken = await db.teacherProfile.findUnique({ where: { handle: body.handle } });
    if (handleTaken) {
      throw new ApiError(409, "This handle is already taken. Try another one.", "handle_taken");
    }

    const [subjects, districts, grades, languages] = await Promise.all([
      db.subject.findMany({ where: { slug: { in: body.subjects } } }),
      db.district.findMany({ where: { slug: { in: body.districts } } }),
      db.grade.findMany({ where: { slug: { in: body.grades } } }),
      db.language.findMany({ where: { slug: { in: body.languages } } }),
    ]);

    if (subjects.length !== body.subjects.length) {
      throw new ApiError(400, "One or more selected subjects are invalid.", "bad_subjects");
    }
    if (districts.length !== body.districts.length) {
      throw new ApiError(400, "One or more selected districts are invalid.", "bad_districts");
    }
    if (grades.length !== body.grades.length) {
      throw new ApiError(400, "One or more selected grades are invalid.", "bad_grades");
    }
    if (languages.length !== body.languages.length) {
      throw new ApiError(400, "One or more selected languages are invalid.", "bad_languages");
    }

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: body.email,
          passwordHash,
          role: "teacher",
          name: body.name,
          dateOfBirth: body.dateOfBirth,
          phone,
          ageEligible: true,
        },
      });

      const profile = await tx.teacherProfile.create({
        data: {
          userId: created.id,
          handle: body.handle,
          tagline: body.tagline ?? null,
          bio: body.bio ?? null,
          mode: body.mode,
          experienceYears: body.experienceYears ?? null,
          qualifications: body.qualifications ?? null,
          consentPublic: true,
        },
      });

      await tx.teacherSubject.createMany({
        data: subjects.map((s) => ({ teacherId: profile.id, subjectId: s.id })),
      });
      await tx.teacherDistrict.createMany({
        data: districts.map((d) => ({ teacherId: profile.id, districtId: d.id })),
      });
      await tx.teacherGrade.createMany({
        data: grades.map((g) => ({ teacherId: profile.id, gradeId: g.id })),
      });
      await tx.teacherLanguage.createMany({
        data: languages.map((l) => ({ teacherId: profile.id, languageId: l.id })),
      });

      return created;
    });

    userId = user.id;
    await notify(
      user.id,
      "welcome",
      "Welcome to GuruLens Studio! 🎬",
      "Complete your profile and request verification to earn the Verified Teacher badge.",
      "/studio/verification",
    );
  }

  if (schoolPrep) {
    await commitSchoolMembership(userId, body.name, schoolPrep);
  }

  // Auto-activate the free launch plan the teacher chose on the signup screen.
  // A failure here never blocks account creation.
  let activatedPlan: string | null = null;
  if (body.role === "teacher" && body.planSlug) {
    const plan = await db.plan.findUnique({ where: { slug: body.planSlug } });
    const teacherPlan =
      plan &&
      plan.isActive &&
      plan.priceLkr === 0 &&
      ["free", "teacher", "teacher_pro"].includes(plan.type);
    if (teacherPlan && plan) {
      await createSubscription({ userId, planSlug: plan.slug, status: "active" }).catch(() => null);
      activatedPlan = plan.slug;
    }
  }

  const session = await createSession(userId, {
    userAgent: req.headers.get("user-agent"),
    ip,
  });
  await setSessionCookie(session.token, session.expiresAt, session.csrfToken);

  // Email verification code for the new account.
  const code = await issueCode("email_signup", { userId, email: body.email });
  await sendEmail({
    to: body.email,
    subject: "Your GuruLens verification code",
    html: verificationEmailHtml(code),
  });

  return ok({
    userId,
    role: body.role,
    planSlug: activatedPlan,
    schoolPending: Boolean(schoolPrep),
    emailVerified: false,
    devCode:
      !isMailConfigured() && process.env.NODE_ENV !== "production" ? code : undefined,
  });
});
