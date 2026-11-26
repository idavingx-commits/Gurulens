"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AvatarPhotoPicker, CoverPhotoPicker } from "@/components/auth/SignupPhotos";
import { SchoolSignupFields, type SchoolSignup } from "@/components/auth/SchoolSignupFields";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { Chip, InfoNote } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/interactive";
import { apiFetch, apiUpload, ClientApiError } from "@/lib/client";
import { cn, maxDobForMinimumAge } from "@/lib/format";
import { formatPlanLimit, planFeatureLabel } from "@/lib/plan-catalog";

type TaxItem = { slug: string; name: string };

export type Taxonomy = {
  subjects: TaxItem[];
  districts: TaxItem[];
  grades: TaxItem[];
  languages: TaxItem[];
};

export type TeacherPlanOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceLkr: number;
  billingCycle: string;
  limits: Record<string, number>;
  features: string[];
};

function toggle(list: string[], value: string, max: number): string[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (list.length >= max) return list;
  return [...list, value];
}

function ChipGroup({
  items,
  selected,
  onToggle,
  label,
  hint,
}: {
  items: TaxItem[];
  selected: string[];
  onToggle: (v: string) => void;
  label: string;
  hint: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-ink-700">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Chip key={item.slug} active={selected.includes(item.slug)} onClick={() => onToggle(item.slug)}>
            {item.name}
          </Chip>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
    </div>
  );
}

function PlanPicker({
  plans,
  value,
  onChange,
}: {
  plans: TeacherPlanOption[];
  value: string;
  onChange: (slug: string) => void;
}) {
  if (plans.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[12px] font-black tracking-[0.1em] text-ink-700 uppercase">
            <Icon name="crown" size={13} className="text-brand-600" />
            Choose your plan
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-400">
            Switch any time. No card needed during launch.
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700"
        >
          Compare all plans <Icon name="arrow-right" size={11} />
        </Link>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {plans.map((plan) => {
          const active = plan.slug === value;
          const limitKeys = ["channels", "classes", "lms_courses"] as const;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onChange(plan.slug)}
              aria-pressed={active}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-3.5 text-left transition-all",
                active
                  ? "border-brand-400 bg-gradient-to-br from-brand-50 to-white ring-4 ring-brand-100"
                  : "border-ink-200 bg-white/80 hover:border-brand-300 hover:bg-white",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] leading-tight font-extrabold text-ink-900">
                  {plan.name}
                </span>
                <span
                  className={cn(
                    "flex size-5 flex-none items-center justify-center rounded-full border-2 transition-colors",
                    active
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-ink-200 bg-white text-transparent",
                  )}
                >
                  <Icon name="check" size={11} strokeWidth={3.2} />
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[17px] leading-none font-black text-ink-900">LKR 0</span>
                <span className="rounded-full bg-success-100 px-1.5 py-0.5 text-[8.5px] font-black tracking-wide text-success-600 uppercase">
                  100% off
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {limitKeys.map((key) => {
                  const limit = plan.limits[key];
                  if (limit === undefined) return null;
                  return (
                    <span
                      key={key}
                      className="rounded-md bg-ink-100/80 px-1.5 py-0.5 text-[9.5px] font-bold text-ink-500"
                    >
                      {formatPlanLimit(key, limit)}{" "}
                      {key === "lms_courses" ? "courses" : key}
                    </span>
                  );
                })}
              </div>

              <ul className="mt-2 space-y-0.5">
                {plan.features.slice(0, 2).map((feature) => (
                  <li key={feature} className="flex items-start gap-1 text-[10.5px] text-ink-500">
                    <Icon
                      name="check"
                      size={9}
                      strokeWidth={3}
                      className="mt-0.5 flex-none text-success-600"
                    />
                    <span className="line-clamp-1">{planFeatureLabel(feature)}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TeacherForm({
  taxonomy,
  plans,
  initialPlanSlug,
}: {
  taxonomy: Taxonomy;
  plans: TeacherPlanOption[];
  initialPlanSlug?: string;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [handle, setHandle] = useState("");
  const [handleCheck, setHandleCheck] = useState<{
    handle: string;
    state: "idle" | "ok" | "taken" | "invalid";
  }>({ handle: "", state: "idle" });
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [mode, setMode] = useState("both");
  const [experienceYears, setExperienceYears] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [school, setSchool] = useState<SchoolSignup | null>(null);
  const [planSlug, setPlanSlug] = useState(
    initialPlanSlug && plans.some((plan) => plan.slug === initialPlanSlug)
      ? initialPlanSlug
      : (plans[0]?.slug ?? ""),
  );
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const handleTimer = useRef<number | null>(null);

  const maxDob = maxDobForMinimumAge();

  const cleanHandle = handle.trim().toLowerCase();
  const handleState: "idle" | "checking" | "ok" | "taken" | "invalid" =
    cleanHandle.length < 3
      ? "idle"
      : !/^[a-z0-9][a-z0-9-]{2,29}$/.test(cleanHandle)
        ? "invalid"
        : handleCheck.handle === cleanHandle
          ? handleCheck.state
          : "checking";

  useEffect(() => {
    if (handleTimer.current) window.clearTimeout(handleTimer.current);
    const clean = handle.trim().toLowerCase();
    if (clean.length < 3 || !/^[a-z0-9][a-z0-9-]{2,29}$/.test(clean)) return;
    handleTimer.current = window.setTimeout(async () => {
      try {
        const data = await apiFetch<{ available: boolean; reason?: string }>(
          `/api/auth/handle-check?handle=${encodeURIComponent(clean)}`,
        );
        setHandleCheck({
          handle: clean,
          state: data.available ? "ok" : data.reason === "invalid" ? "invalid" : "taken",
        });
      } catch {
        setHandleCheck({ handle: clean, state: "idle" });
      }
    }, 350);
    return () => {
      if (handleTimer.current) window.clearTimeout(handleTimer.current);
    };
  }, [handle]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    if (subjects.length === 0) return setError("Select at least one subject.");
    if (districts.length === 0) return setError("Select at least one district.");
    if (grades.length === 0) return setError("Select at least one grade.");
    if (languages.length === 0) return setError("Select at least one teaching language.");
    if (handleState !== "ok") return setError("Choose an available teacher handle.");
    if (!consent) return setError("Please confirm the public profile consent.");
    if (!terms) return setError("Please accept the Terms and Community Guidelines.");

    setPending(true);
    try {
      const data = await apiFetch<{ devCode?: string }>("/api/auth/register", {
        method: "POST",
        body: {
          role: "teacher",
          name,
          email,
          password,
          dateOfBirth: new Date(dob).toISOString(),
          acceptTerms: true,
          phone: phone.trim() || undefined,
          handle: handle.trim().toLowerCase(),
          tagline: tagline || undefined,
          bio: bio || undefined,
          mode,
          experienceYears: experienceYears ? Number(experienceYears) : undefined,
          qualifications: qualifications || undefined,
          subjects,
          districts,
          grades,
          languages,
          consentPublic: true,
          planSlug: planSlug || undefined,
          school: school ?? undefined,
        },
      });

      // Photo endpoints require the newly created session. Failures are
      // ignored so they never block a successful sign-up.
      if (avatarFile) {
        const form = new FormData();
        form.append("kind", "avatar");
        form.append("file", avatarFile);
        await apiUpload<{ media: { id: string } }>("/api/upload", form).catch(() => null);
      }
      if (coverFile) {
        const form = new FormData();
        form.append("kind", "cover");
        form.append("file", coverFile);
        await apiUpload<{ media: { id: string } }>("/api/upload", form).catch(() => null);
      }

      router.push(
        `/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent("/studio/verification")}${
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
        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-ink-900 via-brand-600 to-accent-500"
      />

      <Link
        href="/register"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-400 transition-colors hover:text-ink-700"
      >
        <Icon name="arrow-left" size={13} /> Change account type
      </Link>

      <div className="mt-4 flex items-start gap-3.5">
        <span className="flex size-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-ink-900 via-ink-800 to-brand-700 text-white shadow-[0_10px_24px_rgba(10,27,61,0.35)]">
          <Icon name="video" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] leading-tight font-black tracking-tight text-ink-900">
              Teacher account
            </h1>
            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[9.5px] font-black tracking-wide text-brand-700 uppercase">
              Plans 100% off
            </span>
          </div>
          <p className="text-[12px] font-semibold text-ink-400">
            Professional profile · classes · your own LMS
          </p>
        </div>
      </div>

      <p
        lang="si"
        className="font-si mt-4 rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-[13px] leading-[1.8] font-semibold text-ink-600"
      >
        ඔබේ ගුරු profile එක professional ලෙස ගොඩනගන්න — sign-up එකෙන් පස්සේ verification ඉල්ලන්න
        පුළුවන්.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-7">
        <section className="space-y-3">
          <SectionLabel step={1} title="Launch plan" />
          <PlanPicker plans={plans} value={planSlug} onChange={setPlanSlug} />
          <InfoNote tone="warn" icon="info">
            <span className="font-bold">Free for now, paid later.</span> Every teacher plan is 100%
            off during our launch. Payment will be required in a future update, and we&apos;ll
            announce it with plenty of notice.
          </InfoNote>
        </section>

        <section className="space-y-4">
          <SectionLabel step={2} title="Account" />
          <AvatarPhotoPicker name={name} file={avatarFile} onFileChange={setAvatarFile} />
          <Field label="Full name" htmlFor="t-name">
            <Input id="t-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anuradha Perera" autoComplete="name" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="t-email" hint="Verification code goes here.">
              <Input id="t-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </Field>
            <Field
              label="Mobile number"
              htmlFor="t-phone"
              hint="Optional. No SMS code at signup."
            >
              <Input
                id="t-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="077 123 4567"
                autoComplete="tel"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" htmlFor="t-password" hint="8+ characters, incl. a letter and a number.">
              <div className="relative">
                <Input id="t-password" type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" className="pr-16" />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[10.5px] font-bold text-ink-400 hover:text-ink-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            <Field label="Date of birth" htmlFor="t-dob" hint="You must be 13 or older.">
              <Input id="t-dob" type="date" required max={maxDob} value={dob} onChange={(e) => setDob(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionLabel step={3} title="Public profile" />
          <CoverPhotoPicker file={coverFile} onFileChange={setCoverFile} />
          <Field
            label="Teacher handle"
            htmlFor="t-handle"
            hint="Your profile will be at /teacher/your-handle"
            error={
              handleState === "taken"
                ? "This handle is already taken."
                : handleState === "invalid"
                  ? "3-30 characters: lowercase letters, numbers, dashes."
                  : null
            }
          >
            <div className="relative">
              <Input
                id="t-handle"
                required
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                placeholder="anuradha-physics"
                className="pr-24"
              />
              <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold">
                {handleState === "checking" ? <Spinner size={14} className="text-ink-400" /> : null}
                {handleState === "ok" ? <span className="text-success-600">Available ✓</span> : null}
                {handleState === "taken" ? <span className="text-danger-600">Taken</span> : null}
              </span>
            </div>
          </Field>
          <Field label="Tagline" htmlFor="t-tagline" hint="Short headline shown under your name (optional).">
            <Input id="t-tagline" maxLength={120} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. ජීවිතයට Physics" />
          </Field>
          <Field label="About you" htmlFor="t-bio" hint="Tell students about your teaching style (optional).">
            <Textarea id="t-bio" maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Your approach, achievements, class structure…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Class format" htmlFor="t-mode">
              <Select id="t-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="both">Physical + Online</option>
                <option value="physical">Physical classes</option>
                <option value="online">Online classes</option>
              </Select>
            </Field>
            <Field label="Years of experience" htmlFor="t-exp">
              <Input id="t-exp" type="number" min={0} max={60} value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="e.g. 8" />
            </Field>
          </div>
          <Field label="Qualifications" htmlFor="t-qual" hint="Degrees, certifications, training (optional).">
            <Input id="t-qual" maxLength={600} value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="e.g. B.Sc. Engineering, University of Moratuwa" />
          </Field>
        </section>

        <section className="space-y-5">
          <SectionLabel step={4} title="Teaching areas" />
          <ChipGroup
            items={taxonomy.subjects}
            selected={subjects}
            onToggle={(v) => setSubjects((s) => toggle(s, v, 6))}
            label="Subjects"
            hint={`Selected ${subjects.length}/6`}
          />
          <ChipGroup
            items={taxonomy.grades}
            selected={grades}
            onToggle={(v) => setGrades((s) => toggle(s, v, 10))}
            label="Grades"
            hint={`Selected ${grades.length}/10`}
          />
          <ChipGroup
            items={taxonomy.districts}
            selected={districts}
            onToggle={(v) => setDistricts((s) => toggle(s, v, 6))}
            label="Districts"
            hint={`Selected ${districts.length}/6`}
          />
          <ChipGroup
            items={taxonomy.languages}
            selected={languages}
            onToggle={(v) => setLanguages((s) => toggle(s, v, 3))}
            label="Teaching languages"
            hint={`Selected ${languages.length}/3`}
          />
        </section>

        <section className="space-y-3">
          <SectionLabel step={5} title="School" hint="Optional" />
          <SchoolSignupFields role="teacher" onChange={setSchool} />
        </section>

        <section className="space-y-3">
          <SectionLabel step={6} title="Consent" />
          <Checkbox
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            label="I consent to my name, photo, subjects, districts and class details being shown publicly on my GuruLens profile."
          />
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
                . I understand student reviews are independent and cannot be edited by me.
              </>
            }
          />
        </section>

        {error ? <InfoNote tone="danger" icon="alert">{error}</InfoNote> : null}

        <Button
          type="submit"
          size="lg"
          className="group h-12 w-full justify-between rounded-xl px-5 shadow-lg shadow-brand-500/25"
          disabled={pending}
        >
          <span className="flex-1 text-center">
            {pending ? "Creating account…" : "Create teacher account"}
          </span>
          {pending ? <Spinner size={16} /> : <Icon name="arrow-right" size={18} />}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-ink-400">
          <Icon name="mail" size={12} className="text-success-600" />
          Next step: verify your email with a 6-digit code — no phone OTP needed.
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
