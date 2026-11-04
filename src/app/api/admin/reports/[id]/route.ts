import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit } from "@/lib/audit";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { adminReportActionSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req, ADMIN_ROLES);
  const { id } = await ctx.params;
  const body = await parseBody(req, adminReportActionSchema);

  const report = await db.report.findUnique({
    where: { id },
    select: { id: true, status: true, reporterId: true, targetType: true },
  });
  if (!report) throw new ApiError(404, "Report not found.", "not_found");
  if (report.status !== "open" && report.status !== "in_review") {
    throw new ApiError(400, "This report has already been handled.", "already_handled");
  }

  await db.report.update({
    where: { id },
    data: {
      status: body.action === "resolve" ? "resolved" : "dismissed",
      resolutionNote: body.note?.trim() || null,
      handledById: auth.user.id,
    },
  });

  await notify(
    report.reporterId,
    "report",
    body.action === "resolve" ? "Thanks — we acted on your report" : "Your report was reviewed",
    body.action === "resolve"
      ? body.note?.trim() || "The moderation team reviewed your report and took action."
      : body.note?.trim() || "After review, the reported content did not break our guidelines.",
    null,
  );

  await writeAudit(auth.user.id, `report.${body.action}`, id, {
    targetType: report.targetType,
    note: body.note ?? null,
  });

  return ok({ handled: true });
});
