"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icons";

export function CreateChannelForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");

  function handleNameChange(value: string) {
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    setSlug(autoSlug);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      description: formData.get("description") as string,
      visibility: formData.get("visibility") as string,
    };

    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to create channel");
      }

      router.push(`/channel/${result.channel.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink-700">
          Channel Name *
        </label>
        <Input
          id="name"
          name="name"
          required
          placeholder="e.g., Chemistry Made Easy"
          onChange={(e) => handleNameChange(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-500">
          The name of your channel as it will appear to followers
        </p>
      </div>

      <div>
        <label htmlFor="slug" className="mb-1 block text-sm font-medium text-ink-700">
          Channel URL *
        </label>
        <div className="flex items-center">
          <span className="mr-1 text-sm text-ink-500">gurulens.us/channel/</span>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="chemistry-made-easy"
            pattern="^[a-z0-9-]+$"
          />
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Lowercase letters, numbers, and hyphens only
        </p>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-ink-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="w-full rounded-lg border border-ink-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="What is your channel about?"
        />
        <p className="mt-1 text-xs text-ink-500">
          Tell potential followers what they can expect
        </p>
      </div>

      <div>
        <label htmlFor="visibility" className="mb-1 block text-sm font-medium text-ink-700">
          Visibility *
        </label>
        <select
          id="visibility"
          name="visibility"
          required
          defaultValue="public"
          className="w-full rounded-lg border border-ink-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="public">Public - Anyone can find and follow</option>
          <option value="private">Private - Only approved followers can see</option>
          <option value="members">Members Only - Only class members can access</option>
        </select>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting && <Icon name="loader" size={16} className="animate-spin" />}
          Create Channel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
