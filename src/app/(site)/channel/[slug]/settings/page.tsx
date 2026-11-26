import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ShareButton } from "@/components/ui/share-button";
import { Icon } from "@/components/ui/icons";
import { getAuth } from "@/lib/auth";
import { canManageChannel, getChannelBySlug } from "@/lib/channels";
import { ChannelSettingsForm } from "./channel-settings-form";
import { ChannelDangerZone } from "./danger-zone";

export const metadata: Metadata = { title: "Channel settings" };

type Props = { params: Promise<{ slug: string }> };

export default async function ChannelSettingsPage({ params }: Props) {
  const { slug } = await params;
  const auth = await getAuth();
  if (!auth) redirect(`/login?redirect=/channel/${slug}/settings`);

  const channel = await getChannelBySlug(slug);
  if (!channel || !channel.isActive) notFound();

  const allowed = await canManageChannel(channel, auth.user.id);
  if (!allowed) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-md">
            <Icon name="settings" size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Channel settings</h1>
            <p className="text-[13px] text-ink-500">Manage {channel.name}&apos;s look and visibility.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton
            path={`/channel/${slug}`}
            title={channel.name}
            text={`Follow ${channel.name} on GuruLens`}
            label="Share"
          />
          <Link
            href={`/channel/${slug}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-200 bg-white/70 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
          >
            <Icon name="external" size={14} /> View channel
          </Link>
        </div>
      </div>

      <ChannelSettingsForm
        slug={slug}
        initialName={channel.name}
        initialDescription={channel.description ?? ""}
        initialVisibility={channel.visibility}
        avatarUrl={channel.avatarKey ? `/api/media/${channel.avatarKey}` : null}
        coverUrl={channel.coverKey ? `/api/media/${channel.coverKey}` : null}
      />
      <ChannelDangerZone
        slug={slug}
        followerCount={channel.followerCount}
        isCampusChannel={channel.organizationId !== null}
      />
    </div>
  );
}
