/**
 * Seed subscription plans for GuruLens
 * Run with: npx tsx prisma/seed-plans.ts
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

const PLANS = [
  {
    name: "GuruLens Free",
    slug: "free",
    description: "Perfect for teachers just getting started",
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
    name: "GuruLens Teacher Pro",
    slug: "teacher_pro",
    description: "For professional private tuition teachers",
    type: "teacher_pro",
    priceLkr: 1500,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: 10,
      classes: 20,
      storage_mb: 5000,
      students_per_class: 100,
    }),
    features: JSON.stringify([
      "public_profile",
      "basic_posts",
      "basic_quizzes",
      "enrollment_codes",
      "advanced_analytics",
      "priority_support",
      "custom_branding",
      "voice_messages",
      "scheduled_posts",
    ]),
    sortOrder: 1,
  },
  {
    name: "GuruLens Institute",
    slug: "institute",
    description: "For tuition institutes with multiple teachers",
    type: "institute",
    priceLkr: 5000,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: 25,
      classes: 50,
      storage_mb: 20000,
      students_per_class: 200,
      teachers: 10,
      branches: 1,
    }),
    features: JSON.stringify([
      "public_profile",
      "basic_posts",
      "basic_quizzes",
      "enrollment_codes",
      "advanced_analytics",
      "priority_support",
      "custom_branding",
      "voice_messages",
      "scheduled_posts",
      "multi_teacher",
      "institute_dashboard",
      "fee_tracking",
    ]),
    sortOrder: 2,
  },
  {
    name: "GuruLens Institute Plus",
    slug: "institute_plus",
    description: "For large institutes with multiple branches",
    type: "institute_plus",
    priceLkr: 15000,
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
      "public_profile",
      "basic_posts",
      "basic_quizzes",
      "enrollment_codes",
      "advanced_analytics",
      "priority_support",
      "custom_branding",
      "voice_messages",
      "scheduled_posts",
      "multi_teacher",
      "institute_dashboard",
      "fee_tracking",
      "multi_branch",
      "api_access",
      "white_label",
    ]),
    sortOrder: 3,
  },
  {
    name: "GuruLens Campus Pilot",
    slug: "campus_pilot",
    description: "For schools starting their digital journey",
    type: "campus_pilot",
    priceLkr: 10000,
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
      "school_dashboard",
      "grade_management",
      "class_management",
      "attendance_tracking",
      "school_channels",
      "parent_portal",
      "basic_reports",
    ]),
    sortOrder: 4,
  },
  {
    name: "GuruLens Campus Pro",
    slug: "campus_pro",
    description: "Complete school management solution",
    type: "campus_pro",
    priceLkr: 50000,
    billingCycle: "monthly",
    limits: JSON.stringify({
      channels: -1, // unlimited
      classes: -1,
      storage_mb: 500000,
      students: -1,
      teachers: -1,
      grades: 13,
    }),
    features: JSON.stringify([
      "school_dashboard",
      "grade_management",
      "class_management",
      "attendance_tracking",
      "school_channels",
      "parent_portal",
      "basic_reports",
      "advanced_reports",
      "examination_management",
      "results_management",
      "clubs_societies",
      "events_calendar",
      "notice_approval",
      "audit_logs",
      "api_access",
      "dedicated_support",
    ]),
    sortOrder: 5,
  },
];

async function main() {
  console.log("Seeding subscription plans...");

  for (const plan of PLANS) {
    const existing = await db.plan.findUnique({
      where: { slug: plan.slug },
    });

    if (existing) {
      console.log(`  Plan "${plan.name}" already exists, updating...`);
      await db.plan.update({
        where: { slug: plan.slug },
        data: plan,
      });
    } else {
      console.log(`  Creating plan "${plan.name}"...`);
      await db.plan.create({ data: plan });
    }
  }

  // Verify
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
