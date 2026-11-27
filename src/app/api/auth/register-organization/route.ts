import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, route } from "@/lib/api";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { notify } from "@/lib/audit";
import { db } from "@/lib/db";
import { normalizeSubdomain, validateSubdomain } from "@/lib/lms";
import { isMailConfigured, sendEmail, verificationEmailHtml } from "@/lib/mail";
import { orgQuotaDefaults } from "@/lib/organizations";
import { planAudience } from "@/lib/plan-catalog";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSubscription } from "@/lib/subscriptions";
import {
  isAgeEligible,
  registerOrganizationSchema,
} from "@/lib/validation";
import { issueCode, normalizeLkPhone } from "@/lib/verification";

/** Build a unique public teacher handle for the organization owner. */
async function uniqueHandle(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24)
      .replace(/-+$/g, "") || "school";
  for (let attempt = 0; attempt < 8; attempt++) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const handle = `${base.slice(0, 30 - suffix.length)}${suffix}`;
    const taken = await db.teacherProfile.findUnique({
      where: { handle },
      select: { id: true },
    });
    if (!taken) return handle;
  }
  return `org-${Date.now().toString(36)}`.slice(0, 30);
}

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  const limit = rateLimit(`register-org:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    throw new ApiError(429, "Too many sign-up attempts. Please try again later.", "rate_limited");
  }

  const body = await parseBody(req, registerOrganizationSchema);

  if (!isAgeEligible(body.owner.dateOfBirth, 13)) {
    throw new ApiError(
      400,
      "You must be at least 13 years old to create an account. Younger learners can ask a parent or guardian to manage an account.",
      "age",
    );
  }

  const emailTaken = await db.user.findUnique({
    where: { email: body.owner.email },
    select: { id: true },
  });
  if (emailTaken) {
    throw new ApiError(409, "An account with this email already exists.", "email_taken");
  }

  let phone: string | null = null;
  if (body.owner.phone) {
    phone = normalizeLkPhone(body.owner.phone);
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

  const subdomainProblem = validateSubdomain(body.lmsSubdomain);
  if (subdomainProblem) throw new ApiError(400, subdomainProblem, "bad_subdomain");
  const subdomain = normalizeSubdomain(body.lmsSubdomain);

  const [orgSlugTaken, subdomainTaken] = await Promise.all([
    db.organization.findUnique({
      where: { slug: body.organization.slug },
      select: { id: true },
    }),
    db.lmsWorkspace.findUnique({ where: { subdomain }, select: { id: true } }),
  ]);
  if (orgSlugTaken) {
    throw new ApiError(409, "That campus URL is already taken.", "slug_taken");
  }
  if (subdomainTaken) {
    throw new ApiError(409, "That learning hub address is already taken.", "subdomain_taken");
  }

  // Launch plans are free. Paid plans must go through contact-sales until
  // Sri Lankan payments are live, so only LKR 0 plans can be activated here.
  let plan:
    | { id: string; slug: string; type: string; priceLkr: number; isActive: boolean }
    | null = null;
  if (body.planSlug) {
    const found = await db.plan.findUnique({ where: { slug: body.planSlug } });
    const audience = body.type === "school" ? "campus" : "institute";
    if (
      !found ||
      !found.isActive ||
      found.priceLkr !== 0 ||
      planAudience(found.type) !== audience
    ) {
      throw new ApiError(
        400,
        "That plan is not available for this organization. Choose a launch plan and try again.",
        "bad_plan",
      );
    }
    plan = found;
  }

  const handle = await uniqueHandle(body.owner.name);
  const passwordHash = await hashPassword(body.owner.password);

  let created: {
    userId: string;
    organization: { id: string; slug: string };
    workspace: { id: string; subdomain: string } | null;
  };

  try {
    created = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.owner.email,
          passwordHash,
          role: "teacher",
          name: body.owner.name,
          dateOfBirth: body.owner.dateOfBirth,
          phone,
          ageEligible: true,
        },
      });

      // Organization owners need a teacher profile so Studio, profile links
      // and navigation never land on a null profile. They can finish it later.
      await tx.teacherProfile.create({
        data: {
          userId: user.id,
          handle,
          mode: "both",
          consentPublic: false,
        },
      });

      const organization = await tx.organization.create({
        data: {
          type: body.type,
          name: body.organization.name,
          slug: body.organization.slug,
          nameSi: body.organization.nameSi ?? null,
          description: body.organization.description ?? null,
          email: body.organization.email ?? body.owner.email,
          phone: body.organization.phone ?? null,
          website: body.organization.website ?? null,
          address: body.organization.address ?? null,
          settings: JSON.stringify(orgQuotaDefaults(body.type)),
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "owner",
          status: "active",
          permissions: JSON.stringify(["*"]),
        },
      });

      await tx.organizationBranch.create({
        data: {
          organizationId: organization.id,
          name: "Main Branch",
          address: body.organization.address ?? null,
          phone: body.organization.phone ?? null,
          isMain: true,
        },
      });

      const workspace = await tx.lmsWorkspace.create({
        data: {
          subdomain,
          name: body.lmsName ?? body.organization.name,
          tagline: body.lmsTagline ?? null,
          description: body.organization.description ?? null,
          brandColor: body.brandColor ?? "#0094fd",
          ownerId: user.id,
          organizationId: organization.id,
        },
      });

      return {
        userId: user.id,
        organization: { id: organization.id, slug: organization.slug },
        workspace: { id: workspace.id, subdomain: workspace.subdomain },
      };
    });
  } catch (error) {
    if (isUniqueError(error)) {
      throw new ApiError(
        409,
        "Something you entered is already in use. Check the email, campus URL and learning hub address.",
        "conflict",
      );
    }
    throw error;
  }

  if (plan) {
    await createSubscription({
      userId: created.userId,
      planSlug: plan.slug,
      organizationId: created.organization.id,
      status: "active",
    }).catch(() => null);
  }

  await notify(
    created.userId,
    "welcome",
    body.type === "school" ? "Your school is on GuruLens! 🏫" : "Your institute is on GuruLens! 🎓",
    `Finish your organization profile, invite your team and publish your first course at ${
      created.workspace ? `${created.workspace.subdomain}.gurulens.us` : "/lms"
    }.`,
    `/campus/${created.organization.slug}/manage`,
  );

  const session = await createSession(created.userId, {
    userAgent: req.headers.get("user-agent"),
    ip,
  });
  await setSessionCookie(session.token, session.expiresAt, session.csrfToken);

  const code = await issueCode("email_signup", {
    userId: created.userId,
    email: body.owner.email,
  });
  await sendEmail({
    to: body.owner.email,
    subject: "Your GuruLens verification code",
    html: verificationEmailHtml(code),
  });

  return ok({
    userId: created.userId,
    role: "teacher",
    organization: created.organization,
    workspace: created.workspace,
    planSlug: plan?.slug ?? null,
    emailVerified: false,
    devCode:
      !isMailConfigured() && process.env.NODE_ENV !== "production" ? code : undefined,
  });
});
