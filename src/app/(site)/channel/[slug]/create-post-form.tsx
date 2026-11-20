"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { VoicePlayer } from "@/components/ui/voice-player";
import { apiFetch, ClientApiError, uploadMedia } from "@/lib/client";
import { cn } from "@/lib/format";

type Mode = "update" | "poll" | "voice";

type PendingAttachment = {
  file: File;
  preview: string | null;
};

const MAX_ATTACHMENTS = 4;
const MAX_RECORDING_SECONDS = 180;

function baseMime(type: string): string {
  return type.split(";")[0]!.trim().toLowerCase();
}

function audioExtension(mime: string): string {
  if (mime === "audio/mp4") return "m4a";
  if (mime === "audio/ogg") return "ogg";
  if (mime === "audio/mpeg") return "mp3";
  if (mime === "audio/wav") return "wav";
  return "webm";
}

export function CreatePostForm({ channelSlug }: { channelSlug: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("update");
  const [content, setContent] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attachments
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function finishRecording() {
    stopTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopTracks();
    }
  }

  // Stop the microphone and release preview URLs if the composer unmounts.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  }

  function addOption() {
    setOptions((prev) => (prev.length >= 6 ? prev : [...prev, ""]));
  }

  function removeOption(index: number) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    setError(null);
    const incoming = Array.from(fileList);
    const next: PendingAttachment[] = [...attachments];

    for (const file of incoming) {
      if (next.length >= MAX_ATTACHMENTS) {
        setError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
        break;
      }
      const mime = baseMime(file.type);
      const isImage = mime.startsWith("image/");
      const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
      if (!allowed.includes(mime)) {
        setError("Attach images (PNG, JPG, WebP, GIF) or a PDF.");
        continue;
      }
      const limit = isImage ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > limit) {
        setError(`${file.name} is larger than ${isImage ? "10" : "20"} MB.`);
        continue;
      }
      if (next.some((a) => a.file.name === file.name && a.file.size === file.size)) continue;
      next.push({
        file,
        preview: isImage ? URL.createObjectURL(file) : null,
      });
    }

    setAttachments(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => {
      const target = prev[index];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function startRecording() {
    setVoiceError(null);
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Voice recording is not supported in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setVoiceError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      if (voiceUrl) URL.revokeObjectURL(voiceUrl);
      setVoiceBlob(null);
      setVoiceUrl(null);
      setVoiceDuration(0);
      setWaveform([]);
      elapsedRef.current = 0;
      setElapsed(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopTracks();
        const type = baseMime(recorder.mimeType || chunksRef.current[0]?.type || "audio/webm");
        const blob = new Blob(chunksRef.current, { type });
        const duration = Math.max(1, elapsedRef.current);
        setRecording(false);
        if (blob.size === 0) {
          setVoiceError("Nothing was recorded. Please try again.");
          return;
        }
        setVoiceBlob(blob);
        setVoiceDuration(duration);
        setVoiceUrl(URL.createObjectURL(blob));
        void extractWaveform(blob);
      };

      recorder.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_RECORDING_SECONDS) finishRecording();
      }, 1000);
    } catch {
      stopTracks();
      setRecording(false);
      setVoiceError("Microphone access was blocked. Allow the microphone and try again.");
    }
  }

  async function extractWaveform(blob: Blob) {
    try {
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = new AudioCtor();
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      const channel = buffer.getChannelData(0);
      const bars = 36;
      const block = Math.max(1, Math.floor(channel.length / bars));
      const peaks: number[] = [];
      for (let bar = 0; bar < bars; bar += 1) {
        let peak = 0;
        const start = bar * block;
        const end = Math.min(channel.length, start + block);
        for (let i = start; i < end; i += 1) {
          const value = Math.abs(channel[i] ?? 0);
          if (value > peak) peak = value;
        }
        peaks.push(Number(Math.min(1, Math.max(0.08, peak * 2.4)).toFixed(3)));
      }
      setWaveform(peaks);
      await ctx.close();
    } catch {
      // Some browsers cannot decode WebM audio; the player falls back to a shape.
    }
  }

  function discardRecording() {
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    setVoiceBlob(null);
    setVoiceUrl(null);
    setVoiceDuration(0);
    setWaveform([]);
    setElapsed(0);
    elapsedRef.current = 0;
  }

  function clearAttachments() {
    setAttachments((prev) => {
      for (const item of prev) {
        if (item.preview) URL.revokeObjectURL(item.preview);
      }
      return [];
    });
  }

  function resetComposer() {
    setContent("");
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
    setIsPinned(false);
    setIsUrgent(false);
    setMode("update");
    clearAttachments();
    discardRecording();
    setUploadPct(null);
    setUploadLabel(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || recording) return;
    setError(null);
    setVoiceError(null);

    if (mode === "update") {
      if (!content.trim() && attachments.length === 0) {
        setError("Write something or attach a file before posting.");
        return;
      }
    } else if (mode === "poll") {
      if (question.trim().length < 3) {
        setError("Poll question must be at least 3 characters.");
        return;
      }
      const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
      if (cleanOptions.length < 2) {
        setError("Add at least two poll options.");
        return;
      }
      if (new Set(cleanOptions).size !== cleanOptions.length) {
        setError("Poll options must be unique.");
        return;
      }
    } else if (!voiceBlob) {
      setError("Record a voice message before posting.");
      return;
    }

    setPending(true);
    try {
      if (mode === "poll") {
        await apiFetch(`/api/channels/${channelSlug}/posts`, {
          method: "POST",
          body: {
            type: "poll",
            content: content.trim() || undefined,
            pollQuestion: question.trim(),
            pollOptions: options.map((o) => o.trim()).filter(Boolean),
            pollAllowMultiple: allowMultiple,
            isPinned,
            isUrgent,
          },
        });
      } else if (mode === "voice") {
        if (!voiceBlob) return;
        const mime = baseMime(voiceBlob.type);
        setUploadLabel("Uploading voice message");
        setUploadPct(0);
        const file = new File([voiceBlob], `voice-message.${audioExtension(mime)}`, { type: mime });
        const media = await uploadMedia(file, "audio", setUploadPct);
        await apiFetch(`/api/channels/${channelSlug}/posts`, {
          method: "POST",
          body: {
            type: "audio",
            content: content.trim() || undefined,
            audioKey: media.id,
            durationSec: Math.max(1, Math.round(voiceDuration)),
            waveform: waveform.length > 0 ? waveform : undefined,
            isPinned,
            isUrgent,
          },
        });
      } else {
        const mediaKeys: string[] = [];
        let hasPdf = false;
        for (let index = 0; index < attachments.length; index += 1) {
          const item = attachments[index]!;
          const mime = baseMime(item.file.type);
          if (mime === "application/pdf") hasPdf = true;
          setUploadLabel(`Uploading ${index + 1} of ${attachments.length}`);
          setUploadPct(0);
          const media = await uploadMedia(
            item.file,
            mime === "application/pdf" ? "post_file" : "post_image",
            setUploadPct,
          );
          mediaKeys.push(media.id);
        }

        await apiFetch(`/api/channels/${channelSlug}/posts`, {
          method: "POST",
          body: {
            type: hasPdf ? "document" : mediaKeys.length > 0 ? "image" : "text",
            content: content.trim() || undefined,
            mediaKeys: mediaKeys.length > 0 ? mediaKeys : undefined,
            isPinned,
            isUrgent,
          },
        });
      }

      resetComposer();
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Failed to create post");
    } finally {
      setPending(false);
      setUploadPct(null);
      setUploadLabel(null);
    }
  }

  const canSubmit =
    !pending &&
    !recording &&
    (mode === "update"
      ? Boolean(content.trim()) || attachments.length > 0
      : mode === "poll"
        ? Boolean(question.trim())
        : Boolean(voiceBlob));

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p className="text-[12.5px] font-semibold text-danger-600">{error}</p> : null}

      {/* Mode switch */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { key: "update", label: "Update", icon: "pencil" },
            { key: "poll", label: "Poll", icon: "chart" },
            { key: "voice", label: "Voice", icon: "mic" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMode(item.key)}
            disabled={recording || pending}
            aria-pressed={mode === item.key}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-colors disabled:opacity-60",
              mode === item.key
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-ink-200 bg-white/70 text-ink-500 hover:border-brand-200",
            )}
          >
            <Icon name={item.icon} size={14} />
            {item.label}
          </button>
        ))}
      </div>

      <Textarea
        placeholder={
          mode === "poll"
            ? "Add context for your poll (optional)…"
            : mode === "voice"
              ? "Add a caption for your voice note (optional)…"
              : "Share an update with your followers…"
        }
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={mode === "poll" ? 2 : 3}
        maxLength={5000}
      />

      {mode === "update" ? (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            multiple
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />

          {attachments.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {attachments.map((item, index) => {
                const isPdf = baseMime(item.file.type) === "application/pdf";
                return (
                  <div
                    key={`${item.file.name}-${item.file.size}`}
                    className="group relative overflow-hidden rounded-xl border border-ink-100 bg-white"
                  >
                    {item.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.preview}
                        alt={item.file.name}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square flex-col items-center justify-center gap-2 p-3 text-center">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
                          <Icon name="file-text" size={20} />
                        </span>
                        <span className="line-clamp-2 text-[10.5px] font-semibold text-ink-500">
                          {item.file.name}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      aria-label={`Remove ${item.file.name}`}
                      className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-ink-900/70 text-white backdrop-blur-sm transition-colors hover:bg-danger-600"
                    >
                      <Icon name="x" size={12} />
                    </button>
                    {isPdf ? (
                      <span className="absolute bottom-1.5 left-1.5 rounded-chip bg-danger-600 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white uppercase">
                        PDF
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending || attachments.length >= MAX_ATTACHMENTS}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white/70 px-3.5 py-1.5 text-[12px] font-bold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
            >
              <Icon name="image" size={14} />
              Photo / PDF
            </button>
            <span className="text-[11px] font-semibold text-ink-400">
              {attachments.length}/{MAX_ATTACHMENTS} attached · images up to 10 MB, PDF up to 20 MB
            </span>
          </div>
        </div>
      ) : null}

      {mode === "poll" ? (
        <div className="space-y-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3.5">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question — e.g., Which topic should we revise next?"
            maxLength={200}
            required
          />
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex size-7 flex-none items-center justify-center rounded-full bg-white text-[11px] font-bold text-ink-400">
                  {index + 1}
                </span>
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  maxLength={120}
                />
                {options.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    aria-label={`Remove option ${index + 1}`}
                    className="flex-none rounded-full p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Icon name="x" size={14} />
                  </button>
                ) : (
                  <span className="size-7 flex-none" />
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {options.length < 6 ? (
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-600 hover:text-brand-700"
              >
                <Icon name="plus" size={13} /> Add option
              </button>
            ) : (
              <span className="text-[11.5px] text-ink-400">Maximum 6 options</span>
            )}
            <Checkbox
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              label="Allow multiple answers"
            />
          </div>
        </div>
      ) : null}

      {mode === "voice" ? (
        <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3.5">
          {voiceError ? (
            <p className="mb-2 text-[12px] font-semibold text-danger-600">{voiceError}</p>
          ) : null}

          {!voiceBlob ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={recording ? finishRecording : startRecording}
                disabled={pending}
                className={cn(
                  "flex size-11 flex-none items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105",
                  recording
                    ? "animate-pulse bg-danger-500"
                    : "bg-gradient-to-br from-brand-500 to-accent-500",
                )}
                aria-label={recording ? "Stop recording" : "Start recording"}
              >
                <Icon name={recording ? "stop" : "mic"} size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-ink-900">
                  {recording
                    ? `Recording… ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`
                    : "Record a voice message"}
                </p>
                <p className="text-[11.5px] text-ink-400">
                  {recording
                    ? "Tap the red button to stop. Up to 3 minutes."
                    : "Your followers can listen right in the channel feed."}
                </p>
              </div>
              {recording ? (
                <span className="flex items-center gap-1.5 rounded-full bg-danger-50 px-3 py-1 text-[11px] font-bold text-danger-600">
                  <span className="size-1.5 animate-pulse rounded-full bg-danger-500" />
                  LIVE
                </span>
              ) : null}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-bold text-ink-600">Preview your voice message</p>
                <button
                  type="button"
                  onClick={discardRecording}
                  className="inline-flex items-center gap-1 text-[11.5px] font-bold text-ink-400 hover:text-danger-600"
                >
                  <Icon name="rotate-ccw" size={12} /> Re-record
                </button>
              </div>
              {voiceUrl ? (
                <VoicePlayer
                  src={voiceUrl}
                  durationSec={voiceDuration}
                  waveform={waveform}
                  className="mt-2 bg-white"
                />
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            label={
              <span className="flex items-center gap-1">
                <Icon name="pin" size={14} /> Pin post
              </span>
            }
          />
          <Checkbox
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            label={
              <span className="flex items-center gap-1">
                <Icon name="alert" size={14} /> Mark urgent
              </span>
            }
          />
        </div>

        <div className="flex items-center gap-3">
          {uploadPct !== null ? (
            <span className="text-[11.5px] font-semibold text-ink-500">
              {uploadLabel ?? "Uploading"} · {uploadPct}%
            </span>
          ) : null}
          <Button type="submit" disabled={!canSubmit}>
            {pending ? (
              <Icon name="loader" size={16} className="animate-spin" />
            ) : (
              <Icon name="send" size={16} />
            )}
            {mode === "poll" ? "Post poll" : mode === "voice" ? "Post voice note" : "Post"}
          </Button>
        </div>
      </div>
    </form>
  );
}
