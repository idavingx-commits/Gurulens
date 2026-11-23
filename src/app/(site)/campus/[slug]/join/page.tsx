import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { getAuth } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organizations";
import { getSchoolClasses, getSchoolContext } from "@/lib/school";
import { JoinSchoolForm } from "./join-form";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: "Join school · Campus",
  robots: { index: false, follow: false },
};

export default async function JoinSchoolPage({ params }: Props) {
  const auth = await getAuth();
  const { slug } = await params;
  if (!auth) redirect(`/login?redirect=/campus/${slug}/join`);

  const org = await getOrganizationBySlug(slug);
  if (!org || org.type !== "school") notFound();

  const context = await getSchoolContext(auth.user.id, org.id);
  if (context.isMember) redirect(`/campus/${slug}/timetable`);

  const classes = await getSchoolClasses(org.id);

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-8 pb-14 sm:px-6">
      <Link
        href={`/campus/${slug}`}
        className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-400 transition-colors hover:text-brand-600"
      >
        <Icon name="arrow-left" size={13} /> Back to {org.name}
      </Link>

      <div className="glass-strong animate-fade-up relative mt-4 overflow-hidden rounded-3xl p-7 sm:p-9">
        <div
          aria-hidden="true"
          className="absolute inset-x-10 top-0 h-[3px] rounded-b-full bg-gradient-to-r from-ink-900 via-brand-600 to-accent-500"
        />
        <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon name="school" size={20} />
        </span>
        <h1 className="mt-3 text-xl font-extrabold tracking-tight text-ink-900">
          Join {org.name}
        </h1>
        <p lang="si" className="font-si mt-1.5 text-[13px] font-semibold leading-[1.85] text-ink-500">
          ඔබේ ඇතුළත් වීමේ අංකය හෝ කාර්ය මණ්ඩල අංකය සමඟ ලියාපදිංචි වන්න — විද්‍යාලයේ කාලසටහන් සහ
          පන්ති තොරතුරු ලබා ගැනීමට.
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">
          Register with your school-issued identifier. The school office approves your account,
          then you can see your class timetable and school-only content.
        </p>

        {context.isPending ? (
          <div className="mt-5 rounded-2xl border border-warn-500/30 bg-warn-100/60 p-4 text-[13px] font-semibold text-warn-600">
            <p className="flex items-center gap-2 font-bold">
              <Icon name="clock" size={15} /> Registration awaiting approval
            </p>
            <p className="mt-1 leading-relaxed">
              You already registered. The school will approve your account soon — you&apos;ll get a
              notification.
            </p>
          </div>
        ) : (
          <JoinSchoolForm
            organizationId={org.id}
            schoolName={org.name}
            accountRole={auth.user.role}
            fullName={auth.user.name}
            classes={classes.map((c) => ({ id: c.id, name: c.name }))}
          />
        )}
      </div>
    </div>
  );
}
