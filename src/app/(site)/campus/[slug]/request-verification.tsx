"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Textarea } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { apiFetch, ClientApiError } from "@/lib/client";

export function RequestOrgVerification({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    if (note.trim().length < 10) {
      setError("Please describe your evidence in at least 10 characters.");
      return;
    }

    setPending(true);
    try {
      await apiFetch(`/api/organizations/${organizationId}/verify`, {
        method: "POST",
        body: { evidenceNote: note.trim() },
      });
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not submit the request.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <InfoNote icon="check" tone="brand">
        Verification request submitted. Our team will review it and notify your organization.
      </InfoNote>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <InfoNote icon="alert" tone="danger">
          {error}
        </InfoNote>
      ) : null}
      <Field
        label="Verification evidence"
        htmlFor="evidence"
        hint="Describe the documents you can provide (registration certificate, ministry approval, etc.)"
      >
        <Textarea
          id="evidence"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="e.g., We can provide the school registration certificate and the principal's appointment letter."
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Icon name="loader" size={16} className="animate-spin" /> Submitting…
          </>
        ) : (
          <>
            <Icon name="shield-check" size={16} /> Request verification
          </>
        )}
      </Button>
    </form>
  );
}
