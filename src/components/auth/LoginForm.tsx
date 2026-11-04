"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/interactive";
import { apiFetch, ClientApiError } from "@/lib/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const data = await apiFetch<{ role: string }>("/api/auth/login", {
        method: "POST",
        body: { email, password, totp: totp || undefined },
      });

      const fallback =
        data.role === "teacher" ? "/studio" : data.role === "admin" || data.role === "moderator" ? "/admin" : "/feed";
      router.push(next && next.startsWith("/") ? next : fallback);
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError && err.code === "mfa_required") {
        setMfaRequired(true);
        setError(null);
      } else if (err instanceof ClientApiError && err.code === "mfa_invalid") {
        setMfaRequired(true);
        setError("Invalid authenticator code. Try again.");
      } else {
        setError(err instanceof ClientApiError ? err.message : "Sign in failed. Please try again.");
      }
      setPending(false);
    }
  }

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-3xl bg-white p-8 shadow-xl ring-1 ring-ink-100 sm:p-10">
      {/* Gradient top accent */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500"
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <span className="flex size-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/25">
          <Icon name="lock" size={26} />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink-900">Welcome back</h1>
          <p className="text-[13px] font-semibold text-ink-400">Sign in to your GuruLens account</p>
        </div>
      </div>

      <p
        lang="si"
        className="font-si mt-5 rounded-xl bg-brand-50 p-4 text-[14px] leading-[1.85] font-semibold text-ink-600"
      >
        ගුරුවරුන් follow කරන්න, පාඩම් සුරකින්න සහ ඔබේ සමාලෝචන පාලනය කරන්න.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {mfaRequired ? (
          <Field
            label="Authenticator code"
            htmlFor="totp"
            hint="Open your authenticator app and enter the 6-digit code."
          >
            <Input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="tracking-[0.35em]"
            />
          </Field>
        ) : null}

        {error ? <InfoNote tone="danger" icon="alert">{error}</InfoNote> : null}

        <Button type="submit" size="lg" className="w-full shadow-lg shadow-brand-500/25" disabled={pending}>
          {pending ? <Spinner size={16} /> : null}
          {pending ? "Signing in…" : "Sign in"}
          {!pending && <Icon name="arrow-right" size={18} />}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative mt-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-ink-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-[12px] font-semibold text-ink-400">New to GuruLens?</span>
        </div>
      </div>

      <Link
        href="/register"
        className="mt-6 flex items-center justify-center gap-2 rounded-full border-2 border-ink-200 py-3 text-[14px] font-bold text-ink-700 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
      >
        Create an account
        <Icon name="sparkles" size={16} />
      </Link>
    </div>
  );
}
