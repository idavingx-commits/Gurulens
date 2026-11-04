"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { Icon } from "@/components/ui/icons";
import { Checkbox, Select } from "@/components/ui/input";

type Option = { slug: string; name: string };

export function ExploreFilters({
  subjects,
  districts,
  grades,
  languages,
}: {
  subjects: Option[];
  districts: Option[];
  grades: Option[];
  languages: Option[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`/explore?${params.toString()}`, { scroll: false });
    },
    [router, sp],
  );

  const current = (k: string) => sp.get(k) ?? "";
  const hasFilters = ["q", "subject", "district", "grade", "language", "mode", "verified"].some(
    (k) => sp.get(k),
  );

  return (
    <div className="glass rounded-card p-4 sm:p-5">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-bold text-ink-700">
          <Icon name="filter" size={15} className="text-brand-600" />
          Filters
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              const sort = sp.get("sort");
              if (sort) params.set("sort", sort);
              const qs = params.toString();
              router.push(qs ? `/explore?${qs}` : "/explore", { scroll: false });
            }}
            className="inline-flex items-center gap-1 rounded-chip px-2.5 py-1 text-[12px] font-bold text-ink-400 transition-colors hover:bg-ink-100/70 hover:text-ink-700"
          >
            <Icon name="x" size={12} strokeWidth={2.6} />
            Clear all
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <FilterSelect
          label="Subject"
          value={current("subject")}
          onChange={(v) => setParam("subject", v)}
          options={subjects}
          allLabel="All subjects"
        />
        <FilterSelect
          label="District"
          value={current("district")}
          onChange={(v) => setParam("district", v)}
          options={districts}
          allLabel="All districts"
        />
        <FilterSelect
          label="Grade / Exam"
          value={current("grade")}
          onChange={(v) => setParam("grade", v)}
          options={grades}
          allLabel="All grades"
        />
        <FilterSelect
          label="Language"
          value={current("language")}
          onChange={(v) => setParam("language", v)}
          options={languages}
          allLabel="Any language"
        />
        <FilterSelect
          label="Mode"
          value={current("mode")}
          onChange={(v) => setParam("mode", v)}
          options={[
            { slug: "online", name: "Online" },
            { slug: "physical", name: "Physical" },
            { slug: "both", name: "Online + Physical" },
          ]}
          allLabel="Any mode"
        />
        <FilterSelect
          label="Sort by"
          value={current("sort") || "trust"}
          onChange={(v) => setParam("sort", v === "trust" ? "" : v)}
          options={[
            { slug: "trust", name: "Recommended" },
            { slug: "rating", name: "Highest rated" },
            { slug: "reviews", name: "Most reviews" },
            { slug: "new", name: "Newest" },
          ]}
          allLabel="Recommended"
          forceValue="trust"
        />
      </div>

      {current("q") ? (
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-chip bg-brand-50 px-3 py-1.5 text-[12px] font-bold text-brand-700">
            <Icon name="search" size={12} strokeWidth={2.4} />
            &ldquo;{current("q")}&rdquo;
            <button
              type="button"
              onClick={() => setParam("q", "")}
              className="ml-0.5 text-brand-500 hover:text-brand-700"
              aria-label="Clear search"
            >
              <Icon name="x" size={12} strokeWidth={2.6} />
            </button>
          </span>
        </div>
      ) : null}

      <div className="mt-3.5 border-t border-ink-100 pt-3.5">
        <Checkbox
          checked={current("verified") === "1"}
          onChange={(e) => setParam("verified", e.target.checked ? "1" : "")}
          label={<span className="text-[13px] font-semibold">Verified teachers only</span>}
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  forceValue,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  allLabel: string;
  forceValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold tracking-wide text-ink-400 uppercase">
        {label}
      </span>
      <div className="relative">
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 py-0 pr-8 text-[13px] font-semibold"
        >
          {forceValue ? null : <option value="">{allLabel}</option>}
          {options.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name}
            </option>
          ))}
        </Select>
        <Icon
          name="chevron-down"
          size={14}
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-400"
        />
      </div>
    </label>
  );
}
