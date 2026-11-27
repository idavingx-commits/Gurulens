"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input } from "@/components/ui/input";

import { Spinner } from "@/components/ui/interactive";
import { ClientApiError, apiFetch } from "@/lib/client";

type Existing = { subdomain: string } | null;

/**
 * Claim / connect a branded LMS subdomain for a campus. Shown in the campus
 * manager so a school or institute can switch its learning hub on.
 */
export function LmsClaimCard({
  organizationId,
  organizationName,
  existing,
}: {
  organizationId: string;
  organizationName: string;
  existing: Existing;
}) {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState(existing?.subdomain ?? "");
  const [name, setName] = useState(organizationName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function claim(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ workspace: { subdomain: string } }>("/api/lms/workspaces", {
        method: "POST",
        body: {
          subdomain: subdomain.trim(),
          name: name.trim() || organizationName,
          organizationId,
        },
      });
      setMessage({
        tone: "ok",
        text: `Your hub is live at ${result.workspace.subdomain}.gurulens.us`,
      });
      router.refresh();
    } catch (err) {
      setMessage({
        tone: "err",
        text: err instanceof ClientApiError ? err.message : "Could not claim that subdomain.",
      });
    } finally {
      setBusy(false);
    }
  }

  const hubUrl = existing
    ? process.env.NODE_ENV === "production"
      ? `https://${existing.subdomain}.gurulens.us`
      : `/lms/${existing.subdomain}`
    : null;

  return (
    <section className="glass overflow-hidden rounded-card bg-gradient-to-br from-brand-50/70 via-white to-accent-100/40">
      <div className="flex flex-wrap items-start gap-3 p-5">
        <span className="flex size-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-lg shadow-brand-500/25">
          <Icon name="globe" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-extrabold text-ink-900">Branded learning hub</h2>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9.5px] font-black tracking-wide text-brand-700 uppercase ring-1 ring-brand-100">
              LMS
            </span>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
            Launch a full course platform for {organizationName} at its own address — courses,
            lessons, learners and progress tracking, all in one place.
          </p>
        </div>
      </div>

      {hubUrl ? (
        <div className="mx-5 mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 bg-white/80 p-4">
          <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-success-100 text-success-600">
            <Icon name="check" size={16} strokeWidth={3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold text-ink-900">Your hub is live</p>
            <p className="truncate text-[12.5px] text-ink-500">
              <span className="font-bold text-ink-800">{hubUrl}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={hubUrl}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-ink-800"
            >
              <Icon name="external" size={13} /> Open hub
            </Link>
            <Link
              href={`/lms/${existing!.subdomain}/manage`}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-[12px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <Icon name="settings" size={13} /> Manage
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={claim} className="mx-5 mb-5 space-y-4 rounded-2xl border border-ink-100 bg-white/80 p-4">
          <Field
            label="Choose your subdomain"
            htmlFor="org-lms-subdomain"
            hint="Learners will visit this address. Lowercase letters, numbers and dashes."
          >
            <div className="flex items-stretch">
              <Input
                id="org-lms-subdomain"
                value={subdomain}
                onChange={(event) =>
                  setSubdomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                placeholder="mycampus"
                className="rounded-r-none font-mono"
                spellCheck={false}
                maxLength={30}
              />
              <span className="inline-flex items-center rounded-r-xl border border-l-0 border-ink-200 bg-ink-50 px-3 text-[12.5px] font-bold text-ink-500">
                .gurulens.us
              </span>
            </div>
          </Field>

          <Field label="Hub name" htmlFor="org-lms-name">
            <Input
              id="org-lms-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
            />
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

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy || subdomain.trim().length < 3}>
              {busy ? <Spinner size={14} /> : <Icon name="zap" size={14} />} Claim hub
            </Button>
            <span className="text-[11.5px] text-ink-400">
              Free during launch · payment plans arrive later with notice.
            </span>
          </div>
        </form>
      )}
    </section>
  );
}
