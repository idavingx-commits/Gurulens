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
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [emailUnverified, setEmailUnverified] = useState(false);
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
        data.role === "teacher"
          ? "/studio"
          : data.role === "admin" || data.role === "moderator"
            ? "/admin"
            : "/feed";
      router.push(next && next.startsWith("/") ? next : fallback);
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError && err.code === "mfa_required") {
        setMfaRequired(true);
        setError(null);
      } else if (err instanceof ClientApiError && err.code === "mfa_invalid") {
        setMfaRequired(true);
        setError("Invalid authenticator code. Try again.");
      } else if (err instanceof ClientApiError && err.code === "email_unverified") {
        setEmailUnverified(true);
        setError(null);
      } else {
        setError(err instanceof ClientApiError ? err.message : "Sign in failed. Please try again.");
      }
      setPending(false);
    }
  }

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-[1.9rem] border border-white bg-white/95 p-7 shadow-[0_30px_80px_-30px_rgba(10,27,61,0.3)] ring-1 ring-ink-100/80 backdrop-blur-xl sm:p-10">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-20 size-56 rounded-full bg-brand-100/60 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex size-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-ink-900 via-brand-700 to-brand-600 text-white shadow-[0_10px_24px_rgba(10,27,61,0.28)]">
              <Icon name="lock" size={22} />
            </span>
            <div>
              <h1 className="text-[25px] leading-tight font-black tracking-tight text-ink-900">
                Welcome back
              </h1>
              <p className="text-[12.5px] font-semibold text-ink-400">
                Sign in to continue learning
              </p>
            </div>
          </div>
          <span className="mt-1 hidden flex-none items-center gap-1 rounded-full bg-success-100 px-2.5 py-1 text-[10px] font-black tracking-wide text-success-600 uppercase sm:inline-flex">
            <span className="size-1.5 rounded-full bg-success-500" />
            Free launch
          </span>
        </div>

        <p
          lang="si"
          className="font-si mt-4 rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-[13px] leading-[1.8] font-semibold text-ink-600"
        >
          ගුරුවරුන් follow කරන්න, පාඩම් සුරකින්න සහ ඔබේ සමාලෝචන පාලනය කරන්න.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email" htmlFor="email">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-300">
                <Icon name="mail" size={16} />
              </span>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 pl-10"
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="password">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-300">
                <Icon name="lock" size={16} />
              </span>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 pr-20 pl-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
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
                className="h-12 text-center text-[18px] font-bold tracking-[0.4em]"
              />
            </Field>
          ) : null}

          {emailUnverified ? (
            <InfoNote tone="warn" icon="mail">
              <p className="font-bold">Verify your email to sign in.</p>
              <p className="mt-1">
                We sent a 6-digit code to <span className="font-bold">{email}</span>. Enter it on
                the verification page to activate your account.
              </p>
              <Link
                href={`/verify-email?email=${encodeURIComponent(email)}`}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-[12px] font-bold text-white hover:bg-brand-700"
              >
                <Icon name="check-circle" size={13} /> Verify email
              </Link>
            </InfoNote>
          ) : null}

          {error ? (
            <InfoNote tone="danger" icon="alert">
              {error}
            </InfoNote>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="group h-12 w-full justify-between rounded-xl px-5 shadow-lg shadow-brand-500/25"
            disabled={pending}
          >
            <span className="flex-1 text-center">{pending ? "Signing in…" : "Sign in"}</span>
            {pending ? <Spinner size={16} /> : <Icon name="arrow-right" size={18} />}
          </Button>
        </form>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-ink-100 bg-ink-50/60 p-2.5">
          {[
            { icon: "shield-check", label: "Secure" },
            { icon: "mail", label: "Email verified" },
            { icon: "credit-card", label: "No card" },
          ].map((item) => (
            <span
              key={item.label}
              className="flex items-center justify-center gap-1.5 text-[10.5px] font-bold text-ink-500"
            >
              <Icon name={item.icon} size={12} className="text-success-600" />
              {item.label}
            </span>
          ))}
        </div>

        <div className="relative mt-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ink-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-[11.5px] font-semibold text-ink-400">
              New to GuruLens?
            </span>
          </div>
        </div>

        <Link
          href="/register"
          className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white py-3.5 text-[13.5px] font-bold text-ink-700 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 hover:shadow-md"
        >
          Create an account
          <Icon name="sparkles" size={15} />
        </Link>
      </div>
    </div>
  );
}
