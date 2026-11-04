"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { Chip, InfoNote } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/interactive";
import { apiFetch, ClientApiError } from "@/lib/client";
import { maxDobForMinimumAge } from "@/lib/format";

type TaxItem = { slug: string; name: string };

export type Taxonomy = {
  subjects: TaxItem[];
  districts: TaxItem[];
  grades: TaxItem[];
  languages: TaxItem[];
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

export function TeacherForm({ taxonomy }: { taxonomy: Taxonomy }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
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
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: {
          role: "teacher",
          name,
          email,
          password,
          dateOfBirth: new Date(dob).toISOString(),
          acceptTerms: true,
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
        },
      });
      router.push("/studio/verification");
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
        className="absolute inset-x-10 top-0 h-[3px] rounded-b-full bg-gradient-to-r from-ink-900 via-brand-600 to-accent-500"
      />

      <Link
        href="/register"
        className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-400 transition-colors hover:text-ink-700"
      >
        ← Change account type
      </Link>

      <div className="mt-4 flex items-center gap-3.5">
        <span className="flex size-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-ink-900 to-brand-700 text-white shadow-[0_8px_20px_rgba(10,27,61,0.32)]">
          <Icon name="video" size={20} />
        </span>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">
            Teacher account
          </h1>
          <p className="text-[12px] font-semibold text-ink-400">
            YouTube-style profile · verified badge
          </p>
        </div>
      </div>

      <p
        lang="si"
        className="font-si mt-4 text-[13.5px] leading-[1.85] font-semibold text-ink-600"
      >
        ඔබේ ගුරු profile එක professional ලෙස ගොඩනගන්න — sign-up එකෙන් පස්සේ verification ඉල්ලන්න
        පුළුවන්.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-7">
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-ink-400 uppercase">
            <span
              aria-hidden="true"
              className="h-1 w-6 rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
            />
            Account
          </h2>
          <Field label="Full name" htmlFor="t-name">
            <Input id="t-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anuradha Perera" autoComplete="name" />
          </Field>
          <Field label="Email" htmlFor="t-email">
            <Input id="t-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" htmlFor="t-password" hint="8+ characters, incl. a letter and a number.">
              <Input id="t-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
            </Field>
            <Field label="Date of birth" htmlFor="t-dob" hint="You must be 13 or older.">
              <Input id="t-dob" type="date" required max={maxDob} value={dob} onChange={(e) => setDob(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-ink-400 uppercase">
            <span
              aria-hidden="true"
              className="h-1 w-6 rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
            />
            Public profile
          </h2>
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
          <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-ink-400 uppercase">
            <span
              aria-hidden="true"
              className="h-1 w-6 rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
            />
            Teaching areas
          </h2>
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
          <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-ink-400 uppercase">
            <span
              aria-hidden="true"
              className="h-1 w-6 rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
            />
            Consent
          </h2>
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

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Spinner size={16} /> : null}
          {pending ? "Creating account…" : "Create teacher account"}
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
