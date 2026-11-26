"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

export function ChannelDangerZone({
  slug,
  followerCount,
  isCampusChannel,
}: {
  slug: string;
  followerCount: number;
  isCampusChannel: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);

  const needsApproval =
    followerCount >= 100 || isCampusChannel;

  async function doDelete() {
    if (
      !window.confirm(
        needsApproval
          ? "Request channel deletion? A moderator will review it."
          : "Delete this channel? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    try {
      const result = await apiFetch<{
        success?: boolean;
        approvalRequired?: boolean;
        requestId?: string;
        message?: string;
      }>(`/api/channels/${encodeURIComponent(slug)}`, { method: "DELETE" });
      if (result.approvalRequired) {
        setPending(true);
        toast.success(result.message ?? "Deletion requested.");
      } else {
        toast.success("Channel deleted.");
        router.push("/channels");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not delete the channel.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card space-y-3 border-danger-200 bg-danger-50/40 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-danger-100 text-danger-600">
          <Icon name="trash" size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-extrabold text-ink-900">Danger zone</h3>
          <p className="mt-1 text-[12.5px] text-ink-600">
            {needsApproval
              ? `This channel has ${followerCount} follower${followerCount === 1 ? "" : "s"}${
                  isCampusChannel ? " and belongs to a campus" : ""
                }, so deletion needs admin approval before it is removed.`
              : "Deleting this channel hides it from the directory. Posts and content are kept in the database."}
          </p>
        </div>
      </div>

      {pending ? (
        <InfoNote icon="clock" tone="warn">
          Deletion requested — a moderator will review it before the channel is removed.
        </InfoNote>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="danger"
          onClick={() => void doDelete()}
          disabled={busy || pending}
        >
          {busy ? <Icon name="loader" size={14} className="animate-spin" /> : <Icon name="trash" size={14} />}
          {needsApproval ? "Request deletion" : "Delete channel"}
        </Button>
      </div>
    </section>
  );
}
