"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { VerifiedTick } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client";
import { compactNumber } from "@/lib/format";
import { ReelCommentsSheet, type ReelViewerUser } from "./reel-comments-sheet";

export interface ReelData {
  id: string;
  text: string;
  videoUrl: string;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  authorId: string;
  author: {
    name: string;
    avatarId: string | null;
    handle: string | null;
    verified: boolean;
  };
}

interface ReelViewerProps {
  reels: ReelData[];
  viewer?: ReelViewerUser | null;
}

/** Distance from the bottom safe area for the action rail. */
const RAIL_BOTTOM = "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)";

export function ReelViewer({ reels, viewer = null }: ReelViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsReelId, setCommentsReelId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(reels.map((reel) => [reel.id, reel.commentCount])),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const commentsReel = commentsReelId
    ? (reels.find((reel) => reel.id === commentsReelId) ?? null)
    : null;

  const registerVideo = useCallback((index: number, el: HTMLVideoElement | null) => {
    if (el) videoRefs.current.set(index, el);
    else videoRefs.current.delete(index);
  }, []);

  const registerItem = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(index, el);
    else itemRefs.current.delete(index);
  }, []);

  // Scroll to reel helper
  const scrollToReel = useCallback((index: number) => {
    if (!containerRef.current) return;
    const height = containerRef.current.clientHeight;
    containerRef.current.scrollTo({ top: index * height, behavior: "smooth" });
  }, []);

  // Detect the visible reel with an observer so dynamic viewport changes
  // (mobile browser chrome, rotation) do not throw the index off like
  // scrollTop / clientHeight arithmetic does.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.reelIndex);
          if (Number.isInteger(index)) setCurrentIndex(index);
        }
      },
      { root: container, threshold: 0.55 },
    );

    itemRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reels.length]);

  // Auto-play current video, pause others. Everything pauses while the
  // comment sheet is open so the reel does not keep playing behind it.
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (index === currentIndex && !commentsReelId) {
        video.muted = true;
        void video.play().catch(() => {});
      } else {
        video.pause();
        if (index !== currentIndex) {
          try {
            video.currentTime = 0;
          } catch {
            // Metadata may not be loaded yet.
          }
        }
      }
    });
  }, [currentIndex, commentsReelId]);

  // Keyboard navigation — ignored while typing or while comments are open.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (commentsReelId) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        scrollToReel(Math.min(currentIndex + 1, reels.length - 1));
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        scrollToReel(Math.max(currentIndex - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, reels.length, scrollToReel, commentsReelId]);

  if (reels.length === 0) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black text-white lg:h-[calc(100dvh-4rem)]">
        <div className="px-6 text-center">
          <Icon name="film" size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">No reels yet</p>
          <p className="mt-1 text-sm text-white/60">Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black lg:relative lg:inset-auto lg:z-auto"
      style={{ height: "100dvh" }}
    >
      <div
        ref={containerRef}
        className={
          commentsReelId
            ? "h-full w-full overflow-hidden bg-black"
            : "h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-y-contain bg-black [-webkit-overflow-scrolling:touch]"
        }
      >
        {reels.map((reel, index) => (
          <ReelItem
            key={reel.id}
            reel={reel}
            index={index}
            isActive={index === currentIndex}
            commentCount={commentCounts[reel.id] ?? reel.commentCount}
            onOpenComments={() => setCommentsReelId(reel.id)}
            registerItem={registerItem}
            registerVideo={registerVideo}
          />
        ))}
      </div>

      {/* Navigation indicators - desktop only */}
      <div className="pointer-events-none absolute top-1/2 right-4 z-50 hidden -translate-y-1/2 flex-col gap-1.5 lg:flex">
        {reels.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToReel(i)}
            className={`pointer-events-auto size-2 rounded-full transition-all ${
              i === currentIndex ? "scale-125 bg-white" : "bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Go to reel ${i + 1}`}
          />
        ))}
      </div>

      {/* Scroll hint */}
      {currentIndex === 0 && reels.length > 1 && !commentsReelId ? (
        <div
          className="pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 animate-bounce text-white/60"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
        >
          <Icon name="chevron-down" size={26} />
        </div>
      ) : null}

      {/* TikTok-style comment popup */}
      {commentsReel ? (
        <ReelCommentsSheet
          postId={commentsReel.id}
          postAuthorId={commentsReel.authorId}
          initialCount={commentCounts[commentsReel.id] ?? commentsReel.commentCount}
          viewer={viewer}
          onClose={() => setCommentsReelId(null)}
          onCountChange={(count) =>
            setCommentCounts((prev) => ({ ...prev, [commentsReel.id]: count }))
          }
        />
      ) : null}
    </div>
  );
}

function ReelItem({
  reel,
  index,
  isActive,
  commentCount,
  onOpenComments,
  registerItem,
  registerVideo,
}: {
  reel: ReelData;
  index: number;
  isActive: boolean;
  commentCount: number;
  onOpenComments: () => void;
  registerItem: (index: number, el: HTMLDivElement | null) => void;
  registerVideo: (index: number, el: HTMLVideoElement | null) => void;
}) {
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [isSaved, setIsSaved] = useState(reel.isSaved);
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [shared, setShared] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    registerVideo(index, videoRef.current);
    return () => registerVideo(index, null);
  }, [index, registerVideo]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      void videoRef.current.play().catch(() => {});
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
    const video = videoRef.current;
    if (!video.duration || Number.isNaN(video.duration)) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  const handleLike = async () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount((c) => Math.max(0, c + (newLiked ? 1 : -1)));
    try {
      await apiFetch(`/api/posts/${reel.id}/like`, { method: "POST" });
    } catch {
      setIsLiked(!newLiked);
      setLikeCount((c) => Math.max(0, c + (newLiked ? -1 : 1)));
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

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${reel.id}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: reel.text || "GuruLens reel", url });
        return;
      } catch {
        // User dismissed the share sheet.
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      } catch {
        // Clipboard blocked.
      }
    }
  };

  return (
    <div
      ref={(el) => registerItem(index, el)}
      data-reel-index={index}
      className="relative flex h-full w-full snap-start snap-always items-center justify-center overflow-hidden"
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        loop
        muted={isMuted}
        playsInline
        preload={isActive ? "auto" : "metadata"}
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        className="h-full w-full cursor-pointer object-contain"
      />

      {/* Play/Pause overlay */}
      {!isPlaying ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play reel"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm sm:size-20">
            <Icon name="play" size={32} />
          </span>
        </button>
      ) : null}

      {/* Progress bar */}
      <button
        type="button"
        aria-label="Seek video"
        onClick={(event) => {
          const video = videoRef.current;
          if (!video || !video.duration) return;
          const rect = event.currentTarget.getBoundingClientRect();
          video.currentTime = ((event.clientX - rect.left) / rect.width) * video.duration;
        }}
        className="absolute top-0 right-0 left-0 z-10 h-6 bg-transparent"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <span className="absolute inset-x-0 top-0 h-[3px] bg-white/25">
          <span
            className="block h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </span>
      </button>

      {/* Right side actions */}
      <div
        className="absolute right-2 z-20 flex flex-col items-center gap-4 sm:right-4 sm:gap-5"
        style={{ bottom: RAIL_BOTTOM }}
      >
        <ActionButton
          onClick={handleLike}
          label={isLiked ? "Unlike" : "Like"}
          caption={compactNumber(likeCount)}
          icon="heart"
          active={isLiked}
          activeClass="bg-red-500 text-white"
          iconFilled={isLiked}
        />

        <button
          type="button"
          onClick={onOpenComments}
          className="group flex flex-col items-center gap-1"
          aria-label="Open comments"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:size-12">
            <Icon name="message" size={22} />
          </span>
          <span className="text-[11px] font-bold text-white sm:text-xs">
            {compactNumber(commentCount)}
          </span>
        </button>

        <ActionButton
          onClick={handleSave}
          label={isSaved ? "Unsave" : "Save"}
          caption="Save"
          icon="bookmark"
          active={isSaved}
          activeClass="bg-brand-500 text-white"
          iconFilled={isSaved}
        />

        <ActionButton
          onClick={handleShare}
          label="Share"
          caption={shared ? "Copied" : "Share"}
          icon={shared ? "check" : "share"}
        />

        <button
          type="button"
          onClick={toggleMute}
          className="flex flex-col items-center gap-1"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20">
            <Icon name={isMuted ? "mute" : "volume"} size={18} />
          </span>
        </button>
      </div>

      {/* Bottom info overlay */}
      <div
        className="absolute right-16 left-3 z-20 sm:right-24 sm:left-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
      >
        <Link
          href={reel.author.handle ? `/teacher/${reel.author.handle}` : "/explore"}
          className="group mb-2.5 flex items-center gap-2.5"
        >
          <Avatar
            name={reel.author.name}
            src={reel.author.avatarId ? `/api/media/${reel.author.avatarId}` : null}
            size="sm"
            className="ring-2 ring-white/30"
          />
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-bold text-white drop-shadow-lg">
              {reel.author.name}
            </span>
            {reel.author.verified ? <VerifiedTick /> : null}
          </span>
          {reel.author.handle ? (
            <span className="truncate text-xs text-white/70">@{reel.author.handle}</span>
          ) : null}
        </Link>

        <p className="line-clamp-3 text-[13px] leading-relaxed text-white drop-shadow-lg sm:text-sm">
          {reel.text}
        </p>

        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
          <Icon name="eye" size={13} />
          {compactNumber(reel.viewCount)} views
          {isActive ? (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
              <span className="size-1.5 rounded-full bg-brand-400" />
              Playing
            </span>
          ) : null}
        </div>
      </div>

      {/* Gradient overlays for readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-72 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/55 to-transparent"
      />
    </div>
  );
}

function ActionButton({
  onClick,
  label,
  caption,
  icon,
  active = false,
  activeClass = "",
  iconFilled = false,
}: {
  onClick: () => void;
  label: string;
  caption: string;
  icon: string;
  active?: boolean;
  activeClass?: string;
  iconFilled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1" aria-label={label}>
      <span
        className={`flex size-11 items-center justify-center rounded-full backdrop-blur-md transition-all sm:size-12 ${
          active ? activeClass : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        <Icon name={icon} size={22} className={iconFilled ? "fill-current" : ""} />
      </span>
      <span className="text-[11px] font-bold text-white sm:text-xs">{caption}</span>
    </button>
  );
}
