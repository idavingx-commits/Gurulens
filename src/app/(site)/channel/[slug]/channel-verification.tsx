"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Textarea } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { apiFetch, ClientApiError } from "@/lib/client";

export function ChannelVerificationRequest({ channelSlug }: { channelSlug: string }) {
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
      await apiFetch(`/api/channels/${channelSlug}/verify`, {
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
        Verification request submitted. We will notify you when it is reviewed.
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
        htmlFor="channel-evidence"
        hint="Explain why this channel should be verified and what documents you can provide"
      >
        <Textarea
          id="channel-evidence"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="e.g., This is the official channel of our school. We can provide the registration certificate."
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
