import { PrismaClient } from "@prisma/client";

const VALID_ROLES = ["student", "teacher", "moderator", "admin"] as const;

async function main() {
  const [emailArg, roleArg = "admin"] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  const role = roleArg.trim().toLowerCase();

  if (!email || !(VALID_ROLES as readonly string[]).includes(role)) {
    console.error(
      "Usage: npx tsx scripts/set-role.ts <email> [student|teacher|moderator|admin]",
    );
    process.exit(1);
  }

  const db = new PrismaClient();
  try {
    const user = await db.user
      .update({ where: { email }, data: { role } })
      .catch(() => null);

    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }
    console.log(`OK — ${user.name} <${user.email}> is now "${user.role}".`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
