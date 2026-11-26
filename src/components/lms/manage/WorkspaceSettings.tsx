"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Textarea } from "@/components/ui/input";

import { Spinner } from "@/components/ui/interactive";
import { ClientApiError, apiFetch } from "@/lib/client";
import { lmsLimitLabel } from "@/lib/lms-shared";

type Workspace = {
  id: string;
  subdomain: string;
  name: string;
  tagline: string | null;
  description: string | null;
  brandColor: string;
  logoKey: string | null;
  coverKey: string | null;
};

type Limits = { courses: number; lessons: number; students: number };
type Usage = { courses: number; lessons: number; learners: number };

export function WorkspaceSettings({
  workspace,
  limits,
  usage,
}: {
  workspace: Workspace;
  limits: Limits;
  usage: Usage;
}) {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState(workspace.subdomain);
  const [name, setName] = useState(workspace.name);
  const [tagline, setTagline] = useState(workspace.tagline ?? "");
  const [description, setDescription] = useState(workspace.description ?? "");
  const [brandColor, setBrandColor] = useState(workspace.brandColor);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch(`/api/lms/workspaces`, {
        method: "PATCH",
        body: {
          id: workspace.id,
          subdomain: subdomain.trim(),
          name: name.trim(),
          tagline: tagline.trim(),
          description: description.trim(),
          brandColor: brandColor.trim(),
        },
      });
      setMessage({ tone: "ok", text: "Settings saved." });
      router.refresh();
    } catch (err) {
      setMessage({
        tone: "err",
        text: err instanceof ClientApiError ? err.message : "Could not save settings.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <form onSubmit={save} className="card space-y-4 p-5">
        <Field
          label="Subdomain"
          htmlFor="ws-subdomain"
          hint={`Learners visit ${subdomain || "yourname"}.gurulens.us`}
        >
          <div className="flex items-stretch">
            <Input
              id="ws-subdomain"
              value={subdomain}
              onChange={(event) =>
                setSubdomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              className="rounded-r-none font-mono"
              spellCheck={false}
              maxLength={30}
            />
            <span className="inline-flex items-center rounded-r-xl border border-l-0 border-ink-200 bg-ink-50 px-3 text-[12.5px] font-bold text-ink-500">
              .gurulens.us
            </span>
          </div>
        </Field>

        <Field label="Hub name" htmlFor="ws-name">
          <Input
            id="ws-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
          />
        </Field>

        <Field label="Tagline" htmlFor="ws-tagline">
          <Input
            id="ws-tagline"
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            placeholder="Learn with confidence"
            maxLength={120}
          />
        </Field>

        <Field label="Description" htmlFor="ws-description">
          <Textarea
            id="ws-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What learners will find in this hub."
            maxLength={1000}
            className="min-h-24"
          />
        </Field>

        <Field label="Brand colour" htmlFor="ws-color">
          <div className="flex items-center gap-3">
            <input
              id="ws-color"
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
          </div>
        </Field>

        {message ? (
          <p
            className={
              message.tone === "ok"
                ? "text-[12.5px] font-semibold text-success-600"
                : "text-[12.5px] font-semibold text-danger-600"
            }
          >
            {message.text}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner size={14} /> : <Icon name="check" size={14} strokeWidth={3} />} Save
            settings
          </Button>
          <Link
            href={`/lms/${subdomain || workspace.subdomain}`}
            className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-[13px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
          >
            <Icon name="external" size={14} /> View hub
          </Link>
        </div>
      </form>

      <div className="space-y-4">
        <div className="card p-5">
          <h3 className="text-[13.5px] font-extrabold text-ink-900">Your plan</h3>
          <p className="mt-1 text-[12px] text-ink-500">
            Every plan is free during the GuruLens launch. Payment arrives later with advance notice.
          </p>
          <div className="mt-3 space-y-2">
            {[
              { label: "Courses", used: usage.courses, limit: limits.courses },
              { label: "Lessons", used: usage.lessons, limit: limits.lessons },
              { label: "Learners", used: usage.learners, limit: limits.students },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl bg-ink-50/70 px-3 py-2.5 text-[12.5px]"
              >
                <span className="font-semibold text-ink-500">{item.label}</span>
                <span className="font-black text-ink-800">
                  {item.used} / {lmsLimitLabel(item.limit)}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/pricing"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-[12px] font-bold text-white hover:bg-ink-800"
          >
            <Icon name="star" size={13} /> View plans
          </Link>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <h3 className="text-[13px] font-extrabold text-brand-800">Need a bigger hub?</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-brand-700">
            As your learner count grows, move to a plan with more courses, lessons and students.
          </p>
          <Link
            href="/contact"
            className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand-700 underline"
          >
            Contact the team <Icon name="arrow-right" size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
