/**
 * Seed subscription plans for GuruLens.
 * Run with: npx tsx prisma/seed-plans.ts
 *
 * Launch period: every plan is priced at LKR 0 ("Free for now") until Sri
 * Lankan payments are finalised. Admins can set real prices later from
 * /admin/plans without touching this file. Feature keys match
 * src/lib/plan-catalog.ts; admins may also add brand-new keys at runtime.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to run the seed script.");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const TEACHER_BASE = [
  "public_profile",
  "basic_posts",
  "basic_quizzes",
  "enrollment_codes",
  "class_management",
];

const INSTITUTE_BASE = [
  ...TEACHER_BASE,
  "voice_messages",
  "scheduled_posts",
  "custom_branding",
  "multi_teacher",
  "institute_dashboard",
  "fee_tracking",
  "attendance_tracking",
  "basic_reports",
];

const CAMPUS_BASE = [
  "public_profile",
  "basic_posts",
  "basic_quizzes",
  "school_dashboard",
  "grade_management",
  "class_management",
  "attendance_tracking",
  "timetable_management",
  "student_id_verification",
  "school_channels",
  "parent_portal",
  "basic_reports",
];

const PLANS = [
  {
    name: "GuruLens Free",
    slug: "free",
    description: "Everything one teacher needs to get started — free forever.",
    type: "free",
    priceLkr: 0,
    billingCycle: "lifetime",
    limits: JSON.stringify({
      channels: 3,
      classes: 5,
      storage_mb: 500,
      students_per_class: 30,
    }),
    features: JSON.stringify([
      "public_profile",
      "basic_posts",
      "basic_quizzes",
      "enrollment_codes",
    ]),
    sortOrder: 0,
  },
  {
    name: "GuruLens Teacher Plus",
    slug: "teacher_plus",
    description: "Growing teachers who run several classes and channels.",
    type: "teacher",
    priceLkr: 0,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: 6,
      classes: 12,
      storage_mb: 2048,
      students_per_class: 60,
    }),
    features: JSON.stringify([
      ...TEACHER_BASE,
      "voice_messages",
      "scheduled_posts",
      "custom_branding",
      "priority_support",
    ]),
    sortOrder: 1,
  },
  {
    name: "GuruLens Teacher Pro",
    slug: "teacher_pro",
    description: "For professional private tuition teachers.",
    type: "teacher_pro",
    priceLkr: 0,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: 10,
      classes: 20,
      storage_mb: 5000,
      students_per_class: 100,
    }),
    features: JSON.stringify([
      ...TEACHER_BASE,
      "voice_messages",
      "scheduled_posts",
      "custom_branding",
      "advanced_analytics",
      "priority_support",
      "early_access",
    ]),
    sortOrder: 2,
  },
  {
    name: "GuruLens Teacher Elite",
    slug: "teacher_elite",
    description: "Full-time educators who want every teaching tool unlocked.",
    type: "teacher",
    priceLkr: 0,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: 25,
      classes: 60,
      storage_mb: 20480,
      students_per_class: 250,
    }),
    features: JSON.stringify([
      ...TEACHER_BASE,
      "voice_messages",
      "scheduled_posts",
      "custom_branding",
      "advanced_analytics",
      "advanced_reports",
      "data_export",
      "priority_support",
      "dedicated_support",
      "early_access",
    ]),
    sortOrder: 3,
  },
  {
    name: "GuruLens Institute Starter",
    slug: "institute_starter",
    description: "Small institutes bringing their first teachers online.",
    type: "institute",
    priceLkr: 0,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: 10,
      classes: 25,
      storage_mb: 10240,
      students_per_class: 150,
      teachers: 5,
      branches: 2,
    }),
    features: JSON.stringify([...INSTITUTE_BASE, "multi_branch"]),
    sortOrder: 4,
  },
  {
    name: "GuruLens Institute",
    slug: "institute",
    description: "For tuition institutes with multiple teachers.",
    type: "institute",
    priceLkr: 0,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: 25,
      classes: 50,
      storage_mb: 20000,
      students_per_class: 200,
      teachers: 10,
      branches: 3,
    }),
    features: JSON.stringify([
      ...INSTITUTE_BASE,
      "multi_branch",
      "advanced_analytics",
      "data_export",
      "priority_support",
    ]),
    sortOrder: 5,
  },
  {
    name: "GuruLens Institute Plus",
    slug: "institute_plus",
    description: "For large institutes with multiple branches.",
    type: "institute_plus",
    priceLkr: 0,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: 100,
      classes: 200,
      storage_mb: 100000,
      students_per_class: 500,
      teachers: 50,
      branches: 10,
    }),
    features: JSON.stringify([
      ...INSTITUTE_BASE,
      "multi_branch",
      "advanced_analytics",
      "advanced_reports",
      "data_export",
      "api_access",
      "priority_support",
      "onboarding_training",
      "early_access",
    ]),
    sortOrder: 6,
  },
  {
    name: "GuruLens Institute Elite",
    slug: "institute_elite",
    description: "Nationwide institute networks — unlimited room to grow.",
    type: "institute",
    priceLkr: 0,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: -1,
      classes: -1,
      storage_mb: 204800,
      students_per_class: 1000,
      teachers: 100,
      branches: 25,
    }),
    features: JSON.stringify([
      ...INSTITUTE_BASE,
      "multi_branch",
      "advanced_analytics",
      "advanced_reports",
      "data_export",
      "api_access",
      "white_label",
      "audit_logs",
      "dedicated_support",
      "onboarding_training",
      "early_access",
    ]),
    sortOrder: 7,
  },
  {
    name: "GuruLens Campus Starter",
    slug: "campus_starter",
    description: "Schools taking their first step digital — timetables included.",
    type: "campus",
    priceLkr: 0,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: 20,
      classes: 40,
      storage_mb: 20480,
      students: 300,
      teachers: 15,
      grades: 13,
    }),
    features: JSON.stringify([...CAMPUS_BASE, "events_calendar"]),
    sortOrder: 8,
  },
  {
    name: "GuruLens Campus Pilot",
    slug: "campus_pilot",
    description: "For schools starting their digital journey.",
    type: "campus_pilot",
    priceLkr: 0,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: 50,
      classes: 100,
      storage_mb: 50000,
      students: 500,
      teachers: 30,
      grades: 13,
    }),
    features: JSON.stringify([
      ...CAMPUS_BASE,
      "advanced_analytics",
      "events_calendar",
      "clubs_societies",
      "priority_support",
    ]),
    sortOrder: 9,
  },
  {
    name: "GuruLens Campus Pro",
    slug: "campus_pro",
    description: "Complete school management solution.",
    type: "campus_pro",
    priceLkr: 0,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: -1,
      classes: -1,
      storage_mb: 500000,
      students: -1,
      teachers: -1,
      grades: 13,
    }),
    features: JSON.stringify([
      ...CAMPUS_BASE,
      "advanced_analytics",
      "advanced_reports",
      "data_export",
      "examination_management",
      "results_management",
      "clubs_societies",
      "events_calendar",
      "notice_approval",
      "audit_logs",
      "bulk_student_import",
      "api_access",
      "dedicated_support",
      "early_access",
    ]),
    sortOrder: 10,
  },
  {
    name: "GuruLens Campus Elite",
    slug: "campus_elite",
    description: "The whole school, every tool, unlimited everything.",
    type: "campus",
    priceLkr: 0,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: -1,
      classes: -1,
      storage_mb: 1000000,
      students: -1,
      teachers: -1,
      grades: -1,
    }),
    features: JSON.stringify([
      ...CAMPUS_BASE,
      "advanced_analytics",
      "advanced_reports",
      "data_export",
      "examination_management",
      "results_management",
      "clubs_societies",
      "events_calendar",
      "notice_approval",
      "audit_logs",
      "bulk_student_import",
      "sms_notifications",
      "api_access",
      "white_label",
      "custom_domain",
      "dedicated_support",
      "onboarding_training",
      "early_access",
    ]),
    sortOrder: 11,
  },
];

async function main() {
  console.log("Seeding subscription plans (launch pricing: all free)...");

  for (const plan of PLANS) {
    const existing = await db.plan.findUnique({
      where: { slug: plan.slug },
    });

    if (existing) {
      console.log(`  Plan "${plan.name}" already exists, updating...`);
      await db.plan.update({
        where: { slug: plan.slug },
        data: { ...plan, isActive: true },
      });
    } else {
      console.log(`  Creating plan "${plan.name}"...`);
      await db.plan.create({ data: { ...plan, isActive: true } });
    }
  }

  const count = await db.plan.count();
  console.log(`\n✓ ${count} plans in database`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
