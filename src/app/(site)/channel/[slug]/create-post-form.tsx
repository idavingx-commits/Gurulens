"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";

interface CreatePostFormProps {
  channelId: string;
  channelSlug: string;
}

export function CreatePostForm({ channelId, channelSlug }: CreatePostFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/channels/${channelSlug}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          content: content.trim(),
          isPinned,
          isUrgent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create post");
      }

      setContent("");
      setIsPinned(false);
      setIsUrgent(false);

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      <textarea
        placeholder="Share an update with your followers..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-lg border border-ink-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" title="Add image">
            <Icon name="image" size={16} />
          </Button>
          <Button variant="outline" size="sm" title="Record voice message">
            <Icon name="mic" size={16} />
          </Button>
          <Button variant="outline" size="sm" title="Create poll">
            <Icon name="bar-chart-2" size={16} />
          </Button>
          <div className="mx-2 h-6 border-l" />
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`rounded p-2 transition-colors ${
              isPinned ? "bg-brand-100 text-brand-700" : "hover:bg-ink-100 text-ink-500"
            }`}
            title="Pin this post"
          >
            <Icon name="pin" size={16} />
          </button>
          <button
            type="button"
            onClick={() => setIsUrgent(!isUrgent)}
            className={`rounded p-2 transition-colors ${
              isUrgent ? "bg-danger-100 text-danger-700" : "hover:bg-ink-100 text-ink-500"
            }`}
            title="Mark as urgent"
          >
            <Icon name="alert-triangle" size={16} />
          </button>
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? (
            <Icon name="loader" size={16} className="animate-spin" />
          ) : (
            <Icon name="send" size={16} />
          )}
          Post
        </Button>
      </div>
    </div>
  );
}
