"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/format";

export function FollowButton({
  handle,
  initialFollowing,
  initialCount,
  isAuthenticated,
  className,
}: {
  handle: string;
  initialFollowing: boolean;
  initialCount: number;
  isAuthenticated: boolean;
  className?: string;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function toggle() {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/teacher/${handle}`)}`);
      return;
    }
    if (pending) return;
    const next = !following;
    setFollowing(next);
    setCount((n) => n + (next ? 1 : -1));
    startTransition(async () => {
      try {
        const res = await apiFetch<{ following: boolean; followerCount: number }>(
          `/api/teachers/${handle}/follow`,
          { method: next ? "POST" : "DELETE" },
        );
        setFollowing(res.following);
        setCount(res.followerCount);
        if (res.following) toast.success("You are now following this teacher.");
      } catch (err) {
        setFollowing(!next);
        setCount((n) => n + (next ? -1 : 1));
        toast.error(err instanceof Error ? err.message : "Could not update follow state.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={following}
      className={cn(
        "inline-flex items-center gap-2 rounded-chip px-5 py-2.5 text-[13.5px] font-bold transition-all",
        following
          ? "border border-ink-200 bg-white/80 text-ink-700 hover:border-danger-500/40 hover:text-danger-600"
          : "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-[0_6px_20px_rgba(0,148,253,0.35)] hover:brightness-105",
        className,
      )}
    >
      <Icon name={following ? "check" : "plus"} size={15} strokeWidth={2.6} />
      {following ? "Following" : "Follow"}
      {count > 0 ? <span className="font-semibold opacity-80 tabular-nums">· {count}</span> : null}
    </button>
  );
}
