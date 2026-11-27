"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/interactive";
import { InfoNote } from "@/components/ui/primitives";
import { apiFetch, ClientApiError } from "@/lib/client";
import { CONTACT_EMAIL, CONTACT_WHATSAPP, CONTACT_WHATSAPP_URL } from "@/lib/contact";
import { cn, maxDobForMinimumAge } from "@/lib/format";
import { SUBDOMAIN_PATTERN } from "@/lib/lms-shared";
import { formatPlanLimit, planFeatureLabel } from "@/lib/plan-catalog";

export type OrgPlanOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceLkr: number;
  billingCycle: string;
  limits: Record<string, number>;
  features: string[];
};

type Availability = {
  available: boolean;
  reason: string | null;
  normalized: string;
};

type CheckState = {
  value: string;
  state: "ok" | "taken" | "invalid" | "error";
  reason: string | null;
};

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function OrganizationForm({
  type,
  plans,
  initialPlanSlug,
}: {
  type: "school" | "institute";
  plans: OrgPlanOption[];
  initialPlanSlug?: string;
}) {
  const router = useRouter();
  const isSchool = type === "school";

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState("");

  const [name, setName] = useState("");
  const [nameSi, setNameSi] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");

  const [hubSubdomain, setHubSubdomain] = useState("");
  const [hubTouched, setHubTouched] = useState(false);
  const [hubTagline, setHubTagline] = useState("");
  const [brandColor, setBrandColor] = useState("#0094fd");

  const [planSlug, setPlanSlug] = useState(
    initialPlanSlug && plans.some((plan) => plan.slug === initialPlanSlug)
      ? initialPlanSlug
      : (plans[0]?.slug ?? ""),
  );
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [slugCheck, setSlugCheck] = useState<CheckState | null>(null);
  const [hubCheck, setHubCheck] = useState<CheckState | null>(null);

  const maxDob = maxDobForMinimumAge();

  const cleanSlug = slug.trim().toLowerCase();
  const cleanHub = hubSubdomain.trim().toLowerCase();

  const slugState: "idle" | "checking" | "ok" | "taken" | "invalid" | "error" =
    cleanSlug.length < 3
      ? "idle"
      : !SLUG_PATTERN.test(cleanSlug)
        ? "invalid"
        : slugCheck?.value === cleanSlug
          ? slugCheck.state
          : "checking";

  const hubState: "idle" | "checking" | "ok" | "taken" | "invalid" | "error" =
    cleanHub.length < 3
      ? "idle"
      : !SUBDOMAIN_PATTERN.test(cleanHub)
        ? "invalid"
        : hubCheck?.value === cleanHub
          ? hubCheck.state
          : "checking";

  useEffect(() => {
    if (cleanSlug.length < 3 || !SLUG_PATTERN.test(cleanSlug)) return;
    const timer = window.setTimeout(async () => {
      try {
        const data = await apiFetch<Availability>(
          `/api/organizations/slug?slug=${encodeURIComponent(cleanSlug)}`,
        );
        setSlugCheck({
          value: cleanSlug,
          state: data.available ? "ok" : "taken",
          reason: data.reason,
        });
      } catch {
        setSlugCheck({ value: cleanSlug, state: "error", reason: null });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [cleanSlug]);

  useEffect(() => {
    if (cleanHub.length < 3 || !SUBDOMAIN_PATTERN.test(cleanHub)) return;
    const timer = window.setTimeout(async () => {
      try {
        const data = await apiFetch<Availability>(
          `/api/lms/workspaces?subdomain=${encodeURIComponent(cleanHub)}`,
        );
        setHubCheck({
          value: cleanHub,
          state: data.available ? "ok" : "taken",
          reason: data.reason,
        });
      } catch {
        setHubCheck({ value: cleanHub, state: "error", reason: null });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [cleanHub]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      const next = slugify(value);
      setSlug(next);
      if (!hubTouched) setHubSubdomain(next);
    }
  }

  function handleSlugChange(value: string) {
    const next = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(next);
    setSlugTouched(true);
    if (!hubTouched) setHubSubdomain(next);
  }

  async function verifySlugs() {
    const [slugResult, hubResult] = await Promise.all([
      apiFetch<Availability>(`/api/organizations/slug?slug=${encodeURIComponent(cleanSlug)}`),
      apiFetch<Availability>(`/api/lms/workspaces?subdomain=${encodeURIComponent(cleanHub)}`),
    ]);
    if (!slugResult.available) {
      throw new Error(slugResult.reason ?? "That campus URL is already taken.");
    }
    if (!hubResult.available) {
      throw new Error(hubResult.reason ?? "That LMS subdomain is already taken.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);

    if (!SLUG_PATTERN.test(cleanSlug)) {
      return setError("Campus URL: use 3–50 lowercase letters, numbers or dashes.");
    }
    if (!SUBDOMAIN_PATTERN.test(cleanHub)) {
      return setError("LMS subdomain: use 3–30 lowercase letters, numbers or dashes.");
    }
    if (website.trim() && !/^https?:\/\/.+/.test(website.trim())) {
      return setError("Website must start with http:// or https://");
    }
    if (plans.length > 0 && !planSlug) {
      return setError("Choose a launch plan.");
    }
    if (!terms) {
      return setError("Please accept the Terms and Community Guidelines.");
    }

    setPending(true);
    try {
      await verifySlugs();
      const result = await apiFetch<{
        organization: { slug: string };
        workspace: { subdomain: string } | null;
        devCode?: string;
      }>("/api/auth/register-organization", {
        method: "POST",
        body: {
          type,
          owner: {
            name: ownerName,
            email: ownerEmail,
            password,
            dateOfBirth: new Date(dob).toISOString(),
            phone: ownerPhone.trim() || undefined,
          },
          organization: {
            name: name.trim(),
            slug: cleanSlug,
            nameSi: nameSi.trim() || undefined,
            description: description.trim() || undefined,
            email: orgEmail.trim() || undefined,
            phone: orgPhone.trim() || undefined,
            website: website.trim() || undefined,
            address: address.trim() || undefined,
          },
          lmsSubdomain: cleanHub,
          lmsName: name.trim(),
          lmsTagline: hubTagline.trim() || undefined,
          brandColor,
          planSlug: planSlug || undefined,
          acceptTerms: true,
        },
      });

      router.push(
        `/verify-email?email=${encodeURIComponent(ownerEmail)}&next=${encodeURIComponent(
          `/campus/${result.organization.slug}/manage`,
        )}${result.devCode ? `&dev=${result.devCode}` : ""}`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ClientApiError || err instanceof Error
          ? err.message
          : "Could not create your organization. Please try again.",
      );
      setPending(false);
    }
  }

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-[1.9rem] border border-white bg-white/95 p-7 shadow-[0_30px_80px_-30px_rgba(10,27,61,0.3)] ring-1 ring-ink-100/80 backdrop-blur-xl sm:p-9">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r",
          isSchool ? "from-success-500 via-brand-600 to-accent-500" : "from-accent-500 via-brand-600 to-brand-500",
        )}
      />

      <Link
        href="/register"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-400 transition-colors hover:text-ink-700"
      >
        <Icon name="arrow-left" size={13} /> Change account type
      </Link>

      <div className="mt-4 flex items-start gap-3.5">
        <span
          className={cn(
            "flex size-12 flex-none items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_rgba(10,27,61,0.25)]",
            isSchool
              ? "bg-gradient-to-br from-success-600 via-brand-700 to-ink-900"
              : "bg-gradient-to-br from-accent-600 via-brand-700 to-ink-900",
          )}
        >
          <Icon name={isSchool ? "school" : "users"} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] leading-tight font-black tracking-tight text-ink-900">
              {isSchool ? "School account" : "Tuition institute account"}
            </h1>
            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[9.5px] font-black tracking-wide text-brand-700 uppercase">
              Plans 100% off
            </span>
          </div>
          <p className="text-[12px] font-semibold text-ink-400">
            {isSchool
              ? "Campus profile · staff & student accounts · timetables · branded LMS"
              : "Multiple teachers · branches · classes · branded LMS"}
          </p>
        </div>
      </div>

      <p
        lang="si"
        className="font-si mt-4 rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-[13px] leading-[1.8] font-semibold text-ink-600"
      >
        {isSchool
          ? "ඔබේ පාසලේ campus පිටුව, ගුරු සහ සිසු ගිණුම්, කාලසටහන් සහ branded LMS එක එකවර ආරම්භ කරන්න."
          : "ඔබේ ටියුෂන් ආයතනයේ ගුරු කණ්ඩායම, ශාඛා, පන්ති සහ branded LMS එක එකම තැනකින් කළමනාකරණය කරන්න."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-7">
        {plans.length > 0 ? (
          <section className="space-y-3">
            <SectionLabel step={1} title="Launch plan" />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {plans.map((plan) => {
                const active = plan.slug === planSlug;
                const limitKeys = ["teachers", "branches", "classes", "lms_courses"] as const;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanSlug(plan.slug)}
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
                        Free for now
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
                        <li
                          key={feature}
                          className="flex items-start gap-1 text-[10.5px] text-ink-500"
                        >
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
            <InfoNote tone="warn" icon="info">
              <span className="font-bold">Free for now, paid later.</span> Every{" "}
              {isSchool ? "school" : "institute"} plan is 100% off during our launch. Payment will
              be required in a future update, with plenty of notice.
            </InfoNote>
          </section>
        ) : null}

        <section className="space-y-4">
          <SectionLabel step={plans.length > 0 ? 2 : 1} title="Owner account" />
          <p className="text-[12px] leading-relaxed text-ink-500">
            This person becomes the owner of the organization and can add staff, teachers and
            managers later.
          </p>
          <Field label="Full name" htmlFor="org-owner-name">
            <Input
              id="org-owner-name"
              required
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              placeholder="e.g. Nimal Perera"
              autoComplete="name"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="org-owner-email" hint="Verification code goes here.">
              <Input
                id="org-owner-email"
                type="email"
                required
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Mobile number" htmlFor="org-owner-phone" hint="Optional at signup.">
              <Input
                id="org-owner-phone"
                type="tel"
                inputMode="tel"
                value={ownerPhone}
                onChange={(event) => setOwnerPhone(event.target.value)}
                placeholder="077 123 4567"
                autoComplete="tel"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Password"
              htmlFor="org-owner-password"
              hint="8+ characters, including a letter and a number."
            >
              <div className="relative">
                <Input
                  id="org-owner-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[10.5px] font-bold text-ink-400 hover:text-ink-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            <Field label="Date of birth" htmlFor="org-owner-dob" hint="You must be 13 or older.">
              <Input
                id="org-owner-dob"
                type="date"
                required
                max={maxDob}
                value={dob}
                onChange={(event) => setDob(event.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionLabel step={plans.length > 0 ? 3 : 2} title="Organization" />
          <Field label={isSchool ? "School name" : "Institute name"} htmlFor="org-name">
            <Input
              id="org-name"
              required
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder={isSchool ? "e.g. Royal College Colombo" : "e.g. Horizon Science Academy"}
            />
          </Field>
          <Field label="Sinhala name (optional)" htmlFor="org-name-si">
            <Input
              id="org-name-si"
              value={nameSi}
              onChange={(event) => setNameSi(event.target.value)}
              placeholder={isSchool ? "e.g. රාජකීය විද්‍යාලය" : "e.g. හොරයිසන් විද්‍යා ඇකඩමිය"}
              lang="si"
              className="font-si"
            />
          </Field>
          <Field
            label="Campus URL"
            htmlFor="org-slug"
            hint="Your public campus page on gurulens.us."
            error={
              slugState === "taken"
                ? (slugCheck?.reason ?? "That campus URL is already taken.")
                : slugState === "invalid"
                  ? "Use 3–50 lowercase letters, numbers or dashes."
                  : null
            }
          >
            <div className="flex items-stretch gap-0">
              <span className="inline-flex items-center rounded-l-xl border border-r-0 border-ink-200 bg-ink-50 px-3 text-[12px] font-bold text-ink-500">
                gurulens.us/campus/
              </span>
              <Input
                id="org-slug"
                required
                value={slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder="royal-college"
                autoComplete="off"
                spellCheck={false}
                className="rounded-l-none"
              />
            </div>
            <span className="mt-1 flex min-h-4 items-center gap-1 text-[10.5px] font-bold">
              {slugState === "checking" ? (
                <>
                  <Spinner size={11} className="text-ink-400" /> Checking availability…
                </>
              ) : null}
              {slugState === "ok" ? (
                <span className="text-success-600">Campus URL available ✓</span>
              ) : null}
              {slugState === "error" ? (
                <span className="text-warn-600">Could not check right now — we will verify on submit.</span>
              ) : null}
            </span>
          </Field>
          <Field
            label="About"
            htmlFor="org-description"
            hint="A short introduction for students, parents and staff."
          >
            <Textarea
              id="org-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={
                isSchool
                  ? "Our history, values, grades and what makes our school special."
                  : "Subjects, teaching style, results and what learners can expect."
              }
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact email" htmlFor="org-email" hint="Shown on your campus page.">
              <Input
                id="org-email"
                type="email"
                value={orgEmail}
                onChange={(event) => setOrgEmail(event.target.value)}
                placeholder={ownerEmail || "office@school.lk"}
              />
            </Field>
            <Field label="Contact phone" htmlFor="org-phone">
              <Input
                id="org-phone"
                type="tel"
                value={orgPhone}
                onChange={(event) => setOrgPhone(event.target.value)}
                placeholder="+94 11 234 5678"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website" htmlFor="org-website" hint="Include https://">
              <Input
                id="org-website"
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://school.lk"
              />
            </Field>
            <Field label="Address" htmlFor="org-address">
              <Input
                id="org-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="e.g. 35 Reid Avenue, Colombo 07"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionLabel step={plans.length > 0 ? 4 : 3} title="Branded learning hub" />
          <p className="text-[12px] leading-relaxed text-ink-500">
            We will create a free LMS workspace for your {isSchool ? "school" : "institute"} at the
            subdomain below. You can change its branding and address later.
          </p>
          <Field
            label="LMS subdomain"
            htmlFor="org-hub"
            hint="Courses, lessons, learner progress and announcements live here."
            error={
              hubState === "taken"
                ? (hubCheck?.reason ?? "That subdomain is already taken.")
                : hubState === "invalid"
                  ? "Use 3–30 lowercase letters, numbers or dashes."
                  : null
            }
          >
            <div className="flex items-stretch gap-0">
              <Input
                id="org-hub"
                required
                value={hubSubdomain}
                onChange={(event) => {
                  setHubSubdomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  setHubTouched(true);
                }}
                placeholder="royal-college"
                autoComplete="off"
                spellCheck={false}
                className="rounded-r-none"
              />
              <span className="inline-flex items-center rounded-r-xl border border-l-0 border-ink-200 bg-ink-50 px-3 text-[12.5px] font-bold text-ink-500">
                .gurulens.us
              </span>
            </div>
            <span className="mt-1 flex min-h-4 items-center gap-1 text-[10.5px] font-bold">
              {hubState === "checking" ? (
                <>
                  <Spinner size={11} className="text-ink-400" /> Checking availability…
                </>
              ) : null}
              {hubState === "ok" ? (
                <span className="text-success-600">Learning hub address available ✓</span>
              ) : null}
              {hubState === "error" ? (
                <span className="text-warn-600">Could not check right now — we will verify on submit.</span>
              ) : null}
            </span>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hub tagline" htmlFor="org-hub-tagline" hint="Optional — shown under your hub name.">
              <Input
                id="org-hub-tagline"
                maxLength={120}
                value={hubTagline}
                onChange={(event) => setHubTagline(event.target.value)}
                placeholder="Learn with confidence"
              />
            </Field>
            <Field label="Brand colour" htmlFor="org-brand-color">
              <div className="flex items-center gap-3">
                <input
                  id="org-brand-color"
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
                  aria-label="Brand colour hex value"
                />
              </div>
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel step={plans.length > 0 ? 5 : 4} title="Consent" />
          <Checkbox
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
            label={
              <>
                I confirm I am authorised to register this organization and accept the{" "}
                <Link href="/terms" className="font-semibold text-brand-600 underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/guidelines" className="font-semibold text-brand-600 underline">
                  Community Guidelines
                </Link>
                .
              </>
            }
          />
          <p className="text-[11px] leading-relaxed text-ink-400">
            Need help first? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-brand-600 underline">
              {CONTACT_EMAIL}
            </a>{" "}
            or WhatsApp{" "}
            <a
              href={CONTACT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-brand-600 underline"
            >
              {CONTACT_WHATSAPP}
            </a>
            . We will help you choose a plan.
          </p>
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
            {pending ? "Creating your organization…" : `Create ${isSchool ? "school" : "institute"} account`}
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
