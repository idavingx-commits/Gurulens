import type { Metadata } from "next";
import Link from "next/link";

import { ExploreFilters } from "@/components/explore/ExploreFilters";
import { TeacherCard } from "@/components/teacher/TeacherCard";
import { FloatingDecorations } from "@/components/ui/floating-decorations";
import { Icon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/primitives";
import { getTaxonomy, getTeacherCards } from "@/lib/data";

export const metadata: Metadata = {
  title: "Explore teachers",
  description:
    "Search and compare verified teachers across Sri Lanka by subject, grade, district, language and teaching mode.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type SortKey = "trust" | "rating" | "reviews" | "new";
const SORTS: readonly SortKey[] = ["trust", "rating", "reviews", "new"];

export default async function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const sortRaw = one("sort");
  const sort: SortKey = SORTS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : "trust";

  const [{ teachers, total }, taxonomy] = await Promise.all([
    getTeacherCards({
      q: one("q"),
      subject: one("subject"),
      district: one("district"),
      grade: one("grade"),
      language: one("language"),
      mode: one("mode"),
      verifiedOnly: one("verified") === "1",
      sort,
      limit: 24,
    }),
    getTaxonomy(),
  ]);

  const subjectName = taxonomy.subjects.find((s) => s.slug === one("subject"))?.name;
  const districtName = taxonomy.districts.find((d) => d.slug === one("district"))?.name;

  const heading = subjectName
    ? `${subjectName} teachers${districtName ? ` in ${districtName}` : ""}`
    : districtName
      ? `Teachers in ${districtName}`
      : "Explore teachers";

  return (
    <div className="relative isolate mx-auto w-full max-w-6xl px-4 pt-10 pb-10 sm:px-6">
      {/* Floating education decorations */}
      <FloatingDecorations variant="default" />
      
      {/* Cinematic background orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="orb orb-brand animate-float-slow absolute -top-48 right-[5%] size-[500px]" />
        <div className="orb orb-accent animate-float-slower absolute top-80 -left-48 size-[600px]" />
        <div className="orb orb-brand animate-float-slow absolute top-[60rem] -right-32 size-[400px] opacity-50" />
      </div>

      {/* Page header */}
      <div className="animate-fade-up mb-8">
        <h1 className="text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">{heading}</h1>
        <p className="mt-2 text-[15px] text-ink-500">
          {total > 0 ? (
            <>
              <span className="font-bold text-ink-700">{total}</span> teacher
              {total === 1 ? "" : "s"} found —{" "}
              <span lang="si" className="font-si font-semibold text-ink-600">
                verified reviews අනුව ranked.
              </span>
            </>
          ) : (
            <span lang="si" className="font-si font-semibold text-ink-600">
              ගැලපෙන ගුරුවරුන් හමු නොවීය.
            </span>
          )}
        </p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "50ms" }}>
        <ExploreFilters
          subjects={taxonomy.subjects.map((s) => ({ slug: s.slug, name: s.name }))}
          districts={taxonomy.districts.map((d) => ({ slug: d.slug, name: `${d.name} (${d.province})` }))}
          grades={taxonomy.grades.map((g) => ({ slug: g.slug, name: g.name }))}
          languages={taxonomy.languages.map((l) => ({ slug: l.slug, name: l.name }))}
        />
      </div>

      {/* Results grid */}
      <div className="mt-8">
        {teachers.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teachers.map((t, i) => (
              <div
                key={t.profileId}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <TeacherCard teacher={t} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="search"
            title="No teachers matched your filters"
            description="Try removing a filter or searching a different subject or district. New teachers join every week."
            action={
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-[13px] font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-xl"
              >
                <Icon name="rotate-ccw" size={14} />
                Reset filters
              </Link>
            }
          />
        )}
      </div>

      {/* Info note */}
      <div className="animate-fade-up mt-10 rounded-2xl bg-gradient-to-r from-brand-50/80 to-accent-50/50 p-5 ring-1 ring-brand-100/50" style={{ animationDelay: "200ms" }}>
        <p className="text-[14px] leading-relaxed text-ink-600">
          <strong className="font-bold text-ink-800">How ranking works:</strong>{" "}
          <span lang="si" className="font-si font-semibold">
            Verified review average (Bayesian-smoothed), review credibility, recent activity අනුව —
            paid placement නොවේ.
          </span>
        </p>
      </div>
    </div>
  );
}
