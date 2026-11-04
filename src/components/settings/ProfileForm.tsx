"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/interactive";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiUpload, ClientApiError } from "@/lib/client";

export function ProfileForm({
  initialName,
  avatarUrl,
}: {
  initialName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [avatarPreview, setAvatarPreview] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("kind", "avatar");
      form.append("file", file);
      const res = await apiUpload<{ media: { url: string } }>("/api/upload", form);
      setAvatarPreview(res.media.url);
      toast.success("Profile photo updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/settings/profile", { method: "PATCH", body: { name: name.trim() } });
      toast.success("Profile saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 sm:p-6">
      <h2 className="text-[15px] font-extrabold text-ink-900">Profile</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-400">How you appear across GuruLens.</p>

      <div className="mt-4 flex items-center gap-4">
        <Avatar name={name || "?"} src={avatarPreview} size="lg" />
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Spinner size={14} /> : <Icon name="camera" size={14} />}
            {uploading ? "Uploading…" : "Change photo"}
          </Button>
          <p className="mt-1 text-[11.5px] text-ink-400">JPG or PNG, up to 5 MB.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPickFile}
        />
      </div>

      <div className="mt-4 max-w-sm">
        <Field label="Display name" error={error}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="name"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Button type="submit" disabled={saving || name.trim() === initialName.trim()}>
          {saving ? <Spinner size={15} /> : <Icon name="check" size={15} strokeWidth={2.4} />}
          Save profile
        </Button>
      </div>
    </form>
  );
}
