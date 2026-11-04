"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Select } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Field, Input, Textarea } from "@/components/ui/input";
import { apiFetch, apiUpload, ClientApiError } from "@/lib/client";
import { cn } from "@/lib/format";

type Option = { id: string; name: string };

const TYPE_META: Record<string, { label: string; icon: string; hint: string }> = {
  post: { label: "Post", icon: "pencil", hint: "Text, photos or both." },
  announcement: { label: "Announcement", icon: "bell", hint: "Important class updates." },
  lesson: { label: "Lesson", icon: "book", hint: "Structured lesson notes." },
  reel: { label: "Reel", icon: "film", hint: "Short vertical video (9:16)." },
  video: { label: "Video", icon: "video", hint: "Full lesson video." },
};

const POST_TYPES = ["post", "announcement", "lesson", "reel", "video"] as const;

export function PostComposer({
  subjects,
  grades,
}: {
  subjects: Option[];
  grades: Option[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [type, setType] = useState<string>("post");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [visibility, setVisibility] = useState("public");

  const [images, setImages] = useState<Array<{ id: string; url: string }>>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  const [video, setVideo] = useState<{ id: string; url: string } | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoPct, setVideoPct] = useState(0);
  const videoRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsVideo = type === "reel" || type === "video";
  const meta = TYPE_META[type] ?? TYPE_META.post!;

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const room = 4 - images.length;
    if (room <= 0) {
      toast.error("Up to 4 photos per post.");
      return;
    }
    setImageBusy(true);
    try {
      for (const file of files.slice(0, room)) {
        const form = new FormData();
        form.append("kind", "post_image");
        form.append("file", file);
        const res = await apiUpload<{ media: { id: string; url: string } }>("/api/upload", form);
        setImages((prev) => [...prev, res.media]);
      }
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Image upload failed.");
    } finally {
      setImageBusy(false);
      if (imageRef.current) imageRef.current.value = "";
    }
  }

  async function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoBusy(true);
    setVideoPct(0);
    try {
      const form = new FormData();
      form.append("kind", "video");
      form.append("file", file);
      const res = await apiUpload<{ media: { id: string; url: string } }>(
        "/api/upload",
        form,
        setVideoPct,
      );
      setVideo(res.media);
      toast.success("Video ready.");
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Video upload failed.");
    } finally {
      setVideoBusy(false);
      if (videoRef.current) videoRef.current.value = "";
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (text.trim().length === 0) {
      setError("Write something first.");
      return;
    }
    if (needsVideo && !video) {
      setError("Upload a video for reels and video posts.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/api/posts", {
        method: "POST",
        body: {
          type,
          title: title.trim() || undefined,
          text: text.trim(),
          mediaIds: images.map((i) => i.id),
          videoId: video?.id,
          subjectId: subjectId || undefined,
          gradeId: gradeId || undefined,
          visibility,
        },
      });
      toast.success("Published! Your post is live.");
      setTitle("");
      setText("");
      setImages([]);
      setVideo(null);
      setSubjectId("");
      setGradeId("");
      setVisibility("public");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not publish your post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 sm:p-6">
      <h2 className="text-[15px] font-extrabold text-ink-900">New post</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-400">{meta.hint}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {POST_TYPES.map((t) => {
          const m = TYPE_META[t]!;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-[12.5px] font-bold transition-all",
                type === t
                  ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                  : "border-ink-200 bg-white/70 text-ink-600 hover:border-brand-300",
              )}
            >
              <Icon name={m.icon} size={13} />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          maxLength={140}
        />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder={
            type === "announcement"
              ? "What should your students know?"
              : "Share your lesson, tips or update…"
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Subject">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Any subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Grade">
            <Select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
              <option value="">Any grade</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Visibility">
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="public">Public</option>
              <option value="members">Supporters only</option>
            </Select>
          </Field>
        </div>

        {!needsVideo ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageRef.current?.click()}
                disabled={imageBusy || images.length >= 4}
              >
                <Icon name="image" size={14} />
                {imageBusy ? "Uploading…" : `Add photos (${images.length}/4)`}
              </Button>
              <input
                ref={imageRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={onPickImages}
              />
            </div>
            {images.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((img) => (
                  <div key={img.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt=""
                      className="size-20 rounded-xl border border-ink-100 object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => setImages((prev) => prev.filter((p) => p.id !== img.id))}
                      className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-ink-900 text-white shadow"
                    >
                      <Icon name="x" size={11} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white/50 p-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={video ? "outline" : "primary"}
                size="sm"
                onClick={() => videoRef.current?.click()}
                disabled={videoBusy}
              >
                <Icon name="upload" size={14} />
                {video ? "Replace video" : "Upload video"}
              </Button>
              {video ? (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-success-600">
                  <Icon name="check" size={14} strokeWidth={3} />
                  Ready
                </span>
              ) : (
                <span className="text-[12px] text-ink-400">MP4 or WebM, up to ~100 MB</span>
              )}
            </div>
            <input
              ref={videoRef}
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              onChange={onPickVideo}
            />
            {videoBusy ? (
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={videoPct} className="h-2" />
                <span className="text-[12px] font-bold text-ink-500 tabular-nums">{videoPct}%</span>
              </div>
            ) : null}
            {video ? (
              <video
                src={video.url}
                controls
                playsInline
                className="mt-3 max-h-64 w-full rounded-xl bg-ink-900"
              />
            ) : null}
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-danger-600">
          <Icon name="alert" size={13} />
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-ink-400">
          Posts are public immediately. Stay kind — moderation follows community guidelines.
        </p>
        <Button type="submit" disabled={busy || imageBusy || videoBusy}>
          <Icon name="send" size={15} />
          {busy ? "Publishing…" : "Publish"}
        </Button>
      </div>
    </form>
  );
}
