"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { apiFetch, ClientApiError, uploadMedia } from "@/lib/client";

type UploadedImage = { id: string; url: string };

export function CreateChannelForm() {
  const router = useRouter();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [avatar, setAvatar] = useState<UploadedImage | null>(null);
  const [cover, setCover] = useState<UploadedImage | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function upload(
    file: File,
    kind: "channel_avatar" | "channel_cover",
    limitMb: number,
  ): Promise<UploadedImage> {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      throw new Error("Choose a JPG, PNG or WebP image.");
    }
    if (file.size > limitMb * 1024 * 1024) {
      throw new Error(`Images must be ${limitMb} MB or smaller.`);
    }
    return uploadMedia(file, kind);
  }

  async function pickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      setAvatar(await upload(file, "channel_avatar", 5));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setAvatarUploading(false);
      if (avatarRef.current) avatarRef.current.value = "";
    }
  }

  async function pickCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    setCoverError(null);
    try {
      setCover(await upload(file, "channel_cover", 8));
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setCoverUploading(false);
      if (coverRef.current) coverRef.current.value = "";
    }
  }

  function handleNameChange(value: string) {
    setName(value);
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    setSlug(autoSlug);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || avatarUploading || coverUploading) return;
    setError(null);

    if (!name.trim()) return setError("Please enter a channel name.");
    if (!slug.trim() || slug.length < 3) return setError("Channel URL must be at least 3 characters.");
    if (!/^[a-z0-9-]+$/.test(slug)) return setError("Channel URL can only contain lowercase letters, numbers, and hyphens.");

    setPending(true);
    try {
      const result = await apiFetch<{ channel: { slug: string } }>("/api/channels", {
        method: "POST",
        body: {
          name,
          slug,
          description,
          visibility,
          avatarKey: avatar?.id,
          coverKey: cover?.id,
        },
      });
      router.push(`/channel/${result.channel.slug}`);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? (
        <InfoNote icon="alert" tone="danger">
          {error}
        </InfoNote>
      ) : null}

      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-ink-700">Channel banner</p>
        <div className="relative h-36 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700 sm:h-44">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <div
                aria-hidden="true"
                className="absolute -top-12 -right-8 size-40 rounded-full bg-white/10 blur-2xl"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/80">
                <Icon name="image" size={24} />
                <span className="text-[12px] font-bold">Give your channel a cover</span>
              </div>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent" />
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            disabled={coverUploading}
            className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11.5px] font-bold text-ink-900 shadow-sm transition-colors hover:bg-white disabled:opacity-70"
          >
            {coverUploading ? (
              <Icon name="loader" size={13} className="animate-spin" />
            ) : (
              <Icon name="camera" size={13} />
            )}
            {coverUploading ? "Uploading…" : cover ? "Change cover" : "Add cover"}
          </button>
        </div>
        <p className="mt-1.5 text-[11.5px] text-ink-400">
          Optional · JPG, PNG or WebP up to 8 MB. Wide images (16:6) look best.
        </p>
        {coverError ? (
          <p className="mt-1 text-[11.5px] font-semibold text-danger-600">{coverError}</p>
        ) : null}
        <input
          ref={coverRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={pickCover}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-none">
          <Avatar name={name || "Channel"} src={avatar?.url ?? null} size="lg" ring />
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            disabled={avatarUploading}
            aria-label="Upload channel photo"
            className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-brand-600 text-white shadow-md transition-colors hover:bg-brand-700 disabled:opacity-70"
          >
            {avatarUploading ? (
              <Icon name="loader" size={12} className="animate-spin" />
            ) : (
              <Icon name="camera" size={12} />
            )}
          </button>
          <input
            ref={avatarRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={pickAvatar}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-ink-800">Channel photo</p>
          <p className="text-[11.5px] text-ink-400">
            Optional · JPG, PNG or WebP up to 5 MB. Square images work best.
          </p>
          {avatarError ? (
            <p className="mt-0.5 text-[11.5px] font-semibold text-danger-600">{avatarError}</p>
          ) : null}
        </div>
      </div>

      <Field label="Channel name" htmlFor="name" hint="The name of your channel as it will appear to followers">
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., Chemistry Made Easy"
          required
        />
      </Field>

      <Field label="Channel URL" htmlFor="slug" hint="Lowercase letters, numbers, and hyphens only">
        <div className="flex items-center gap-2">
          <span className="flex-none rounded-lg bg-ink-100 px-3 py-2.5 text-sm text-ink-500">
            gurulens.us/channel/
          </span>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="chemistry-made-easy"
            pattern="^[a-z0-9-]+$"
            required
            className="flex-1"
          />
        </div>
      </Field>

      <Field label="Description" htmlFor="description" hint="Tell potential followers what they can expect">
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is your channel about?"
          rows={4}
        />
      </Field>

      <Field label="Visibility" htmlFor="visibility">
        <Select
          id="visibility"
          name="visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="public">Public — Anyone can find and follow</option>
          <option value="private">Private — Only approved followers can see</option>
          <option value="members">Members Only — Only class members can access</option>
        </Select>
      </Field>

      <div className="flex gap-3 pt-3">
        <Button
          type="submit"
          disabled={pending || avatarUploading || coverUploading}
          className="flex-1"
        >
          {pending ? (
            <>
              <Icon name="loader" size={18} className="animate-spin" />
              Creating…
            </>
          ) : (
            "Create Channel"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
