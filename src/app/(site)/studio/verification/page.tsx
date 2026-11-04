import { Icon } from "@/components/ui/icons";
import { InfoNote, SectionHeader } from "@/components/ui/primitives";
import { VerificationForm } from "@/components/studio/VerificationForm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn, timeAgo } from "@/lib/format";

const STATUS_META: Record<string, { label: string; tone: string; note: string }> = {
  pending: {
    label: "Pending review",
    tone: "bg-warn-100 text-warn-600",
    note: "Your request is in the queue. Moderators usually respond within 2–3 days.",
  },
  in_review: {
    label: "In review",
    tone: "bg-brand-100 text-brand-700",
    note: "A moderator is reviewing your evidence right now.",
  },
  more_info: {
    label: "More info needed",
    tone: "bg-warn-100 text-warn-600",
    note: "A moderator has questions about your evidence. Check the note below.",
  },
  approved: {
    label: "Approved",
    tone: "bg-success-100 text-success-600",
    note: "Congratulations — your profile is verified.",
  },
  rejected: {
    label: "Not approved",
    tone: "bg-danger-100 text-danger-600",
    note: "Your last request was not approved. You can submit a new one with stronger evidence.",
  },
};

export default async function StudioVerificationPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [profile, requests] = await Promise.all([
    db.teacherProfile.findUnique({
      where: { userId: user.id },
      select: { verifiedStatus: true },
    }),
    db.verificationRequest.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        evidenceNote: true,
        actionReason: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const verifiedStatus = profile?.verifiedStatus ?? "unverified";
  const isVerified = verifiedStatus === "verified";
  const hasOpenRequest = requests.some((r) =>
    ["pending", "in_review", "more_info"].includes(r.status),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <SectionHeader
          title="Verification"
          subtitle="Verified teachers get the blue tick and rank higher in search."
        />

        <div
          className={cn(
            "card mb-5 flex items-center gap-4 p-5",
            isVerified && "border-success-500/30 bg-success-100/40",
          )}
        >
          <span
            className={cn(
              "flex size-12 flex-none items-center justify-center rounded-2xl",
              isVerified ? "bg-success-500 text-white" : "bg-ink-100 text-ink-500",
            )}
          >
            <Icon name="shield" size={22} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-extrabold text-ink-900">
                {isVerified ? "Verified teacher" : "Not yet verified"}
              </h2>
              {isVerified ? (
                <span className="rounded-chip bg-success-500 px-2 py-0.5 text-[10.5px] font-bold text-white">
                  Blue tick active
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">
              {isVerified
                ? "Your identity and qualifications are confirmed. Students see the verified tick on your profile and posts."
                : "Submit your teaching credentials to earn the verified tick. This is free and typically takes 2–3 days."}
            </p>
          </div>
        </div>

        {!isVerified ? <VerificationForm disabled={hasOpenRequest} /> : null}

        {isVerified ? (
          <InfoNote tone="brand" icon="check">
            You are all set. Keep your profile details up to date — students trust complete
            profiles far more.
          </InfoNote>
        ) : null}
      </div>

      <div>
        <SectionHeader title="Request history" />
        {requests.length > 0 ? (
          <div className="space-y-2.5">
            {requests.map((r) => {
              const meta = STATUS_META[r.status] ?? {
                label: r.status,
                tone: "bg-ink-100 text-ink-500",
                note: "",
              };
              return (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "rounded-chip px-2.5 py-0.5 text-[11px] font-bold",
                        meta.tone,
                      )}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[11px] font-semibold text-ink-400">
                      {timeAgo(r.createdAt.toISOString())}
                    </span>
                  </div>
                  {r.actionReason ? (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">
                      <span className="font-bold text-ink-700">Moderator note: </span>
                      {r.actionReason}
                    </p>
                  ) : meta.note ? (
                    <p className="mt-2 text-[12px] leading-relaxed text-ink-400">{meta.note}</p>
                  ) : null}
                  {r.evidenceNote ? (
                    <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-ink-400">
                      {r.evidenceNote}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-ink-400">
            No requests yet. Once you submit, you can track its progress here.
          </p>
        )}
      </div>
    </div>
  );
}
