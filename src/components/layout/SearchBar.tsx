"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/format";

type Suggestion = {
  kind: "teacher" | "subject";
  label: string;
  sub?: string;
  href: string;
  avatarKey?: string | null;
};

export function SearchBar({ className, autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ query: string; items: Suggestion[] } | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  const trimmed = q.trim();
  const items = result && result.query === trimmed ? result.items : [];
  const loading = trimmed.length >= 2 && (!result || result.query !== trimmed);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 2) return;
    timer.current = window.setTimeout(async () => {
      try {
        const data = await apiFetch<{ results: Suggestion[] }>(
          `/api/search?q=${encodeURIComponent(query)}`,
        );
        setResult({ query, items: data.results });
        setOpen(true);
      } catch {
        setResult({ query, items: [] });
      }
    }, 260);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    setOpen(false);
    router.push(trimmed ? `/explore?q=${encodeURIComponent(trimmed)}` : "/explore");
  }

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form onSubmit={submit} role="search">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400">
            <Icon name="search" size={17} />
          </span>
          <input
            value={q}
            autoFocus={autoFocus}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => items.length > 0 && setOpen(true)}
            placeholder="Search teachers, subjects, districts…"
            aria-label="Search teachers"
            className="h-11 w-full rounded-full border border-ink-200/80 bg-white/75 pr-4 pl-10 text-sm text-ink-900 placeholder:text-ink-400 backdrop-blur transition-all focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100 focus:outline-none"
          />
          {loading ? (
            <span className="absolute top-1/2 right-4 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500" />
          ) : null}
        </div>
      </form>

      {open && items.length > 0 ? (
        <div className="glass-strong absolute top-13 left-0 z-50 w-full overflow-hidden rounded-2xl p-1.5 animate-pop">
          {items.map((item, i) => (
            <button
              key={`${item.kind}-${i}`}
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(item.href);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink-100/70"
            >
              {item.kind === "teacher" ? (
                <Avatar name={item.label} size="sm" />
              ) : (
                <span className="flex size-8 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon name="book" size={15} />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-800">{item.label}</span>
                {item.sub ? (
                  <span className="block truncate text-xs text-ink-400">{item.sub}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
