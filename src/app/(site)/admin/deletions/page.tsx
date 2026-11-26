import { SectionHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { DeletionRequestsPanel } from "@/components/admin/DeletionRequestsPanel";

export const metadata = { title: "Deletion requests · Admin" };

export default async function AdminDeletionsPage() {
  const requests = await db.deletionRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Deletion requests"
        subtitle="Channels with many followers and campuses can only be removed after a moderator approves. Review each request carefully — approval is permanent."
      />
      <div className="rounded-2xl border border-ink-100 bg-white/70 p-4 text-[13px] text-ink-600">
        <span className="font-bold text-ink-900">{pending}</span> pending review ·{" "}
        <span className="font-bold text-ink-900">{requests.length}</span> total tracked.
      </div>
      <DeletionRequestsPanel
        initial={requests.map((r) => ({
          id: r.id,
          targetType: r.targetType,
          targetId: r.targetId,
          targetLabel: r.targetLabel,
          status: r.status,
          reason: r.reason,
          reviewNote: r.reviewNote,
          createdAt: r.createdAt.toISOString(),
          decidedAt: r.decidedAt?.toISOString() ?? null,
          requestedBy: r.requestedBy,
          reviewedBy: r.reviewedBy,
        }))}
      />
      <p className="text-[11.5px] text-ink-400">
        Requested {pending === 0 ? "none pending" : `${pending} pending`} · Last update{" "}
        {requests[0] ? timeAgo(requests[0].createdAt) : "—"}
      </p>
    </div>
  );
}
