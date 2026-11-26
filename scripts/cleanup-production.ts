/**
 * Full production cleanup: remove every non-admin account and all
 * user-generated content, keeping ONLY admin/moderator accounts and the
 * platform's reference data (plans, subjects, grades, districts, etc.).
 *
 * Usage:
 *   npx tsx scripts/cleanup-production.ts --dry-run
 *   npx tsx scripts/cleanup-production.ts --execute
 *
 * Destructive. Run against production only when explicitly approved.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg") as { Client: typeof import("pg").Client };

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to run this script.");
}

/** Reference tables that survive the wipe. Everything else is truncated. */
const KEEP_TABLES = new Set([
  "User",
  "Setting",
  "Plan",
  "Subject",
  "District",
  "Grade",
  "Language",
  "Department",
  "Badge",
  "MembershipTier",
  "_prisma_migrations",
]);

const ADMIN_ROLES = ["admin", "moderator"];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const client = new Client({ connectionString: connectionString! });
  await client.connect();

  try {
    const adminRes = await client.query(
      `SELECT id, email, name, role FROM "User" WHERE role = ANY($1)`,
      [ADMIN_ROLES],
    );
    const adminIds = adminRes.rows.map((r) => r.id as string);
    console.log(`\nAdmin accounts to KEEP (${adminIds.length}):`);
    for (const row of adminRes.rows) {
      console.log(`  - ${row.role} ${row.email} (${row.name})`);
    }

    const tableRes = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const allTables: string[] = tableRes.rows.map((r) => r.tablename as string);
    const truncateTables = allTables.filter((t) => !KEEP_TABLES.has(t));

    console.log(`\nTables that will be truncated (${truncateTables.length}):`);
    console.log(`  ${truncateTables.join(", ")}`);

    const counts: Record<string, number> = {};
    for (const table of truncateTables) {
      try {
        const res = await client.query(`SELECT COUNT(*) AS c FROM "${table}"`);
        counts[table] = Number(res.rows[0].c);
      } catch {
        counts[table] = -1;
      }
    }
    const nonAdminCount = await client.query(
      `SELECT COUNT(*) AS c FROM "User" WHERE role <> ALL($1)`,
      [ADMIN_ROLES],
    );
    const totalNonAdmin = Number(nonAdminCount.rows[0].c);

    const totalRows = Object.values(counts).reduce((sum, n) => sum + (n > 0 ? n : 0), 0);
    console.log(`\nRows to be removed: ${totalRows} content rows + ${totalNonAdmin} non-admin users`);

    const summary = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    console.log("\nLargest tables:");
    for (const [name, n] of summary) {
      console.log(`  ${name}: ${n}`);
    }

    if (dryRun) {
      console.log("\n[DRY RUN] No changes made. Re-run with --execute to apply.");
      return;
    }

    console.log("\nExecuting full cleanup…");
    await client.query("BEGIN");
    try {
      if (truncateTables.length > 0) {
        const list = truncateTables.map((t) => `"${t}"`).join(", ");
        await client.query(`TRUNCATE ${list} CASCADE`);
      }
      await client.query(`DELETE FROM "User" WHERE role <> ALL($1)`, [ADMIN_ROLES]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    const afterAdmin = await client.query(
      `SELECT COUNT(*) AS c FROM "User" WHERE role = ANY($1)`,
      [ADMIN_ROLES],
    );
    const afterNonAdmin = await client.query(
      `SELECT COUNT(*) AS c FROM "User" WHERE role <> ALL($1)`,
      [ADMIN_ROLES],
    );
    console.log(
      `\nDone. Remaining admins: ${afterAdmin.rows[0].c}, remaining non-admins: ${afterNonAdmin.rows[0].c}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
