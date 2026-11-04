"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/interactive";
import { apiFetch, ClientApiError } from "@/lib/client";
import { maxDobForMinimumAge } from "@/lib/format";

export function StudentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const maxDob = maxDobForMinimumAge();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    if (!terms) {
      setError("Please accept the Terms and Community Guidelines.");
      return;
    }
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }

    setPending(true);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: {
          role: "student",
          name,
          email,
          password,
          dateOfBirth: new Date(dob).toISOString(),
          acceptTerms: true,
        },
      });
      router.push("/feed");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Sign up failed. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="glass-strong animate-fade-up relative overflow-hidden rounded-3xl p-7 sm:p-9">
      <div
        aria-hidden="true"
        className="absolute inset-x-10 top-0 h-[3px] rounded-b-full bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500"
      />

      <Link
        href="/register"
        className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-400 transition-colors hover:text-ink-700"
      >
        ← Change account type
      </Link>

      <div className="mt-4 flex items-center gap-3.5">
        <span className="flex size-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-[0_8px_20px_rgba(0,118,214,0.3)]">
          <Icon name="compass" size={20} />
        </span>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">
            Student / Parent account
          </h1>
          <p className="text-[12px] font-semibold text-ink-400">Free forever · no card needed</p>
        </div>
      </div>

      <p
        lang="si"
        className="font-si mt-4 text-[13.5px] leading-[1.85] font-semibold text-ink-600"
      >
        ගුරුවරුන් සොයාගෙන, පාඩම් නරඹලා, සැබෑ සමාලෝචන බෙදාගන්න — නොමිලේම.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Full name" htmlFor="name">
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kavindu Silva"
            autoComplete="name"
          />
        </Field>

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Password"
            htmlFor="password"
            hint="8+ characters, incl. a letter and a number."
          >
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>

          <Field label="Date of birth" htmlFor="dob" hint="You must be 13 or older.">
            <Input
              id="dob"
              type="date"
              required
              max={maxDob}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </Field>
        </div>

        <Checkbox
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          label={
            <>
              I accept the{" "}
              <Link href="/terms" className="font-semibold text-brand-600 underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/guidelines" className="font-semibold text-brand-600 underline">
                Community Guidelines
              </Link>
              , and I agree to share only honest reviews.
            </>
          }
        />

        {error ? <InfoNote tone="danger" icon="alert">{error}</InfoNote> : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Spinner size={16} /> : null}
          {pending ? "Creating account…" : "Create student account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
