import type { ReactNode } from "react";

export function StaticPage({
  title,
  kicker,
  intro,
  updated,
  children,
}: {
  title: string;
  kicker?: string;
  intro: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 pt-10 pb-10 sm:px-6">
      {kicker ? (
        <p className="text-[12px] font-extrabold tracking-widest text-brand-600 uppercase">
          {kicker}
        </p>
      ) : null}
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{intro}</p>
      {updated ? (
        <p className="mt-2 text-[12px] font-semibold text-ink-300">Last updated {updated}</p>
      ) : null}
      <div className="mt-9 space-y-6">{children}</div>
    </article>
  );
}

export function StaticSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-24 p-6 sm:p-7">
      <h2 className="text-lg font-extrabold tracking-tight text-ink-900">{title}</h2>
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink-600">{children}</div>
    </section>
  );
}

export function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden="true" className="mt-[7px] size-1.5 flex-none rounded-full bg-brand-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
