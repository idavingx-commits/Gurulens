import type { Metadata } from "next";
import Link from "next/link";

import { LmsCourseCard } from "@/components/lms/LmsCourseCard";
import { ContactCtaCard } from "@/components/marketing/contact-panel";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { EmptyState, InfoNote, ProgressBar, SectionHeader } from "@/components/ui/primitives";
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

const HUB_PROMISES = [
  {
    icon: "target",
    title: "Learn at your pace",
    body: "Every course is structured into modules and short lessons you can finish in one sitting.",
  },
  {
    icon: "chart",
    title: "See real progress",
    body: "Lesson completion and course progress are saved automatically to your account.",
  },
  {
    icon: "bell",
    title: "Never miss an update",
    body: "Teachers post announcements and schedule changes right on this hub.",
  },
] as const;

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
  const logoKey = workspace.logoKey ?? workspace.organization?.logoKey ?? null;
  const featured = inProgress[0] ?? published[0] ?? cards[0] ?? null;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[1.9rem] bg-ink-900 text-white shadow-[0_30px_70px_-35px_rgba(5,16,38,0.8)]">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: coverUrl
              ? "linear-gradient(90deg, rgba(5,16,38,0.94) 0%, rgba(5,16,38,0.65) 55%, rgba(5,16,38,0.35) 100%)"
              : `linear-gradient(125deg, #07152e 0%, ${brand} 145%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-10 size-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-accent-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />

        <div className="relative grid gap-7 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[9.5px] font-black tracking-[0.14em] uppercase backdrop-blur-sm">
                <Icon name="school" size={11} />{" "}
                {workspace.organization?.type === "school" ? "School hub" : "Learning hub"}
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
              {logoKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/${logoKey}`}
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
                <h1 className="text-[27px] leading-[1.08] font-black tracking-tight sm:text-[36px]">
                  {workspace.name}
                </h1>
                {workspace.tagline ? (
                  <p className="mt-1 max-w-2xl text-[13px] font-semibold text-white/75">
                    {workspace.tagline}
                  </p>
                ) : null}
                <p
                  lang="si"
                  className="font-si mt-1 text-[11.5px] leading-[1.8] font-semibold text-white/50"
                >
                  ඔබේ පාඩම්, ප්‍රගතිය සහ නවතම දැනුම්දීම් එකම තැනකින්.
                </p>
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
                  className="rounded-xl border border-white/10 bg-white/10 px-2 py-2.5 text-center backdrop-blur-sm"
                >
                  <div className="text-[19px] leading-none font-black tabular-nums">{item.value}</div>
                  <div className="mt-1 text-[8.5px] font-bold tracking-[0.1em] text-white/55 uppercase">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {featured ? (
            <Link
              href={`${base}/courses/${featured.id}`}
              className="group relative block overflow-hidden rounded-[1.4rem] border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-md transition-transform hover:-translate-y-1"
            >
              <div className="relative aspect-[16/9] overflow-hidden rounded-[1rem] bg-gradient-to-br from-brand-600 to-accent-600">
                {featured.coverKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/media/${featured.coverKey}`}
                    alt=""
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Icon name="book-open" size={30} className="text-white/80" />
                  </div>
                )}
                <span className="absolute top-2.5 left-2.5 rounded-full bg-ink-900/70 px-2 py-0.5 text-[9px] font-black tracking-wide text-white uppercase backdrop-blur-sm">
                  {featured.enrolled ? "Continue" : "Featured course"}
                </span>
              </div>
              <div className="px-2 pt-3 pb-1.5">
                <p className="text-[9.5px] font-black tracking-[0.14em] text-white/45 uppercase">
                  {featured.enrolled ? "Pick up where you left off" : "Start learning today"}
                </p>
                <h2 className="mt-1 line-clamp-2 text-[15px] leading-snug font-extrabold text-white">
                  {featured.title}
                </h2>
                {featured.enrolled ? (
                  <>
                    <div className="mt-3 mb-1.5 flex items-center justify-between text-[10px] font-bold text-white/60">
                      <span>{featured.progress}% complete</span>
                      <span>
                        {featured.lessonCount} lesson{featured.lessonCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ProgressBar
                      value={featured.progress}
                      tone={featured.progress >= 100 ? "success" : "brand"}
                      className="h-1.5 bg-white/20"
                    />
                  </>
                ) : (
                  <div className="mt-3 flex items-center justify-between text-[10.5px] font-bold text-white/60">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="grid" size={11} /> {featured.moduleCount} modules
                    </span>
                    <span className="inline-flex items-center gap-1 text-brand-200">
                      View course <Icon name="arrow-right" size={11} />
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <div className="rounded-[1.4rem] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 text-brand-200">
                <Icon name="sparkles" size={20} />
              </span>
              <h2 className="mt-3 text-[17px] font-black">A new way to learn</h2>
              <p className="mt-1.5 text-[12px] leading-relaxed text-white/60">
                Courses, lessons and progress tracking live on this hub. Create a free account to
                enroll when the first course goes live.
              </p>
              <Link
                href="/register"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[11.5px] font-black text-ink-900"
              >
                Create free account <Icon name="arrow-right" size={12} />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {HUB_PROMISES.map((item) => (
          <div key={item.title} className="card flex items-start gap-3 p-4">
            <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon name={item.icon} size={16} />
            </span>
            <div>
              <h2 className="text-[12.5px] font-extrabold text-ink-900">{item.title}</h2>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{item.body}</p>
            </div>
          </div>
        ))}
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
              <article
                key={item.id}
                className="card relative overflow-hidden p-4 pl-5"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: brand }}
                />
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
        <section className="relative overflow-hidden rounded-[1.75rem] border border-white bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 p-5 text-white shadow-xl sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-brand-500/30 blur-3xl"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[9px] font-black tracking-[0.14em] uppercase">
                <Icon name="sparkles" size={10} /> Hub owner
              </span>
              <h2 className="mt-2 text-[16px] font-black">Your learning hub is live</h2>
              <p className="mt-0.5 max-w-xl text-[11.5px] leading-relaxed text-white/60">
                Share <span className="font-bold text-white">{workspace.subdomain}.gurulens.us</span>{" "}
                with your students, or manage courses, learners and announcements.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`${base}/manage`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[11.5px] font-black text-ink-900 hover:bg-white/90"
              >
                <Icon name="settings" size={13} /> Manage
              </Link>
              <Link
                href={`${base}/manage/new`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11.5px] font-bold text-white backdrop-blur-sm hover:bg-white/20"
              >
                <Icon name="plus" size={13} /> Add course
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <ContactCtaCard
        topic="partnership"
        title="Need help with this learning hub?"
        body="Questions about courses, enrollment or bringing your own school or institute online? The GuruLens team is one message away."
      />
    </div>
  );
}
