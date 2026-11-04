import type { Metadata } from "next";
import Link from "next/link";

import { MfaCard } from "@/components/settings/MfaCard";
import { PasswordForm } from "@/components/settings/PasswordForm";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { Icon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      role: true,
      createdAt: true,
      mfaEnabled: true,
      avatarKey: true,
      teacherProfile: { select: { handle: true } },
    },
  });
  if (!record) return null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-8 pb-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-800 to-ink-900 text-white">
          <Icon name="sliders" size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Settings</h1>
          <p className="text-[13px] text-ink-500">Manage your account, security and profile.</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="card flex items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 flex-none items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Icon name="user" size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-bold text-ink-900">{record.email}</p>
              <p className="text-[12px] text-ink-400 capitalize">
                {record.role} · joined {formatDate(record.createdAt)}
              </p>
            </div>
          </div>
          {record.teacherProfile ? (
            <Link
              href={`/teacher/${record.teacherProfile.handle}`}
              className="flex-none rounded-chip bg-brand-50 px-3.5 py-2 text-[12.5px] font-bold text-brand-700 transition-colors hover:bg-brand-100"
            >
              View public profile
            </Link>
          ) : null}
        </div>

        <ProfileForm
          initialName={user.name}
          avatarUrl={record.avatarKey ? `/api/media/${record.avatarKey}` : null}
        />

        <PasswordForm />

        <MfaCard enabled={record.mfaEnabled} />

        {record.teacherProfile ? (
          <div className="glass flex items-center justify-between gap-4 rounded-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 flex-none items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
                <Icon name="video" size={18} />
              </span>
              <div>
                <p className="text-[13.5px] font-bold text-ink-900">Teaching profile & studio</p>
                <p className="text-[12px] text-ink-400">
                  Subjects, classes, enrollment codes and verification live in Studio.
                </p>
              </div>
            </div>
            <Link
              href="/studio"
              className="flex-none rounded-chip bg-ink-900 px-3.5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-ink-800"
            >
              Open Studio
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
