import { SectionHeader, Stat } from "@/components/ui/primitives";
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
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Deletion requests"
        subtitle="Channels with many followers and campuses can only be removed after a moderator approves. Review each request carefully — approval is permanent."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Pending review"
          value={pending}
          icon="clock"
          tone={pending > 0 ? "warn" : "default"}
        />
        <Stat label="Approved" value={approved} icon="check" />
        <Stat label="Rejected" value={rejected} icon="x" />
        <Stat label="Total tracked" value={requests.length} icon="inbox" />
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
