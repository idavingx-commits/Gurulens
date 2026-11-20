"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { apiFetch, ClientApiError } from "@/lib/client";

export function CreateChannelForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    setSlug(autoSlug);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    if (!name.trim()) return setError("Please enter a channel name.");
    if (!slug.trim() || slug.length < 3) return setError("Channel URL must be at least 3 characters.");
    if (!/^[a-z0-9-]+$/.test(slug)) return setError("Channel URL can only contain lowercase letters, numbers, and hyphens.");

    setPending(true);
    try {
      const result = await apiFetch<{ channel: { slug: string } }>("/api/channels", {
        method: "POST",
        body: { name, slug, description, visibility },
      });
      router.push(`/channel/${result.channel.slug}`);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? (
        <InfoNote icon="alert" tone="danger">
          {error}
        </InfoNote>
      ) : null}

      <Field label="Channel name" htmlFor="name" hint="The name of your channel as it will appear to followers">
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., Chemistry Made Easy"
          required
        />
      </Field>

      <Field label="Channel URL" htmlFor="slug" hint="Lowercase letters, numbers, and hyphens only">
        <div className="flex items-center gap-2">
          <span className="flex-none rounded-lg bg-ink-100 px-3 py-2.5 text-sm text-ink-500">
            gurulens.us/channel/
          </span>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="chemistry-made-easy"
            pattern="^[a-z0-9-]+$"
            required
            className="flex-1"
          />
        </div>
      </Field>

      <Field label="Description" htmlFor="description" hint="Tell potential followers what they can expect">
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is your channel about?"
          rows={4}
        />
      </Field>

      <Field label="Visibility" htmlFor="visibility">
        <Select
          id="visibility"
          name="visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="public">Public — Anyone can find and follow</option>
          <option value="private">Private — Only approved followers can see</option>
          <option value="members">Members Only — Only class members can access</option>
        </Select>
      </Field>

      <div className="flex gap-3 pt-3">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? (
            <>
              <Icon name="loader" size={18} className="animate-spin" />
              Creating…
            </>
          ) : (
            "Create Channel"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
