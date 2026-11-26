"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

export function CampusDeletionCard({
  organizationId,
  organizationName,
  memberCount,
}: {
  organizationId: string;
  organizationName: string;
  memberCount: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);

  async function doRequest() {
    if (
      !window.confirm(
        "Request campus deletion? A moderator will review it before the campus is removed.",
      )
    )
      return;
    setBusy(true);
    try {
      const result = await apiFetch<{
        deleted?: boolean;
        approvalRequired?: boolean;
        requestId?: string;
        message?: string;
      }>(`/api/organizations/${organizationId}`, { method: "DELETE" });
      if (result.approvalRequired) {
        setPending(true);
        toast.success(result.message ?? "Deletion requested.");
      } else if (result.deleted) {
        toast.success("Campus deleted.");
        router.push("/campus");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not request deletion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-danger-200 bg-danger-50/40">
      <div className="flex flex-wrap items-start gap-3 p-5">
        <span className="flex size-11 flex-none items-center justify-center rounded-2xl bg-danger-100 text-danger-600">
          <Icon name="trash" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-extrabold text-ink-900">Danger zone</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-600">
            Deleting {organizationName} removes the campus, its branches, classes and
            timetables. Channels and the LMS hub are deactivated. Because campuses affect
            {memberCount > 0 ? ` ${memberCount} member${memberCount === 1 ? "" : "s"}` : " members"} and
            learners, deletion always requires admin approval.
          </p>
        </div>
      </div>

      {pending ? (
        <div className="mx-5 mb-5">
          <InfoNote icon="clock" tone="warn">
            Deletion requested — a moderator will review it before the campus is removed.
          </InfoNote>
        </div>
      ) : null}

      <div className="mx-5 mb-5 flex flex-wrap items-center gap-3">
        <Button variant="danger" onClick={() => void doRequest()} disabled={busy || pending}>
          {busy ? <Icon name="loader" size={14} className="animate-spin" /> : <Icon name="trash" size={14} />}
          Request campus deletion
        </Button>
      </div>
    </section>
  );
}
