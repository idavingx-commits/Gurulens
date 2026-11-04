"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

export function ClaimCodeForm({ teacherName }: { teacherName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ verified?: boolean; alreadyVerified?: boolean; teacherName?: string }>(
        "/api/eligibility/claim",
        { method: "POST", body: { code: code.trim() } },
      );
      toast.success(
        res.alreadyVerified
          ? "You're already verified with this teacher."
          : "Verified! You can now leave a review.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 flex-none items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
          <Icon name="key" size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[14px] font-extrabold text-ink-900">
            Learned with {teacherName}? Verify with an enrollment code
          </h3>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-400">
            Enter the code {teacherName.split(" ")[0]} gave your class to unlock reviews.
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. GL-ANURAD-1000"
          maxLength={40}
          autoComplete="off"
          spellCheck={false}
          className="font-mono tracking-wide"
        />
        <Button type="submit" disabled={busy || code.trim().length < 4}>
          {busy ? <Spinner size={16} /> : <Icon name="shield-check" size={15} />}
          Verify
        </Button>
      </div>

      {error ? (
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-danger-600">
          <Icon name="alert" size={13} />
          {error}
        </p>
      ) : null}
    </form>
  );
}
