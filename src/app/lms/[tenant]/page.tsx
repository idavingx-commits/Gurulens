import type { Metadata } from "next";
import Link from "next/link";

import { LmsCourseCard } from "@/components/lms/LmsCourseCard";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { EmptyState, InfoNote, SectionHeader } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import {
  getLmsAccess,
  getLmsAnnouncements,
  getLmsBasePath,
  getLmsCourseCards,
  getLmsStats,
  getLmsWorkspaceBySubdomain,
  lmsBrandColor,
  lmsInitials,
} from "@/lib/lms";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  if (!workspace) return { title: "Learning hub" };
  return {
    title: `${workspace.name} · Learning hub`,
    description: workspace.description ?? workspace.tagline ?? `${workspace.name} on GuruLens.`,
  };
}

export default async function LmsHomePage({ params }: Props) {
  const { tenant } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  if (!workspace) return null;

  const auth = await getAuth();
  const access = await getLmsAccess(workspace, auth?.user ?? null);
  const base = await getLmsBasePath(workspace.subdomain);
  const brand = lmsBrandColor(workspace.brandColor);

  const [cards, stats, announcements] = await Promise.all([
    getLmsCourseCards(workspace.id, auth?.user.id ?? null, { includeDrafts: access.canManage }),
    getLmsStats(workspace.id),
    getLmsAnnouncements(workspace.id, 4),
  ]);

  const inProgress = cards.filter(
    (course) => course.enrolled && course.enrollmentStatus !== "completed" && course.progress > 0,
  );
  const published = cards.filter((course) => course.status === "published");
  const coverUrl = workspace.coverKey ? `/api/media/${workspace.coverKey}` : null;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-ink-900 text-white shadow-xl">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: coverUrl
              ? "linear-gradient(90deg, rgba(5,16,38,0.92) 0%, rgba(5,16,38,0.6) 55%, rgba(5,16,38,0.3) 100%)"
              : `linear-gradient(125deg, #07152e 0%, ${brand} 130%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-20 -right-10 size-64 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative px-5 py-7 sm:px-8 sm:py-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[9.5px] font-black tracking-[0.14em] uppercase backdrop-blur-sm">
              <Icon name="school" size={11} /> {workspace.organization?.type === "school" ? "School hub" : "Learning hub"}
            </span>
            {workspace.organization?.verifiedStatus === "verified" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-500/90 px-2.5 py-1 text-[9.5px] font-black tracking-wide uppercase">
                <Icon name="shield-check" size={10} /> Verified
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[9.5px] font-bold tracking-wide uppercase backdrop-blur-sm">
              {workspace.subdomain}.gurulens.us
            </span>
          </div>

          <div className="mt-4 flex items-start gap-3.5">
            {workspace.logoKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/${workspace.logoKey}`}
                alt=""
                className="size-14 flex-none rounded-2xl object-cover ring-2 ring-white/30"
              />
            ) : (
              <span
                className="flex size-14 flex-none items-center justify-center rounded-2xl text-[16px] font-black text-white ring-2 ring-white/25"
                style={{ backgroundColor: brand }}
              >
                {lmsInitials(workspace.name)}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-[27px] leading-[1.1] font-black tracking-tight sm:text-[34px]">
                {workspace.name}
              </h1>
              {workspace.tagline ? (
                <p className="mt-1 max-w-2xl text-[13px] font-semibold text-white/75">
                  {workspace.tagline}
                </p>
              ) : null}
            </div>
          </div>

          {workspace.description ? (
            <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-white/65">
              {workspace.description}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href={`${base}/courses`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[12.5px] font-black text-ink-900 shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <Icon name="book-open" size={14} /> Browse courses
            </Link>
            {access.member ? (
              <Link
                href={`${base}/dashboard`}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12.5px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Icon name="target" size={14} /> My learning
              </Link>
            ) : null}
            {access.canManage ? (
              <Link
                href={`${base}/manage`}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12.5px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Icon name="settings" size={14} /> Manage hub
              </Link>
            ) : null}
          </div>

          <div className="mt-6 grid max-w-xl grid-cols-4 gap-2">
            {[
              { label: "Courses", value: stats.publishedCourses },
              { label: "Lessons", value: stats.lessons },
              { label: "Learners", value: stats.learners },
              { label: "Completed", value: stats.completions },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/10 px-2 py-2 text-center backdrop-blur-sm"
              >
                <div className="text-[18px] leading-none font-black tabular-nums">{item.value}</div>
                <div className="mt-1 text-[8.5px] font-bold tracking-[0.1em] text-white/55 uppercase">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!auth ? (
        <InfoNote icon="info">
          You&apos;re browsing as a guest.{" "}
          <Link href="/login" className="font-bold underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="font-bold underline">
            create a free account
          </Link>{" "}
          to enroll, track progress and join members-only courses.
        </InfoNote>
      ) : null}

      {inProgress.length > 0 ? (
        <section>
          <SectionHeader
            title="Continue learning"
            subtitle="Pick up exactly where you stopped."
            action={
              <Link
                href={`${base}/dashboard`}
                className="inline-flex items-center gap-1 text-[11.5px] font-bold text-brand-600 hover:text-brand-700"
              >
                Full dashboard <Icon name="arrow-right" size={12} />
              </Link>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((course) => (
              <LmsCourseCard key={course.id} course={course} base={base} />
            ))}
          </div>
        </section>
      ) : null}

      {announcements.length > 0 ? (
        <section>
          <SectionHeader title="Announcements" subtitle="Updates from your teachers." />
          <div className="grid gap-3 sm:grid-cols-2">
            {announcements.map((item) => (
              <article key={item.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-8 flex-none items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: brand }}
                  >
                    <Icon name="bell" size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13px] font-extrabold text-ink-900">{item.title}</h3>
                      {item.pinned ? (
                        <span className="rounded-full bg-warn-100 px-1.5 py-0.5 text-[8.5px] font-black text-warn-600 uppercase">
                          Pinned
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-3 text-[11.5px] leading-relaxed text-ink-500">
                      {item.body}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-ink-400">
                      {item.author ? (
                        <Avatar
                          name={item.author.name}
                          src={
                            item.author.avatarKey ? `/api/media/${item.author.avatarKey}` : null
                          }
                          size="xs"
                        />
                      ) : null}
                      {item.author?.name ?? "Hub team"} · {timeAgo(item.createdAt)}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="Courses"
          subtitle={`${published.length} published course${published.length === 1 ? "" : "s"} in this hub.`}
          action={
            access.canManage ? (
              <Link
                href={`${base}/manage/new`}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3.5 py-1.5 text-[11.5px] font-bold text-white hover:bg-ink-800"
              >
                <Icon name="plus" size={12} /> New course
              </Link>
            ) : null
          }
        />

        {cards.length === 0 ? (
          <EmptyState
            icon="book-open"
            title="No courses published yet"
            description={
              access.canManage
                ? "Build your first course with modules, lessons and progress tracking."
                : "This learning hub is getting ready. Check back soon for new courses."
            }
            action={
              access.canManage ? (
                <Link
                  href={`${base}/manage/new`}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[12.5px] font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700"
                >
                  <Icon name="plus" size={14} /> Create a course
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((course) => (
              <LmsCourseCard key={course.id} course={course} base={base} />
            ))}
          </div>
        )}
      </section>

      {access.canManage ? (
        <section className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50/80 to-accent-50/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-extrabold text-ink-900">Your learning hub is live</h2>
              <p className="mt-0.5 text-[11.5px] text-ink-500">
                Share <span className="font-bold">{workspace.subdomain}.gurulens.us</span> with your
                students, or manage courses, learners and announcements.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`${base}/manage`}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[11.5px] font-bold text-white hover:bg-brand-700"
              >
                <Icon name="settings" size={13} /> Manage
              </Link>
              <Link
                href={`${base}/manage/new`}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-[11.5px] font-bold text-ink-700 hover:border-brand-300 hover:text-brand-700"
              >
                <Icon name="plus" size={13} /> Add course
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
