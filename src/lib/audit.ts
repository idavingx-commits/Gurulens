import { db } from "@/lib/db";

/**
 * Append-only audit trail for admin / high-risk actions.
 * Never throws into callers; failures are logged.
 */
export async function writeAudit(
  actorId: string,
  action: string,
  targetRef?: string | null,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId,
        action,
        targetRef: targetRef ?? null,
        meta: meta ? JSON.stringify(meta).slice(0, 4000) : null,
      },
    });
  } catch (err) {
    console.error("[audit:error]", err);
  }
}

export async function writeModerationAction(
  actorId: string,
  targetType: string,
  targetId: string,
  action: string,
  reason?: string | null,
): Promise<void> {
  try {
    await db.moderationAction.create({
      data: { actorId, targetType, targetId, action, reason: reason ?? null },
    });
  } catch (err) {
    console.error("[moderation:error]", err);
  }
}

export async function notify(
  userId: string,
  type: string,
  title: string,
  body?: string | null,
  link?: string | null,
): Promise<void> {
  try {
    await db.notification.create({
      data: { userId, type, title, body: body ?? null, link: link ?? null },
    });
  } catch (err) {
    console.error("[notify:error]", err);
  }
}
