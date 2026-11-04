"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Textarea } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiUpload, ClientApiError } from "@/lib/client";

export function VerificationForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState("");
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickFile(file: File | null) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "doc");
      const res = await apiUpload<{ media: { id: string } }>("/api/upload", fd);
      setMediaId(res.media.id);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Upload failed. Try a smaller file.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSubmit() {
    setError(null);
    if (note.trim().length < 20) {
      setError("Describe your qualifications in at least 20 characters.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/studio/verification", {
        method: "POST",
        body: {
          evidenceNote: note.trim(),
          evidenceMediaId: mediaId ?? undefined,
        },
      });
      toast.success("Verification request submitted — moderators will review it soon.");
      setNote("");
      setMediaId(null);
      setFileName(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not submit the request.");
    } finally {
      setBusy(false);
    }
  }

  if (disabled) {
    return (
      <InfoNote tone="warn" icon="shield">
        You have an open verification request. Watch your notifications — a moderator will respond
        soon. You can submit a new request once this one is resolved.
      </InfoNote>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <h3 className="text-[14px] font-extrabold text-ink-900">Submit verification evidence</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
        Tell us about your teaching qualifications, the schools or institutes you work with, and any
        registration numbers. Moderators may ask for documents — upload a photo or PDF of your
        certificates, ID or appointment letters.
      </p>

      <div className="mt-4 space-y-3">
        <Field label="Your qualifications & teaching background">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            maxLength={1500}
            placeholder={
              "e.g. B.Sc. Physical Science (University of Colombo), 12 years teaching A/L Physics at…"
            }
          />
        </Field>

        <div>
          <p className="mb-1.5 text-[12.5px] font-bold text-ink-700">
            Supporting document (optional)
          </p>
          {fileName ? (
            <div className="flex items-center gap-2.5 rounded-2xl border border-success-500/30 bg-success-100/60 px-3.5 py-2.5">
              <Icon name="upload" size={15} className="text-success-600" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink-700">
                {fileName}
              </span>
              <button
                type="button"
                aria-label="Remove document"
                onClick={() => {
                  setMediaId(null);
                  setFileName(null);
                }}
                className="flex size-6 items-center justify-center rounded-full text-ink-400 hover:bg-white hover:text-ink-700"
              >
                <Icon name="x" size={12} strokeWidth={2.6} />
              </button>
            </div>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 px-4 py-4 text-[12.5px] font-semibold text-ink-500 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-60"
              >
                {uploading ? (
                  "Uploading…"
                ) : (
                  <>
                    <Icon name="upload" size={15} />
                    Choose a photo or PDF (max 10 MB)
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {error ? (
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-danger-600">
            <Icon name="alert" size={13} />
            {error}
          </p>
        ) : null}

        <Button type="button" onClick={onSubmit} disabled={busy || uploading}>
          <Icon name="shield" size={15} />
          {busy ? "Submitting…" : "Submit for verification"}
        </Button>
      </div>
    </div>
  );
}
