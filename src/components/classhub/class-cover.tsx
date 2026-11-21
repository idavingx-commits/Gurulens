"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError, uploadMedia } from "@/lib/client";
import { cn } from "@/lib/format";

export function ClassCover({
  classId,
  coverUrl,
  canEdit,
  className,
}: {
  classId: string;
  coverUrl: string | null;
  canEdit: boolean;
  className?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState<string | null>(coverUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Class covers must be 8 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const media = await uploadMedia(file, "class_cover");
      await apiFetch(`/api/classes/${classId}`, {
        method: "PATCH",
        body: { coverKey: media.id },
      });
      setUrl(media.url);
      toast.success("Class cover updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not update the cover.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      await apiFetch(`/api/classes/${classId}`, {
        method: "PATCH",
        body: { coverKey: null },
      });
      setUrl(null);
      toast.success("Class cover removed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not remove the cover.");
    } finally {
      setRemoving(false);
    }
  }

  if (!url && !canEdit) return null;

  return (
    <div
      className={cn(
        "relative h-40 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700 sm:h-56",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Icon name="image" size={21} />
          </span>
          <span className="text-[12px] font-bold">Add a cover so students recognise this class</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent" />

      {canEdit ? (
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
          <span className="text-[11.5px] font-bold text-white/90">
            {url ? "Class cover" : "Class thumbnail"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || removing}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11.5px] font-bold text-ink-900 shadow-sm transition-colors hover:bg-white disabled:opacity-70"
            >
              {uploading ? (
                <Icon name="loader" size={13} className="animate-spin" />
              ) : (
                <Icon name="camera" size={13} />
              )}
              {uploading ? "Uploading…" : url ? "Change cover" : "Add cover"}
            </button>
            {url ? (
              <button
                type="button"
                onClick={remove}
                disabled={uploading || removing}
                aria-label="Remove class cover"
                className="inline-flex size-7 items-center justify-center rounded-full bg-ink-900/50 text-white backdrop-blur-sm transition-colors hover:bg-ink-900/70 disabled:opacity-70"
              >
                {removing ? (
                  <Icon name="loader" size={13} className="animate-spin" />
                ) : (
                  <Icon name="x" size={13} strokeWidth={2.6} />
                )}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}
