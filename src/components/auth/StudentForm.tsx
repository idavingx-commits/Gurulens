"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AvatarPhotoPicker } from "@/components/auth/SignupPhotos";
import { SchoolSignupFields, type SchoolSignup } from "@/components/auth/SchoolSignupFields";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/interactive";
import { apiFetch, apiUpload, ClientApiError } from "@/lib/client";
import { maxDobForMinimumAge } from "@/lib/format";

export function StudentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [school, setSchool] = useState<SchoolSignup | null>(null);
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
      const data = await apiFetch<{ devCode?: string }>("/api/auth/register", {
        method: "POST",
        body: {
          role: "student",
          name,
          email,
          password,
          dateOfBirth: new Date(dob).toISOString(),
          acceptTerms: true,
          school: school ?? undefined,
        },
      });

      // The upload endpoint needs a session, so the selected photo is saved
      // right after the account is created. A failed photo upload should not
      // block sign-up — the photo can be changed later in Settings.
      if (photo) {
        const form = new FormData();
        form.append("kind", "avatar");
        form.append("file", photo);
        await apiUpload<{ media: { id: string } }>("/api/upload", form).catch(() => null);
      }

      router.push(
        `/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent("/feed")}${
          data.devCode ? `&dev=${data.devCode}` : ""
        }`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Sign up failed. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-[1.9rem] border border-white bg-white/95 p-7 shadow-[0_30px_80px_-30px_rgba(10,27,61,0.3)] ring-1 ring-ink-100/80 backdrop-blur-xl sm:p-9">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500"
      />

      <Link
        href="/register"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-400 transition-colors hover:text-ink-700"
      >
        <Icon name="arrow-left" size={13} /> Change account type
      </Link>

      <div className="mt-4 flex items-start gap-3.5">
        <span className="flex size-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-[0_10px_24px_rgba(0,118,214,0.3)]">
          <Icon name="compass" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] leading-tight font-black tracking-tight text-ink-900">
              Student account
            </h1>
            <span className="rounded-full bg-success-100 px-2.5 py-1 text-[9.5px] font-black tracking-wide text-success-600 uppercase">
              Free forever
            </span>
          </div>
          <p className="text-[12px] font-semibold text-ink-400">
            No card needed · email verification only
          </p>
        </div>
      </div>

      <p
        lang="si"
        className="font-si mt-4 rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-[13px] leading-[1.8] font-semibold text-ink-600"
      >
        ගුරුවරුන් සොයාගෙන, පාඩම් නරඹලා, සැබෑ සමාලෝචන බෙදාගන්න — නොමිලේම.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <section className="space-y-4">
          <SectionLabel step={1} title="Your details" />
          <AvatarPhotoPicker name={name} file={photo} onFileChange={setPhoto} />

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

          <Field
            label="Email"
            htmlFor="email"
            hint="We'll send a 6-digit code here. You only need email to join — no phone number."
          >
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
            <Field label="Password" htmlFor="password" hint="8+ characters, incl. a letter and a number.">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[10.5px] font-bold text-ink-400 hover:text-ink-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
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
        </section>

        <section className="space-y-3">
          <SectionLabel step={2} title="School" hint="Optional" />
          <SchoolSignupFields role="student" onChange={setSchool} />
        </section>

        <section className="space-y-3">
          <SectionLabel step={3} title="Consent" />
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
        </section>

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
          <span className="flex-1 text-center">
            {pending ? "Creating account…" : "Create student account"}
          </span>
          {pending ? <Spinner size={16} /> : <Icon name="arrow-right" size={18} />}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-ink-400">
          <Icon name="mail" size={12} className="text-success-600" />
          Next step: verify your email with a 6-digit code.
        </p>
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

function SectionLabel({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-6 items-center justify-center rounded-lg bg-ink-900 text-[11px] font-black text-white">
        {step}
      </span>
      <h2 className="text-[12px] font-black tracking-[0.12em] text-ink-700 uppercase">{title}</h2>
      {hint ? (
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[9.5px] font-bold text-ink-400 uppercase">
          {hint}
        </span>
      ) : null}
      <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-ink-200 to-transparent" />
    </div>
  );
}
