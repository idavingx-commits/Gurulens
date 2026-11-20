"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/client";

export function CreatePostForm({ channelSlug }: { channelSlug: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !content.trim()) return;
    setError(null);
    setPending(true);

    try {
      await apiFetch(`/api/channels/${channelSlug}/posts`, {
        method: "POST",
        body: { type: "text", content: content.trim(), isPinned, isUrgent },
      });
      setContent("");
      setIsPinned(false);
      setIsUrgent(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Failed to create post");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p className="text-sm font-medium text-danger-600">{error}</p>
      )}
      <Textarea
        placeholder="Share an update with your followers…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
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
                <Icon name="alert-triangle" size={14} /> Mark urgent
              </span>
            }
          />
        </div>
        <Button type="submit" disabled={pending || !content.trim()}>
          {pending ? (
            <Icon name="loader" size={16} className="animate-spin" />
          ) : (
            <Icon name="send" size={16} />
          )}
          Post
        </Button>
      </div>
    </form>
  );
}
