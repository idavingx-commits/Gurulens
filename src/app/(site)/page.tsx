import type { Metadata } from "next";
import Link from "next/link";

import { SearchBar } from "@/components/layout/SearchBar";
import { PostCard } from "@/components/post/PostCard";
import { TeacherCard } from "@/components/teacher/TeacherCard";
import { Avatar } from "@/components/ui/avatar";
import { CountUp } from "@/components/ui/count-up";
import { FloatingDecorations } from "@/components/ui/floating-decorations";
import { Icon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import {
  getPlatformStats,
  getRecentPosts,
  getSubjectCounts,
  getTeacherCards,
  getTopReviews,
} from "@/lib/data";
import { APP_NAME, COMPANY_NAME } from "@/lib/constants";
import { compactNumber, truncate } from "@/lib/format";
import { SITE_URL, jsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "GuruLens — Find the Right Teacher in Sri Lanka | ගුරුවරු සොයන්න" },
  description:
    "GuruLens (gurulens.us) is Sri Lanka's teacher discovery platform. Find verified tuition teachers by subject, grade and district, read honest student reviews, watch lessons and take quizzes. සිංහල හා English.",
  alternates: { canonical: "/" },
};

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: APP_NAME,
      alternateName: ["Guru Lens", "GuruLens Sri Lanka"],
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/brand/gurulens-icon-512.png`,
      parentOrganization: { "@type": "Organization", name: COMPANY_NAME },
      areaServed: { "@type": "Country", name: "Sri Lanka" },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: APP_NAME,
      alternateName: ["Guru Lens", "gurulens.us"],
      url: `${SITE_URL}/`,
      inLanguage: ["en", "si"],
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/explore?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

const POPULAR_SUBJECTS = [
  "mathematics",
  "science",
  "english",
  "ict",
  "combined-maths",
  "physics",
  "chemistry",
  "biology",
];

const HOW_IT_WORKS = [
  {
    icon: "search",
    title: "Search & Discover",
    titleSi: "සොයන්න",
    text: "Browse verified teachers by subject, grade, district and teaching mode. Compare ratings from real students.",
  },
  {
    icon: "shield-check",
    title: "Trust the Badge",
    titleSi: "විශ්වාස කරන්න",
    text: "Our verified badge means real credentials. Reviews come only from enrolled students — no fake ratings.",
  },
  {
    icon: "film",
    title: "Learn Everywhere",
    titleSi: "ඉගෙන ගන්න",
    text: "Watch lessons, reels and videos. Take practice quizzes. Prepare before class, review after.",
  },
] as const;

const FAQS = [
  {
    q: "Is GuruLens free?",
    a: "Yes. Browsing, following teachers, watching lessons and taking quizzes is completely free for students. Teacher listings are free at launch too — GuruLens never charges students to reach a teacher.",
  },
  {
    q: "What does the blue verified badge mean?",
    a: "Our moderation team checks a teacher's real qualifications and teaching background before granting the badge. It is a trust signal — not a guarantee of exam results — and it can be revoked if the evidence turns out to be false.",
  },
  {
    q: "How do you keep reviews honest?",
    a: "Only students who verified their enrolment with the teacher's enrollment code can write a review. Ratings are also statistically smoothed, so a \"5.0 from 2 reviews\" can never outrank a \"4.8 from 200 reviews\".",
  },
  {
    q: "I'm a teacher — how do I join?",
    a: "Create a teacher account, build your profile (subjects, grades, districts, languages) and request the free verified badge from the Teacher Studio. Then publish lessons, reels and quizzes, and share enrollment codes with your class.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  const [{ teachers: topTeachers }, stats, subjects, recentPosts, topReviews] = await Promise.all([
    getTeacherCards({ sort: "trust", limit: 8 }),
    getPlatformStats(),
    getSubjectCounts(),
    getRecentPosts(3, user?.id ?? null),
    getTopReviews(6),
  ]);

  const popular = subjects
    .filter((s) => s.teacherCount > 0)
    .sort((a, b) => b.teacherCount - a.teacherCount)
    .slice(0, 8);

  const chips = POPULAR_SUBJECTS.map((slug) => subjects.find((s) => s.slug === slug)).filter(
    (s): s is NonNullable<typeof s> => Boolean(s),
  );

  const isEducator =
    user?.role === "teacher" || user?.role === "admin" || user?.role === "moderator";
  const teacherCta = isEducator
    ? { href: "/studio", label: "Open Teacher Studio" }
    : { href: "/register/teacher", label: "Become a teacher" };

  return (
    <div className="relative isolate">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(HOME_JSON_LD) }} />
      {/* Floating education decorations - corners only */}
      <FloatingDecorations variant="brand" />

      {/* ============================================================ */}
      {/* CINEMATIC HERO - Full viewport                               */}
      {/* ============================================================ */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 sm:px-6">
        {/* Animated gradient orbs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="orb orb-brand animate-float-slow absolute -top-32 -right-32 size-[500px] sm:size-[700px]" />
          <div className="orb orb-accent animate-float-slower absolute -bottom-48 -left-48 size-[600px] sm:size-[800px]" />
          <div className="orb orb-brand animate-float-slow absolute top-1/2 left-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 opacity-30" />
        </div>

        {/* Subtle grid pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(10,27,61,0.07) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="mx-auto w-full max-w-5xl text-center">
          {/* Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-white/70 px-4 py-2 text-[12px] font-bold text-brand-700 shadow-sm backdrop-blur-sm">
            <span className="flex size-5 items-center justify-center rounded-full bg-brand-500 text-white">
              <Icon name="sparkles" size={11} />
            </span>
            Sri Lanka&apos;s #1 Teacher Discovery Platform
          </div>

          {/* Giant headline */}
          <h1 className="animate-fade-up mt-8 text-[clamp(2.5rem,8vw,5.5rem)] leading-[1.05] font-black tracking-tight text-ink-900 [animation-delay:100ms]">
            Find your{" "}
            <span className="text-shimmer relative inline-block bg-gradient-to-r from-brand-600 via-accent-500 to-brand-500 bg-clip-text text-transparent">
              perfect
              <svg
                aria-hidden="true"
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 200 12"
                fill="none"
              >
                <path
                  d="M2 8c50-6 100-6 196 2"
                  stroke="url(#underline-gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="underline-gradient" x1="0" y1="0" x2="200" y2="0">
                    <stop offset="0%" stopColor="var(--color-brand-500)" />
                    <stop offset="100%" stopColor="var(--color-accent-500)" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <br />
            teacher.
          </h1>

          {/* Sinhala subtitle */}
          <p
            lang="si"
            className="font-si animate-fade-up mx-auto mt-6 max-w-2xl text-[clamp(1rem,2.5vw,1.35rem)] leading-[1.9] font-semibold text-ink-600 [animation-delay:200ms]"
          >
            ඔබට ගැලපෙන ගුරුවරයා සොයාගන්න — තහවුරු කළ profiles, සැබෑ සිසු reviews, පාඩම් videos සහ
            quizzes එකම තැනකින්.
          </p>

          {/* Search bar */}
          <div className="animate-fade-up mx-auto mt-10 max-w-xl [animation-delay:300ms]">
            <div className="relative">
              <SearchBar />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-brand-500/20 via-accent-500/20 to-brand-500/20 opacity-0 blur-xl transition-opacity duration-500 group-focus-within:opacity-100"
              />
            </div>
          </div>

          {/* Quick subject chips */}
          <div className="animate-fade-up mt-6 flex flex-wrap items-center justify-center gap-2 [animation-delay:400ms]">
            {chips.slice(0, 6).map((s) => (
              <Link
                key={s.slug}
                href={`/explore?subject=${s.slug}`}
                className="rounded-full border border-ink-200/50 bg-white/60 px-4 py-2 text-[12px] font-bold text-ink-600 backdrop-blur-sm transition-all hover:border-brand-300 hover:bg-white hover:text-brand-600 hover:shadow-md"
              >
                {s.name}
              </Link>
            ))}
          </div>

          {/* Stats row */}
          <div className="animate-fade-up mt-12 flex flex-wrap items-center justify-center gap-8 sm:gap-12 [animation-delay:500ms]">
            <Stat value={stats.teacherCount} label="Teachers" />
            <Stat value={stats.verifiedCount} label="Verified" />
            <Stat value={stats.reviewCount} label="Reviews" />
            <Stat value={stats.districtCount} label="Districts" />
          </div>

          {/* Avatar stack + social proof */}
          {topTeachers.length > 0 ? (
            <div className="animate-fade-up mt-10 flex flex-col items-center gap-3 [animation-delay:600ms]">
              <div className="flex -space-x-3">
                {topTeachers.slice(0, 6).map((t) => (
                  <Avatar
                    key={t.profileId}
                    name={t.name}
                    src={t.avatarId ? `/api/media/${t.avatarId}` : null}
                    size="md"
                    className="ring-3 ring-white shadow-lg"
                  />
                ))}
              </div>
              <p className="text-[13px] font-semibold text-ink-500">
                Join{" "}
                <span className="font-bold text-ink-700">{compactNumber(stats.reviewCount)}+</span>{" "}
                students who found their perfect teacher
              </p>
            </div>
          ) : null}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <Icon name="chevron-down" size={24} className="text-ink-300" />
        </div>
      </section>

      {/* ============================================================ */}
      {/* BENTO GRID - Features                                        */}
      {/* ============================================================ */}
      <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">
            Everything you need to find the right teacher
          </h2>
          <p
            lang="si"
            className="font-si mx-auto mt-3 max-w-xl text-[15px] leading-[1.9] font-semibold text-ink-500"
          >
            නිවැරදි ගුරුවරයා සොයා ගැනීමට අවශ්‍ය සියල්ල එකම තැනක.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Large feature card */}
          <div className="bento-item card-premium relative overflow-hidden rounded-3xl p-8 sm:col-span-2 lg:row-span-2">
            <div className="relative z-10">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg">
                <Icon name="shield-check" size={28} />
              </div>
              <h3 className="mt-6 text-2xl font-black text-ink-900">Verified Teachers Only</h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-500">
                Every blue badge is earned. Our team verifies real qualifications, teaching
                experience, and student feedback before granting verification.
              </p>
              <p
                lang="si"
                className="font-si mt-3 max-w-md text-[14px] leading-[1.85] font-semibold text-ink-600"
              >
                සෑම verified badge එකක්ම සත්‍ය සුදුසුකම් පදනම් කරගෙන ලබා දෙයි.
              </p>
              <Link
                href="/trust"
                className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-bold text-brand-600 transition-colors hover:text-brand-700"
              >
                Learn about trust
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -bottom-20 size-64 rounded-full bg-gradient-to-br from-brand-500/20 to-accent-500/20 blur-3xl"
            />
          </div>

          {/* Honest reviews */}
          <BentoCard
            icon="star"
            title="Honest Reviews"
            text="Only enrolled students can review. Enrollment codes ensure every rating is real."
          />

          {/* Video lessons */}
          <BentoCard
            icon="film"
            title="Video Lessons"
            text="Watch lessons, reels, and tutorials. Learn at your own pace, anytime."
          />

          {/* Practice quizzes */}
          <BentoCard
            icon="target"
            title="Practice Quizzes"
            text="Test your knowledge with teacher-created quizzes. Track your progress."
          />

          {/* Multi-language */}
          <BentoCard
            icon="globe"
            title="Sinhala, Tamil & English"
            text="Find teachers in your preferred language. All three mediums supported."
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* TWO PATHS - Students & Teachers                              */}
      {/* ============================================================ */}
      <section className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Student card */}
          <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-500 via-brand-600 to-accent-600 p-8 text-white shadow-2xl transition-transform hover:scale-[1.02] sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl transition-transform group-hover:scale-110"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-white/10 blur-3xl"
            />

            <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase backdrop-blur-sm">
              <Icon name="compass" size={14} />
              For Students & Parents
            </span>

            <h3 className="relative mt-6 text-3xl font-black tracking-tight sm:text-4xl">
              Learn from teachers
              <br />
              you can trust.
            </h3>

            <p
              lang="si"
              className="font-si relative mt-4 max-w-md text-[15px] leading-[1.85] font-semibold text-white/90"
            >
              තහවුරු කළ ගුරුවරුන් සොයාගෙන, සැබෑ සිසු reviews කියවා, ඔබේ ඉගෙනුම ආරම්භ කරන්න.
            </p>

            <ul className="relative mt-6 space-y-3">
              {[
                "Search by subject, grade & district",
                "Real reviews from real students",
                "Free lessons, videos & quizzes",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[14px] font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/20">
                    <Icon name="check" size={14} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="relative mt-8 flex items-center gap-4">
              <Link
                href="/explore"
                className="glow-pulse inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-bold text-brand-700 shadow-xl transition-transform hover:-translate-y-0.5"
              >
                Explore Teachers
                <Icon name="arrow-right" size={16} />
              </Link>
              <span className="text-[13px] font-semibold text-white/70">
                {compactNumber(stats.teacherCount)} teachers
              </span>
            </div>
          </div>

          {/* Teacher card */}
          <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 p-8 text-white shadow-2xl transition-transform hover:scale-[1.02] sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-brand-500/30 blur-3xl transition-transform group-hover:scale-110"
            />

            <span className="relative inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase backdrop-blur-sm">
              <Icon name="award" size={14} />
              For Teachers
            </span>

            <h3 className="relative mt-6 text-3xl font-black tracking-tight sm:text-4xl">
              Grow your class
              <br />
              beyond the classroom.
            </h3>

            <p
              lang="si"
              className="font-si relative mt-4 max-w-md text-[15px] leading-[1.85] font-semibold text-white/85"
            >
              ඔබේ පන්තිය GuruLens හරහා ව්‍යාප්ත කරන්න — verified badge, student reviews, lessons සහ
              followers එකම profile එකකින්.
            </p>

            <ul className="relative mt-6 space-y-3">
              {[
                "Free verified badge for real teachers",
                "Collect honest student reviews",
                "Publish lessons, reels & quizzes",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[14px] font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-full bg-brand-500/40">
                    <Icon name="check" size={14} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="relative mt-8 flex items-center gap-4">
              <Link
                href={teacherCta.href}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-bold text-ink-900 shadow-xl transition-transform hover:-translate-y-0.5"
              >
                {teacherCta.label}
                <Icon name="arrow-right" size={16} />
              </Link>
              <span className="text-[13px] font-semibold text-white/60">Free at launch</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TOP TEACHERS                                                 */}
      {/* ============================================================ */}
      {topTeachers.length > 0 ? (
        <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-ink-900">Top Rated Teachers</h2>
              <p className="mt-2 text-[14px] text-ink-500">
                <span lang="si" className="font-si font-semibold text-ink-600">
                  ඉහළම ශ්‍රේණිගත ගුරුවරුන්
                </span>{" "}
                — ranked by verified reviews
              </p>
            </div>
            <Link
              href="/explore"
              className="hidden items-center gap-1.5 rounded-full bg-brand-50 px-4 py-2 text-[13px] font-bold text-brand-600 transition-colors hover:bg-brand-100 sm:inline-flex"
            >
              View all
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {topTeachers.map((t, i) => (
              <div
                key={t.profileId}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <TeacherCard teacher={t} />
              </div>
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-5 py-2.5 text-[13px] font-bold text-brand-600"
            >
              View all teachers
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/* HOW IT WORKS                                                 */}
      {/* ============================================================ */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">
            How GuruLens Works
          </h2>
          <p
            lang="si"
            className="font-si mt-3 text-[15px] font-semibold text-ink-500"
          >
            සරල පියවර තුනකින් ඔබේ ගුරුවරයා සොයාගන්න.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.title}
              className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-lg ring-1 ring-ink-100 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Step number watermark */}
              <span
                aria-hidden="true"
                className="absolute -top-6 -right-4 text-[120px] leading-none font-black text-ink-900/[0.03] select-none"
              >
                {i + 1}
              </span>

              <div className="relative">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg transition-transform group-hover:scale-110">
                  <Icon name={step.icon} size={26} />
                </div>

                <div className="mt-6">
                  <span className="text-sm font-bold text-brand-500">Step {i + 1}</span>
                  <h3 className="mt-1 text-xl font-black text-ink-900">{step.title}</h3>
                  <span lang="si" className="font-si text-[14px] font-bold text-ink-400">
                    {step.titleSi}
                  </span>
                </div>

                <p className="mt-4 text-[14px] leading-relaxed text-ink-500">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* TESTIMONIALS - Wall of Love                                  */}
      {/* ============================================================ */}
      {topReviews.length > 0 ? (
        <section className="relative overflow-hidden bg-gradient-to-b from-ink-50/50 to-white py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(10,27,61,0.04) 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }}
          />

          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">
                Loved by Students
              </h2>
              <p
                lang="si"
                className="font-si mt-3 text-[15px] font-semibold text-ink-500"
              >
                තහවුරු කළ සිසුන්ගේ සැබෑ අත්දැකීම්.
              </p>
            </div>

            <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
              {topReviews.map((r, i) => (
                <figure
                  key={r.id}
                  className="animate-fade-up break-inside-avoid overflow-hidden rounded-2xl bg-white p-6 shadow-lg ring-1 ring-ink-100"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Icon key={n} name="star" size={16} className="text-warn-500" />
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="quote-cinematic mt-4 text-[15px] leading-relaxed text-ink-700">
                    {truncate(r.feedback, 200)}
                  </blockquote>

                  {/* Author */}
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-5">
                    <Avatar
                      name={r.author.name}
                      src={r.author.avatarKey ? `/api/media/${r.author.avatarKey}` : null}
                      size="md"
                    />
                    <div>
                      <div className="font-bold text-ink-900">{r.author.name}</div>
                      {r.teacher.teacherProfile ? (
                        <Link
                          href={`/teacher/${r.teacher.teacherProfile.handle}`}
                          className="text-[13px] text-ink-400 transition-colors hover:text-brand-600"
                        >
                          Student of {r.teacher.name}
                        </Link>
                      ) : null}
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/* POPULAR SUBJECTS                                             */}
      {/* ============================================================ */}
      {popular.length > 0 ? (
        <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-black tracking-tight text-ink-900">Popular Subjects</h2>
            <p lang="si" className="font-si mt-2 text-[14px] font-semibold text-ink-500">
              විෂය අනුව ගුරුවරුන් සොයන්න.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {popular.map((s, i) => (
              <Link
                key={s.slug}
                href={`/explore?subject=${s.slug}`}
                className="group animate-fade-up relative overflow-hidden rounded-2xl bg-white p-5 shadow-md ring-1 ring-ink-100 transition-all hover:-translate-y-1 hover:shadow-xl"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 text-brand-600 transition-all group-hover:from-brand-500 group-hover:to-accent-500 group-hover:text-white group-hover:shadow-lg">
                  <Icon name="book" size={22} />
                </div>
                <h3 className="mt-4 font-bold text-ink-900">{s.name}</h3>
                {s.nameSi ? (
                  <p lang="si" className="font-si text-[13px] font-semibold text-ink-400">
                    {s.nameSi}
                  </p>
                ) : null}
                <p className="mt-1 text-[12px] text-ink-400">
                  {s.teacherCount} teacher{s.teacherCount === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/* LATEST POSTS                                                 */}
      {/* ============================================================ */}
      {recentPosts.length > 0 ? (
        <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tight text-ink-900">Latest from Teachers</h2>
            <p className="mt-2 text-[14px] text-ink-500">
              Lessons, announcements, reels and discussions.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ============================================================ */}
      {/* FINAL CTA                                                    */}
      {/* ============================================================ */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 p-10 text-center text-white shadow-2xl sm:p-16">
          {/* Decorative orbs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-brand-500/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-accent-500/20 blur-3xl"
          />

          <div className="relative">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Ready to find your
              <br />
              perfect teacher?
            </h2>
            <p
              lang="si"
              className="font-si mx-auto mt-4 max-w-lg text-[16px] leading-[1.9] font-semibold text-white/80"
            >
              දැන්ම GuruLens හරහා ඔබට ගැලපෙන ගුරුවරයා සොයාගන්න — තව ප්‍රමාද නොකර!
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/explore"
                className="glow-pulse inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[15px] font-bold text-brand-700 shadow-xl transition-transform hover:-translate-y-0.5"
              >
                Start Exploring
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link
                href={teacherCta.href}
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-8 py-4 text-[15px] font-bold text-white transition-all hover:border-white/50 hover:bg-white/10"
              >
                {isEducator ? "Open Studio" : "Join as Teacher"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FAQ                                                          */}
      {/* ============================================================ */}
      <section className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-black tracking-tight text-ink-900">Questions?</h2>
          <p lang="si" className="font-si mt-2 text-[14px] font-semibold text-ink-500">
            නිතර අසන ප්‍රශ්න සහ උත්තර.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-ink-100 transition-shadow open:shadow-lg"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[15px] font-bold text-ink-900 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="flex size-8 flex-none items-center justify-center rounded-full bg-ink-100 text-ink-500 transition-transform group-open:rotate-180">
                  <Icon name="chevron-down" size={16} />
                </span>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-[14px] leading-relaxed text-ink-500">{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-black tabular-nums text-ink-900 sm:text-4xl">
        <CountUp value={value} />
      </div>
      <div className="mt-1 text-[12px] font-bold tracking-wider text-ink-400 uppercase">{label}</div>
    </div>
  );
}

function BentoCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bento-item card-premium relative overflow-hidden rounded-3xl p-6">
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 text-brand-600">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-ink-900">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{text}</p>
    </div>
  );
}
