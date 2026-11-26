import { type NextRequest } from "next/server";

import { ok, requireAuth, route } from "@/lib/api";
import { db } from "@/lib/db";

export const GET = route(async (req: NextRequest) => {
  const auth = await requireAuth(req, ["admin", "moderator"]);
  void auth;

  const requests = await db.deletionRequest.findMany({
    where: { status: { in: ["pending", "approved", "rejected"] } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  return ok({ requests });
});
