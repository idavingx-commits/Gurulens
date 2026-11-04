import { z } from "zod";

import {
  BADGE_KEYS,
  POST_TYPES,
  REPORT_REASONS,
  ROLES,
  TEACHING_MODES,
  VERIFICATION_STATUSES,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."))
  .pipe(z.string().max(254));

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password is too long.")
  .refine((p) => /[A-Za-z]/.test(p), "Password must include at least one letter.")
  .refine((p) => /[0-9]/.test(p), "Password must include at least one number.");

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{2,29}$/, "Handle: 3-30 chars, letters, numbers and dashes only.");

export const nameSchema = z.string().trim().min(2, "Name is too short.").max(80);

export function isAgeEligible(dob: Date, minYears = 13): boolean {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - minYears);
  return dob.getTime() <= cutoff.getTime();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerStudentSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  dateOfBirth: z.coerce.date(),
  acceptTerms: z.literal(true),
});

export const registerTeacherSchema = registerStudentSchema.extend({
  handle: handleSchema,
  tagline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(600).optional(),
  mode: z.enum(TEACHING_MODES),
  subjects: z.array(z.string().trim().min(1)).min(1).max(6),
  districts: z.array(z.string().trim().min(1)).min(1).max(6),
  grades: z.array(z.string().trim().min(1)).min(1).max(10),
  languages: z.array(z.string().trim().min(1)).min(1).max(3),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  qualifications: z.string().trim().max(600).optional(),
  consentPublic: z.literal(true),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
  totp: z.string().trim().optional(),
});

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export const postSchema = z.object({
  type: z.enum(POST_TYPES),
  title: z.string().trim().max(140).optional(),
  text: z.string().trim().min(1, "Write something first.").max(5000),
  mediaIds: z.array(z.string().trim().min(1)).max(4).default([]),
  videoId: z.string().trim().min(1).optional(),
  subjectId: z.string().trim().min(1).optional(),
  gradeId: z.string().trim().min(1).optional(),
  visibility: z.enum(["public", "members"]).default("public"),
});

export const postUpdateSchema = z.object({
  title: z.string().trim().max(140).nullable().optional(),
  text: z.string().trim().min(1).max(5000).optional(),
  mediaIds: z.array(z.string().trim().min(1)).max(4).optional(),
  videoId: z.string().trim().min(1).nullable().optional(),
  subjectId: z.string().trim().min(1).nullable().optional(),
  gradeId: z.string().trim().min(1).nullable().optional(),
  visibility: z.enum(["public", "members"]).optional(),
});

export const commentSchema = z.object({
  text: z.string().trim().min(1, "Comment cannot be empty.").max(1000),
});

export const reportSchema = z.object({
  targetType: z.enum(["post", "comment", "review", "user", "quiz", "media"]),
  targetId: z.string().trim().min(1),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const reviewSchema = z.object({
  teacherId: z.string().trim().min(1),
  stars: z.coerce.number().int().min(1).max(5),
  clarity: z.coerce.number().int().min(1).max(5).optional(),
  support: z.coerce.number().int().min(1).max(5).optional(),
  organization: z.coerce.number().int().min(1).max(5).optional(),
  feedback: z.string().trim().min(10, "Please write at least 10 characters.").max(2000),
});

export const reviewReplySchema = z.object({
  reply: z.string().trim().min(1).max(1500),
});

export const claimCodeSchema = z.object({
  code: z.string().trim().min(4).max(40),
});

export const enrollmentCodeSchema = z.object({
  label: z.string().trim().max(80).optional(),
  maxUses: z.coerce.number().int().min(1).max(500).default(1),
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
});

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export const quizQuestionSchema = z
  .object({
    text: z.string().trim().min(1).max(500),
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
    correctIndex: z.coerce.number().int().min(0).max(5),
    explanation: z.string().trim().max(500).optional(),
  })
  .refine((q) => q.correctIndex < q.options.length, {
    message: "Correct answer must be one of the options.",
    path: ["correctIndex"],
  });

export const quizSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(500).optional(),
  subjectId: z.string().trim().min(1).optional(),
  gradeId: z.string().trim().min(1).optional(),
  timeLimitMin: z.coerce.number().int().min(1).max(180).optional(),
  published: z.boolean().default(false),
  questions: z.array(quizQuestionSchema).min(1).max(50),
});

export const quizAttemptSchema = z.object({
  answers: z.array(z.coerce.number().int().min(-1).max(5)).min(1).max(50),
});

// ---------------------------------------------------------------------------
// Profiles & teacher studio
// ---------------------------------------------------------------------------

export const profileUpdateSchema = z.object({
  name: nameSchema.optional(),
  avatarMediaId: z.string().trim().min(1).nullable().optional(),
  teacher: z
    .object({
      tagline: z.string().trim().max(120).optional(),
      bio: z.string().trim().max(600).optional(),
      mode: z.enum(TEACHING_MODES).optional(),
      subjects: z.array(z.string().trim().min(1)).min(1).max(6).optional(),
      districts: z.array(z.string().trim().min(1)).min(1).max(6).optional(),
      grades: z.array(z.string().trim().min(1)).min(1).max(10).optional(),
      languages: z.array(z.string().trim().min(1)).min(1).max(3).optional(),
      experienceYears: z.coerce.number().int().min(0).max(60).nullable().optional(),
      qualifications: z.string().trim().max(600).optional(),
      contactPhone: z.string().trim().max(30).optional(),
      contactEmail: z.string().trim().max(120).optional(),
      whatsapp: z.string().trim().max(30).optional(),
      consentPublic: z.boolean().optional(),
      coverMediaId: z.string().trim().min(1).nullable().optional(),
    })
    .optional(),
});

export const verificationRequestSchema = z.object({
  evidenceNote: z.string().trim().max(500).optional(),
  evidenceMediaId: z.string().trim().min(1).optional(),
});

export const tierSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
  priceLkr: z.coerce.number().int().min(0).max(1_000_000).default(0),
  perks: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
});

// ---------------------------------------------------------------------------
// Admin actions
// ---------------------------------------------------------------------------

export const adminVerificationActionSchema = z.object({
  action: z.enum(["in_review", "more_info", "approve", "reject"]),
  reason: z.string().trim().max(300).optional(),
});

export const adminUserActionSchema = z.object({
  action: z.enum(["suspend", "reactivate", "set_role"]),
  role: z.enum(ROLES).optional(),
  reason: z.string().trim().max(300).optional(),
});

export const adminReportActionSchema = z.object({
  action: z.enum(["resolve", "dismiss"]),
  note: z.string().trim().max(500).optional(),
});

export const adminModerationActionSchema = z.object({
  targetType: z.enum(["post", "comment", "review", "quiz", "media"]),
  targetId: z.string().trim().min(1),
  action: z.enum(["remove", "restore", "warn"]),
  reason: z.string().trim().max(300).optional(),
});

export const adminBadgeActionSchema = z
  .object({
    userId: z.string().trim().min(1).optional(),
    userEmail: emailSchema.optional(),
    badgeKey: z.enum([
      BADGE_KEYS.verified,
      BADGE_KEYS.highlyRated,
      BADGE_KEYS.activeEducator,
      BADGE_KEYS.communityContributor,
    ]),
    action: z.enum(["grant", "revoke"]),
    reason: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.userId || v.userEmail, {
    message: "Provide a user id or email.",
    path: ["userId"],
  });

export const adminSettingsSchema = z.object({
  values: z.record(z.string(), z.string().max(2000)),
});

export const verificationStatusSchema = z.enum(VERIFICATION_STATUSES);

export const mfaEnableSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const mfaActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setup") }),
  z.object({
    action: z.literal("enable"),
    code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
  }),
  z.object({
    action: z.literal("disable"),
    password: z.string().min(1).max(200),
  }),
]);

export const notificationActionSchema = z.object({
  action: z.literal("read_all"),
});

export const mfaVerifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});
