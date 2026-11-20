"use client";

import { useRef, useState } from "react";

import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

const BAR_COUNT = 36;

/** Deterministic fallback waveform when the recording did not provide peaks. */
function fallbackWaveform(): number[] {
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const wave = Math.sin((i / BAR_COUNT) * Math.PI * 3.2);
    const wave2 = Math.sin((i / BAR_COUNT) * Math.PI * 7.4 + 1.2);
    return 0.28 + Math.abs(wave * 0.42 + wave2 * 0.3);
  });
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function VoicePlayer({
  src,
  durationSec,
  waveform,
  className,
}: {
  src: string;
  durationSec: number;
  waveform?: number[] | null;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState(false);

  const peaks =
    waveform && waveform.length >= 8
      ? waveform.slice(0, BAR_COUNT).map((n) => Math.min(1, Math.max(0.08, n)))
      : fallbackWaveform();
  const duration = Math.max(1, durationSec);
  const progress = Math.min(1, elapsed / duration);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setFailed(true));
    } else {
      audio.pause();
    }
  }

  function seekTo(ratio: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.min(1, Math.max(0, ratio)) * duration;
    try {
      audio.currentTime = target;
      setElapsed(target);
    } catch {
      // Seeking is not available until metadata has loaded.
    }
  }

  return (
    <div
      className={cn(
        "mt-3 flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50/60 p-2.5",
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setElapsed(0);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          if (Number.isFinite(audio.currentTime)) setElapsed(audio.currentTime);
        }}
        onError={() => setFailed(true)}
      />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className="flex size-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-md transition-transform hover:scale-105"
      >
        <Icon name={playing ? "pause" : "play"} size={15} />
      </button>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Voice message position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(Math.min(elapsed, duration))}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          seekTo((event.clientX - rect.left) / rect.width);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            seekTo((elapsed + 5) / duration);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            seekTo((elapsed - 5) / duration);
          }
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            toggle();
          }
        }}
        className="group flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-[2px] rounded-lg focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none"
      >
        {peaks.map((peak, index) => {
          const filled = index / peaks.length <= progress;
          return (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                "w-full rounded-full transition-colors",
                filled ? "bg-brand-500" : "bg-ink-200 group-hover:bg-ink-300",
              )}
              style={{ height: `${Math.round(peak * 100)}%` }}
            />
          );
        })}
      </div>

      <span className="flex-none text-[11.5px] font-bold tabular-nums text-ink-500">
        {failed ? "Unavailable" : `${formatDuration(elapsed)} / ${formatDuration(duration)}`}
      </span>
    </div>
  );
}
