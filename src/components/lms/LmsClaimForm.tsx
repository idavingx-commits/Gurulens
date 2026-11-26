"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ClientApiError, apiFetch } from "@/lib/client";
import { cn } from "@/lib/format";

type Availability = {
  available: boolean;
  reason: string | null;
  normalized: string;
};

const PRESETS = ["myhub", "academy", "tuition", "classes"];

function pretty(value: string): string {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LmsClaimForm({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [brandColor, setBrandColor] = useState("#0094fd");
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<Availability | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function checkAvailability(value: string) {
    const slug = value.trim().toLowerCase();
    if (slug.length < 3) {
      setStatus(null);
      return;
    }
    setChecking(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const result = await apiFetch<Availability>(
          `/api/lms/workspaces?subdomain=${encodeURIComponent(slug)}`,
        );
        setStatus(result);
      } catch {
        setStatus(null);
      } finally {
        setChecking(false);
      }
    }, 350);
  }

  function onSubdomainChange(value: string) {
    const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(slug);
    setError(null);
    if (!name) setName(pretty(slug));
    checkAvailability(slug);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!signedIn) {
      router.push("/register/teacher");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiFetch<{ workspace: { subdomain: string } }>("/api/lms/workspaces", {
        method: "POST",
        body: {
          subdomain,
          name: name.trim() || pretty(subdomain),
          ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
          brandColor,
        },
      });
      router.push(`/lms/${result.workspace.subdomain}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not claim that subdomain.");
      setSubmitting(false);
    }
  }

  const canSubmit = subdomain.length >= 3 && status?.available === true && !submitting;

  return (
    <form onSubmit={submit} className="card overflow-hidden">
      <div className="border-b border-ink-100 bg-gradient-to-r from-brand-50/80 to-accent-50/50 px-5 py-4">
        <h3 className="text-[15px] font-extrabold text-ink-900">Reserve your address</h3>
        <p className="mt-0.5 text-[12px] text-ink-500">
          Choose a name — we&apos;ll build your hub around it.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <Field
          label="Subdomain"
          htmlFor="lms-subdomain"
          error={
            status && !status.available && subdomain.length >= 3 ? status.reason : error
          }
          hint={
            status?.available
              ? "Available — grab it before someone else does."
              : "Lowercase letters, numbers and dashes. At least 3 characters."
          }
        >
          <div className="flex items-stretch gap-0">
            <Input
              id="lms-subdomain"
              value={subdomain}
              onChange={(event) => onSubdomainChange(event.target.value)}
              placeholder="acme"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                "rounded-r-none",
                status?.available && "border-success-500 focus:border-success-500 focus:ring-success-100",
              )}
            />
            <span className="inline-flex items-center rounded-r-xl border border-l-0 border-ink-200 bg-ink-50 px-3 text-[12.5px] font-bold text-ink-500">
              .gurulens.us
            </span>
          </div>
        </Field>

        {subdomain.length < 3 ? (
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onSubdomainChange(preset)}
                className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-bold text-ink-500 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                {preset}.gurulens.us
              </button>
            ))}
          </div>
        ) : null}

        <Field label="Hub name" htmlFor="lms-name">
          <Input
            id="lms-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme Academy"
            maxLength={80}
          />
        </Field>

        <Field label="Tagline" htmlFor="lms-tagline" hint="Optional — shown under your name.">
          <Input
            id="lms-tagline"
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            placeholder="Learn with confidence"
            maxLength={120}
          />
        </Field>

        <Field label="Description" htmlFor="lms-description" hint="Optional — what learners will find here.">
          <Textarea
            id="lms-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Courses, resources and announcements for our learners."
            maxLength={1000}
            className="min-h-20"
          />
        </Field>

        <Field label="Brand colour" htmlFor="lms-color">
          <div className="flex items-center gap-3">
            <input
              id="lms-color"
              type="color"
              value={brandColor}
              onChange={(event) => setBrandColor(event.target.value)}
              className="size-10 cursor-pointer rounded-xl border border-ink-200 bg-white p-1"
            />
            <Input
              value={brandColor}
              onChange={(event) => setBrandColor(event.target.value)}
              className="max-w-36 font-mono uppercase"
              maxLength={7}
            />
            <span className="text-[11.5px] text-ink-400">Used across your hub header and buttons.</span>
          </div>
        </Field>

        {!signedIn ? (
          <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-3.5 text-[12.5px] leading-relaxed text-brand-800">
            Creating a hub needs a GuruLens account.{" "}
            <Link href="/register/teacher" className="font-bold underline">
              Sign up free
            </Link>{" "}
            — it takes under a minute.
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={!signedIn ? false : !canSubmit}>
          {submitting
            ? "Claiming…"
            : checking
              ? "Checking…"
              : signedIn
                ? "Claim my subdomain"
                : "Continue to sign up"}
          {!checking && !submitting ? <Icon name="arrow-right" size={15} /> : null}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-ink-400">
          Free during launch · payment plans arrive later with notice · you can change your subdomain
          later.
        </p>
      </div>
    </form>
  );
}
