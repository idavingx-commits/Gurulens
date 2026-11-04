import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";

import { CSRF_HEADER, SESSION_COOKIE, SESSION_TTL_DAYS, type Role } from "@/lib/constants";
import { db } from "@/lib/db";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  avatarKey: string | null;
  mfaEnabled: boolean;
};

export type AuthContext = {
  user: SessionUser;
  sessionId: string;
  csrfToken: string;
};

const BCRYPT_ROUNDS = 11;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<{ token: string; csrfToken: string; expiresAt: Date }> {
  const token = generateToken();
  const csrfToken = generateToken(16);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      csrfToken,
      userId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      ip: meta.ip ?? null,
    },
  });

  return { token, csrfToken, expiresAt };
}

export async function setSessionCookie(
  token: string,
  expiresAt: Date,
  csrfToken: string,
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  // Readable double-submit token for the browser to echo in the CSRF header.
  store.set("gl_csrf", csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  store.set("gl_csrf", "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.session.delete({ where: { id: sessionId } }).catch(() => undefined);
}

/**
 * Resolve the current user from the session cookie.
 * Cached per request so layouts/pages/route handlers share one lookup.
 */
export const getAuth = cache(async (): Promise<AuthContext | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          avatarKey: true,
          mfaEnabled: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await destroySession(session.id);
    return null;
  }

  if (session.user.status !== "active") return null;

  // Sliding renewal: extend when less than half the TTL remains.
  const half = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000 * 0.5;
  if (session.expiresAt.getTime() - Date.now() < half) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
    await db.session
      .update({ where: { id: session.id }, data: { expiresAt } })
      .catch(() => undefined);
  }

  return {
    user: { ...session.user, role: session.user.role as Role },
    sessionId: session.id,
    csrfToken: session.csrfToken,
  };
});

export async function getCurrentUser(): Promise<SessionUser | null> {
  const auth = await getAuth();
  return auth?.user ?? null;
}

export function hasRole(user: { role: Role } | null | undefined, roles: readonly Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export { CSRF_HEADER };
