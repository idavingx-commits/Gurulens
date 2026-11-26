import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { approveDeletionRequest, rejectDeletionRequest } from "@/lib/deletion";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export const POST = route(async (req: NextRequest, ctx) => {
  const auth = await requireAuth(req, ["admin", "moderator"]);
  const { id } = await ctx.params;

  const body = await parseBody(req, bodySchema);
  if (body.action === "reject" && !(body.note && body.note.trim().length > 0)) {
    throw new ApiError(400, "A reason is required to reject.", "reason_required");
  }

  if (body.action === "approve") {
    await approveDeletionRequest(id, auth.user.id, body.note ?? null);
  } else {
    await rejectDeletionRequest(id, auth.user.id, body.note!.trim());
  }

  return ok({ reviewed: true });
});
