"use client";

import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function AvatarPhotoPicker({
  name,
  file,
  onFileChange,
}: {
  name: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!IMAGE_TYPES.includes(picked.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      setError("Profile photos must be 5 MB or smaller.");
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(picked));
    onFileChange(picked);
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar name={name || "?"} src={preview} size="lg" />
        <div className="min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Icon name="camera" size={14} />
            {file ? "Change photo" : "Add profile photo"}
          </Button>
          <p className="mt-1 text-[11.5px] text-ink-400">
            Optional · JPG, PNG or WebP up to 5 MB.
          </p>
          {error ? <p className="mt-1 text-[11.5px] font-semibold text-danger-600">{error}</p> : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}

export function CoverPhotoPicker({
  file,
  onFileChange,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!IMAGE_TYPES.includes(picked.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (picked.size > 8 * 1024 * 1024) {
      setError("Banner photos must be 8 MB or smaller.");
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(picked));
    onFileChange(picked);
  }

  return (
    <div>
      <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-brand-800 to-accent-600 sm:h-40">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent" />
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
          <span className="text-[11.5px] font-bold text-white/90">
            {file ? "Banner preview" : "Add a banner so students recognise your profile"}
          </span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex flex-none items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11.5px] font-bold text-ink-900 shadow-sm transition-colors hover:bg-white"
          >
            <Icon name="camera" size={13} />
            {file ? "Change banner" : "Add banner"}
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-[11.5px] text-ink-400">
        Optional · JPG, PNG or WebP up to 8 MB. Wide images (16:6) look best.
      </p>
      {error ? <p className="mt-1 text-[11.5px] font-semibold text-danger-600">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}
