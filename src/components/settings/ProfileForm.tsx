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
  coverUrl = null,
  canHaveCover = false,
}: {
  initialName: string;
  avatarUrl: string | null;
  coverUrl?: string | null;
  canHaveCover?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [avatarPreview, setAvatarPreview] = useState(avatarUrl);
  const [coverPreview, setCoverPreview] = useState(coverUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

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

  async function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setCoverError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setCoverError("Banner photos must be 8 MB or smaller.");
      return;
    }

    setUploadingCover(true);
    setCoverError(null);
    try {
      const form = new FormData();
      form.append("kind", "cover");
      form.append("file", file);
      const res = await apiUpload<{ media: { url: string } }>("/api/upload", form);
      setCoverPreview(res.media.url);
      toast.success("Banner photo updated.");
      router.refresh();
    } catch (err) {
      setCoverError(err instanceof ClientApiError ? err.message : "Upload failed.");
    } finally {
      setUploadingCover(false);
      if (coverRef.current) coverRef.current.value = "";
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

      {canHaveCover ? (
        <div className="mt-4">
          <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-brand-800 to-accent-600 sm:h-40">
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent" />
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
              <span className="text-[11.5px] font-bold text-white/90">Profile banner</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingCover}
                onClick={() => coverRef.current?.click()}
                className="border-white/60 bg-white/90 text-ink-900 hover:bg-white"
              >
                {uploadingCover ? <Spinner size={14} /> : <Icon name="camera" size={14} />}
                {uploadingCover ? "Uploading…" : coverPreview ? "Change banner" : "Add banner"}
              </Button>
            </div>
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-400">
            Shown across your public teacher profile. Wide images (16:6) look best.
          </p>
          {coverError ? (
            <p className="mt-1 text-[11.5px] font-semibold text-danger-600">{coverError}</p>
          ) : null}
          <input
            ref={coverRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPickCover}
          />
        </div>
      ) : null}

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
