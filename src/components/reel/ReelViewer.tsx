"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { VerifiedTick } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client";
import { compactNumber } from "@/lib/format";

export interface ReelData {
  id: string;
  text: string;
  videoUrl: string;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  author: {
    name: string;
    avatarId: string | null;
    handle: string | null;
    verified: boolean;
  };
}

interface ReelViewerProps {
  reels: ReelData[];
}

export function ReelViewer({ reels }: ReelViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  // Handle scroll snap to detect current reel
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    const newIndex = Math.round(scrollTop / height);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, reels.length]);

  // Scroll to reel helper
  const scrollToReel = useCallback((index: number) => {
    if (!containerRef.current) return;
    const height = containerRef.current.clientHeight;
    containerRef.current.scrollTo({ top: index * height, behavior: "smooth" });
  }, []);

  // Auto-play current video, pause others
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (index === currentIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        scrollToReel(Math.min(currentIndex + 1, reels.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        scrollToReel(Math.max(currentIndex - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, reels.length, scrollToReel]);

  if (reels.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <Icon name="film" size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">No reels yet</p>
          <p className="mt-1 text-sm text-white/60">Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-screen w-full snap-y snap-mandatory overflow-y-scroll bg-black"
      style={{ scrollSnapType: "y mandatory" }}
    >
      {reels.map((reel, index) => (
        <ReelItem
          key={reel.id}
          reel={reel}
          onVideoRef={(el) => {
            if (el) videoRefs.current.set(index, el);
            else videoRefs.current.delete(index);
          }}
        />
      ))}

      {/* Navigation indicators */}
      <div className="fixed top-1/2 right-4 z-50 hidden -translate-y-1/2 flex-col gap-1.5 lg:flex">
        {reels.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToReel(i)}
            className={`size-2 rounded-full transition-all ${
              i === currentIndex ? "scale-125 bg-white" : "bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Go to reel ${i + 1}`}
          />
        ))}
      </div>

      {/* Scroll hint */}
      {currentIndex === 0 && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 animate-bounce text-white/60">
          <Icon name="chevron-down" size={28} />
        </div>
      )}
    </div>
  );
}

function ReelItem({
  reel,
  onVideoRef,
}: {
  reel: ReelData;
  onVideoRef: (el: HTMLVideoElement | null) => void;
}) {
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [isSaved, setIsSaved] = useState(reel.isSaved);
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    onVideoRef(videoRef.current);
    return () => onVideoRef(null);
  }, [onVideoRef]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  };

  const handleLike = async () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    try {
      await apiFetch(`/api/posts/${reel.id}/like`, { method: "POST" });
    } catch {
      setIsLiked(!newLiked);
      setLikeCount((c) => c + (newLiked ? -1 : 1));
    }
  };

  const handleSave = async () => {
    const newSaved = !isSaved;
    setIsSaved(newSaved);
    try {
      await apiFetch(`/api/posts/${reel.id}/save`, { method: "POST" });
    } catch {
      setIsSaved(!newSaved);
    }
  };

  return (
    <div className="relative flex h-screen w-full snap-start snap-always items-center justify-center">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        className="h-full w-full cursor-pointer object-contain"
      />

      {/* Play/Pause overlay */}
      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
            <Icon name="play" size={40} />
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-white/20">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 sm:right-5">
        {/* Like */}
        <button
          onClick={handleLike}
          className="group flex flex-col items-center gap-1"
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          <span
            className={`flex size-12 items-center justify-center rounded-full backdrop-blur-md transition-all ${
              isLiked
                ? "bg-red-500 text-white"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Icon name="heart" size={24} className={isLiked ? "fill-current" : ""} />
          </span>
          <span className="text-xs font-bold text-white">{compactNumber(likeCount)}</span>
        </button>

        {/* Comment */}
        <Link
          href={`/post/${reel.id}`}
          className="group flex flex-col items-center gap-1"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20">
            <Icon name="message" size={24} />
          </span>
          <span className="text-xs font-bold text-white">
            {compactNumber(reel.commentCount)}
          </span>
        </Link>

        {/* Save */}
        <button
          onClick={handleSave}
          className="group flex flex-col items-center gap-1"
          aria-label={isSaved ? "Unsave" : "Save"}
        >
          <span
            className={`flex size-12 items-center justify-center rounded-full backdrop-blur-md transition-all ${
              isSaved
                ? "bg-brand-500 text-white"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Icon name="bookmark" size={24} className={isSaved ? "fill-current" : ""} />
          </span>
          <span className="text-xs font-bold text-white">Save</span>
        </button>

        {/* Share */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: reel.text,
                url: `${window.location.origin}/post/${reel.id}`,
              });
            }
          }}
          className="group flex flex-col items-center gap-1"
          aria-label="Share"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20">
            <Icon name="share" size={24} />
          </span>
          <span className="text-xs font-bold text-white">Share</span>
        </button>

        {/* Mute toggle */}
        <button
          onClick={toggleMute}
          className="group flex flex-col items-center gap-1"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20">
            <Icon name={isMuted ? "mute" : "volume"} size={20} />
          </span>
        </button>
      </div>

      {/* Bottom info overlay */}
      <div className="absolute right-20 bottom-8 left-4 sm:right-24 sm:left-6">
        {/* Author info */}
        <Link
          href={reel.author.handle ? `/teacher/${reel.author.handle}` : "#"}
          className="group mb-3 flex items-center gap-3"
        >
          <Avatar
            name={reel.author.name}
            src={reel.author.avatarId ? `/api/media/${reel.author.avatarId}` : null}
            size="md"
            className="ring-2 ring-white/30"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white drop-shadow-lg">
                {reel.author.name}
              </span>
              {reel.author.verified && <VerifiedTick />}
            </div>
            {reel.author.handle && (
              <span className="text-sm text-white/70">@{reel.author.handle}</span>
            )}
          </div>
          <button className="ml-2 rounded-full border border-white/50 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/20">
            Follow
          </button>
        </Link>

        {/* Caption */}
        <p className="line-clamp-3 text-sm leading-relaxed text-white drop-shadow-lg">
          {reel.text}
        </p>

        {/* Views */}
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/70">
          <Icon name="eye" size={14} />
          {compactNumber(reel.viewCount)} views
        </div>
      </div>

      {/* Gradient overlays for readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent"
      />
    </div>
  );
}
