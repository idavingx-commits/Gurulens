/**
 * One-off cleanup of this round's smoke-test artifacts (round 3, 2026-11-23).
 * Run: npx tsx scripts/cleanup-smoke-round3.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

const EMAILS = [
  "smoke.a.1795445478@example.com",
  "smoke.b.1795445478@example.com",
  "smoke.student.1795444705383@example.com",
];

async function main() {
  for (const email of EMAILS) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.log("absent:", email);
      continue;
    }
    await db.channel.deleteMany({ where: { ownerId: user.id, ownerType: "user" } });
    await db.media.deleteMany({ where: { ownerId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    console.log("deleted user:", email);
  }

  const classes = await db.schoolClass.findMany({
    where: { name: { startsWith: "Smoke 10-A" } },
    select: { id: true, name: true },
  });
  for (const c of classes) {
    await db.schoolClass.delete({ where: { id: c.id } });
    console.log("deleted class:", c.name);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
