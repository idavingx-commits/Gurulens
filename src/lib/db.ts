import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma client for PostgreSQL (Neon).
 *
 * The client is created lazily so that importing a module that touches the
 * database does not require DATABASE_URL at build time (Next.js may evaluate
 * modules during `next build`). At runtime the connection string is read from
 * the Worker secret / local .env.local.
 *
 * A driver adapter (`@prisma/adapter-pg`) is required because the native Prisma
 * query engine cannot run inside Cloudflare Workers.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Add the Neon pooled connection string to .env.local locally or as a Worker secret in production.",
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Lazy proxy so `db.user.findMany()` keeps working exactly as before while the
 * underlying client is only constructed on first use.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property);

    if (typeof value === "function") {
      return value.bind(client);
    }

    return value;
  },
  has(_target, property) {
    return property in getPrismaClient();
  },
});
