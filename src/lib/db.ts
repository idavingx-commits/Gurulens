import { PrismaClient } from "@prisma/client";

import { neonAdapter } from "@/lib/db-adapter";

/**
 * Prisma client for PostgreSQL (Neon).
 *
 * A driver adapter is required because the native Prisma query engine cannot
 * run inside Cloudflare Workers. `@/lib/db-adapter` uses Neon's stateless HTTP
 * driver for ordinary queries and a short-lived WebSocket only for
 * transactions, so this module-level client never carries an I/O object from
 * one Worker request into another. (Cloudflare rejects cross-request I/O; a
 * WebSocket pool cached at module scope is not safe here.)
 *
 * The client is created lazily so that importing a module that touches the
 * database does not require DATABASE_URL at build time (Next.js may evaluate
 * modules during `next build`). At runtime the connection string is read from
 * the Worker secret / local `.env.local`.
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Add the Neon pooled connection string to .env.local locally or as a Worker secret in production.",
    );
  }

  return new PrismaClient({
    adapter: neonAdapter(connectionString),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

let client: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (!client) client = createPrismaClient();
  return client;
}

/**
 * Lazy proxy so `db.user.findMany()` keeps working exactly as before while the
 * underlying client is only constructed on first use.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const prisma = getPrismaClient();
    const value = Reflect.get(prisma, property);

    if (typeof value === "function") {
      return value.bind(prisma);
    }

    return value;
  },
  has(_target, property) {
    return property in getPrismaClient();
  },
});
