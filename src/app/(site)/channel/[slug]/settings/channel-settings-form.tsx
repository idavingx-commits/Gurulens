"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError, uploadMedia } from "@/lib/client";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function ChannelSettingsForm({
  slug,
  initialName,
  initialDescription,
  initialVisibility,
  avatarUrl: initialAvatarUrl,
  coverUrl: initialCoverUrl,
}: {
  slug: string;
  initialName: string;
  initialDescription: string;
  initialVisibility: string;
  avatarUrl: string | null;
  coverUrl: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  const apiPath = `/api/channels/${encodeURIComponent(slug)}`;

  async function uploadImage(
    file: File,
    kind: "channel_avatar" | "channel_cover",
    limitMb: number,
    field: "avatarKey" | "coverKey",
    onDone: (url: string | null) => void,
    setBusy: (busy: boolean) => void,
    setLocalError: (message: string | null) => void,
    successMessage: string,
  ) {
    if (!IMAGE_TYPES.includes(file.type)) {
      setLocalError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > limitMb * 1024 * 1024) {
      setLocalError(`Images must be ${limitMb} MB or smaller.`);
      return;
    }

    setBusy(true);
    setLocalError(null);
    try {
      const media = await uploadMedia(file, kind);
      await apiFetch(apiPath, { method: "PATCH", body: { [field]: media.id } });
      onDone(media.url);
      toast.success(successMessage);
      router.refresh();
    } catch (err) {
      setLocalError(err instanceof ClientApiError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function pickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImage(
      file,
      "channel_avatar",
      5,
      "avatarKey",
      setAvatarUrl,
      setAvatarBusy,
      setAvatarError,
      "Channel photo updated.",
    );
    if (avatarRef.current) avatarRef.current.value = "";
  }

  async function pickCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImage(
      file,
      "channel_cover",
      8,
      "coverKey",
      setCoverUrl,
      setCoverBusy,
      setCoverError,
      "Channel banner updated.",
    );
    if (coverRef.current) coverRef.current.value = "";
  }

  async function removeImage(field: "avatarKey" | "coverKey") {
    const setBusy = field === "avatarKey" ? setAvatarBusy : setCoverBusy;
    const setLocalError = field === "avatarKey" ? setAvatarError : setCoverError;
    setBusy(true);
    setLocalError(null);
    try {
      await apiFetch(apiPath, { method: "PATCH", body: { [field]: null } });
      if (field === "avatarKey") setAvatarUrl(null);
      else setCoverUrl(null);
      toast.success(field === "avatarKey" ? "Channel photo removed." : "Channel banner removed.");
      router.refresh();
    } catch (err) {
      setLocalError(err instanceof ClientApiError ? err.message : "Could not remove the image.");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(null);

    if (name.trim().length < 2) {
      setError("Please enter a channel name.");
      return;
    }
    if (description.length > 500) {
      setError("Description must be 500 characters or fewer.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(apiPath, {
        method: "PATCH",
        body: {
          name: name.trim(),
          description: description.trim(),
          visibility,
        },
      });
      toast.success("Channel settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not save the channel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {error ? (
        <InfoNote icon="alert" tone="danger">
          {error}
        </InfoNote>
      ) : null}

      <section className="card overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-ink-900 via-brand-800 to-accent-600 sm:h-48">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <div
                aria-hidden="true"
                className="absolute -top-12 -right-10 size-40 rounded-full bg-white/10 blur-2xl"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/80">
                <Icon name="image" size={24} />
                <span className="text-[12px] font-bold">Add a banner to set the mood</span>
              </div>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent" />

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            {coverUrl ? (
              <button
                type="button"
                onClick={() => void removeImage("coverKey")}
                disabled={coverBusy}
                aria-label="Remove channel banner"
                className="inline-flex size-8 items-center justify-center rounded-full bg-ink-900/55 text-white backdrop-blur-sm transition-colors hover:bg-ink-900/75 disabled:opacity-60"
              >
                {coverBusy ? (
                  <Icon name="loader" size={13} className="animate-spin" />
                ) : (
                  <Icon name="x" size={14} strokeWidth={2.6} />
                )}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={coverBusy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11.5px] font-bold text-ink-900 shadow-sm transition-colors hover:bg-white disabled:opacity-70"
            >
              {coverBusy ? (
                <Icon name="loader" size={13} className="animate-spin" />
              ) : (
                <Icon name="camera" size={13} />
              )}
              {coverBusy ? "Uploading…" : coverUrl ? "Change banner" : "Add banner"}
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-9 flex flex-wrap items-end gap-4">
            <div className="relative flex-none">
              <Avatar name={name || "Channel"} src={avatarUrl} size="xl" ring />
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                disabled={avatarBusy}
                aria-label="Change channel photo"
                className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-md transition-colors hover:bg-brand-700 disabled:opacity-70"
              >
                {avatarBusy ? (
                  <Icon name="loader" size={13} className="animate-spin" />
                ) : (
                  <Icon name="camera" size={13} />
                )}
              </button>
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[13px] font-bold text-ink-800">Channel photo</p>
              <p className="text-[11.5px] text-ink-400">
                JPG, PNG or WebP up to 5 MB. Square images work best.
              </p>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => void removeImage("avatarKey")}
                  disabled={avatarBusy}
                  className="mt-1 text-[11.5px] font-bold text-danger-600 hover:underline disabled:opacity-60"
                >
                  Remove photo
                </button>
              ) : null}
            </div>
          </div>

          {avatarError ? (
            <p className="mt-2 text-[11.5px] font-semibold text-danger-600">{avatarError}</p>
          ) : null}
          {coverError ? (
            <p className="mt-2 text-[11.5px] font-semibold text-danger-600">{coverError}</p>
          ) : null}
          <p className="mt-3 text-[11.5px] text-ink-400">
            Wide banner images (16:6) look best on the channel page and in shared link previews.
          </p>

          <input
            ref={avatarRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={pickAvatar}
          />
          <input
            ref={coverRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={pickCover}
          />
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <Field label="Channel name" htmlFor="channel-name">
          <Input
            id="channel-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
          />
        </Field>

        <Field
          label="Description"
          htmlFor="channel-description"
          hint={`${description.length}/500 characters`}
        >
          <Textarea
            id="channel-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="What can followers expect from this channel?"
          />
        </Field>

        <Field label="Visibility" htmlFor="channel-visibility">
          <Select
            id="channel-visibility"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value)}
          >
            <option value="public">Public — Anyone can find and follow</option>
            <option value="private">Private — Only approved followers can see</option>
            <option value="members">Members only — Only class members can access</option>
          </Select>
        </Field>

        <InfoNote icon="link">
          The channel link <span className="font-bold">gurulens.us/channel/{slug}</span> stays the
          same so existing shares keep working.
        </InfoNote>

        <div className="flex items-center justify-end gap-2 border-t border-ink-100 pt-4">
          <Button type="submit" disabled={saving || avatarBusy || coverBusy}>
            {saving ? (
              <>
                <Icon name="loader" size={15} className="animate-spin" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </section>
    </form>
  );
}
