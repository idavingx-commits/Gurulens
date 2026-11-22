import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { ShareButton } from "@/components/ui/share-button";
import { compactNumber } from "@/lib/format";

export type CampusClassCardData = {
  id: string;
  name: string;
  description?: string | null;
  coverKey: string | null;
  mode: string;
  status: string;
  branch: { id: string; name: string } | null;
  teacher: {
    name: string;
    avatarKey: string | null;
    teacherProfile?: { handle: string } | null;
  };
  _count: { enrollments: number; sessions: number };
};

const MODE_LABEL: Record<string, string> = {
  physical: "Physical",
  online: "Online",
  both: "Hybrid",
};

/** Reusable class card for campus class lists and branch pages. */
export function CampusClassCard({ cls }: { cls: CampusClassCardData }) {
  const coverUrl = cls.coverKey ? `/api/media/${cls.coverKey}` : null;

  return (
    <article className="card group relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl">
      <Link href={`/classhub/class/${cls.id}`} className="flex flex-1 flex-col">
        <div className="relative h-24 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <>
              <div
                aria-hidden="true"
                className="absolute -top-10 -right-6 size-32 rounded-full bg-white/10 blur-2xl"
              />
              <div className="absolute inset-0 flex items-center justify-center text-white/70">
                <Icon name="book-open" size={28} />
              </div>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/50 via-transparent to-transparent" />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-chip bg-white/90 px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] text-ink-700 uppercase shadow-sm">
            <Icon name="book" size={10} strokeWidth={2.8} />
            {MODE_LABEL[cls.mode] ?? "Class"}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center gap-1.5">
            <p className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-ink-900" title={cls.name}>
              {cls.name}
            </p>
            {cls.status !== "active" ? (
              <span className="rounded-chip bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold capitalize text-ink-500">
                {cls.status}
              </span>
            ) : null}
          </div>

          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold text-ink-500">
            <span className="inline-flex min-w-0 items-center gap-1">
              <Avatar
                name={cls.teacher.name}
                src={cls.teacher.avatarKey ? `/api/media/${cls.teacher.avatarKey}` : null}
                size="xs"
              />
              <span className="truncate">{cls.teacher.name}</span>
            </span>
            {cls.branch ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex min-w-0 items-center gap-0.5">
                  <Icon name="location" size={10} />
                  <span className="truncate">{cls.branch.name}</span>
                </span>
              </>
            ) : null}
          </p>

          {cls.description ? (
            <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-ink-500">
              {cls.description}
            </p>
          ) : null}

          <div className="mt-auto flex items-center gap-4 border-t border-ink-100 pt-2.5 text-[11.5px] text-ink-400">
            <span className="flex items-center gap-1">
              <Icon name="users" size={12} /> {compactNumber(cls._count.enrollments)} students
            </span>
            <span className="flex items-center gap-1">
              <Icon name="calendar" size={12} /> {compactNumber(cls._count.sessions)} sessions
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute top-2.5 right-2.5 z-20">
        <ShareButton
          path={`/classhub/class/${cls.id}`}
          title={`${cls.name} · GuruLens`}
          text={`View ${cls.name} on GuruLens ClassHub`}
          label="Share class"
          iconOnly
          className="!h-8 border-white/60 bg-white/90 text-ink-700 shadow-sm backdrop-blur-sm hover:bg-white"
        />
      </div>
    </article>
  );
}
