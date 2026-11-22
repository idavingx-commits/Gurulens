import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { VerifiedTick } from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { compactNumber } from "@/lib/format";

export const CHANNEL_TYPE_META: Record<
  string,
  { label: string; icon: string; chip: string }
> = {
  personal: {
    label: "Teacher",
    icon: "user",
    chip: "bg-brand-600/95 text-white",
  },
  institute: {
    label: "Institute",
    icon: "users",
    chip: "bg-accent-600/95 text-white",
  },
  school: {
    label: "School",
    icon: "school",
    chip: "bg-success-600/95 text-white",
  },
};

export type ChannelCardData = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  avatarKey: string | null;
  coverKey: string | null;
  verifiedStatus: string;
  followerCount?: number;
  postCount?: number;
  _count?: { followers?: number | null; posts?: number | null } | null;
};

/**
 * Channel card shared by the channel directory and campus channel pages.
 * The name intentionally sits in its own row below the avatar so it can
 * never be covered by the overlapping profile photo.
 */
export function ChannelCard({
  channel,
  canManage = false,
}: {
  channel: ChannelCardData;
  canManage?: boolean;
}) {
  const avatarUrl = channel.avatarKey ? `/api/media/${channel.avatarKey}` : null;
  const coverUrl = channel.coverKey ? `/api/media/${channel.coverKey}` : null;
  const followers = channel._count?.followers ?? channel.followerCount ?? 0;
  const posts = channel._count?.posts ?? channel.postCount ?? 0;
  const meta = CHANNEL_TYPE_META[channel.type] ?? CHANNEL_TYPE_META.personal;

  return (
    <article className="card group relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl">
      <Link href={`/channel/${channel.slug}`} className="flex flex-1 flex-col">
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
                <Icon name="radio" size={30} />
              </div>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/50 via-transparent to-transparent" />
          <span
            className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] uppercase shadow-sm ${meta.chip}`}
          >
            <Icon name={meta.icon} size={10} strokeWidth={2.8} />
            {meta.label}
          </span>
        </div>

        <div className="relative z-10 flex flex-1 flex-col px-4 pb-4">
          <Avatar name={channel.name} src={avatarUrl} size="lg" ring className="-mt-7" />
          <div className="mt-2.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink-900"
                title={channel.name}
              >
                {channel.name}
              </span>
              {channel.verifiedStatus === "verified" ? (
                <VerifiedTick className="size-4 flex-none" />
              ) : null}
            </div>
            <p className="truncate text-[12px] text-ink-400">@{channel.slug}</p>
          </div>

          {channel.description ? (
            <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-600">
              {channel.description}
            </p>
          ) : null}

          <div className="mt-auto flex items-center gap-4 border-t border-ink-100 pt-2.5 text-xs text-ink-400">
            <span className="flex items-center gap-1">
              <Icon name="users" size={13} /> {compactNumber(followers)}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="file-text" size={13} /> {compactNumber(posts)} posts
            </span>
            <span className="ml-auto inline-flex items-center gap-0.5 font-bold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
              View <Icon name="chevron-right" size={13} />
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
        {canManage ? (
          <Link
            href={`/channel/${channel.slug}/settings`}
            aria-label={`Manage ${channel.name}`}
            className="flex size-8 items-center justify-center rounded-full border border-white/60 bg-white/90 text-ink-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-brand-700"
          >
            <Icon name="settings" size={14} />
          </Link>
        ) : null}
        <ShareButton
          path={`/channel/${channel.slug}`}
          title={`${channel.name} · GuruLens`}
          text={`Follow ${channel.name} on GuruLens`}
          label="Share channel"
          iconOnly
          className="!h-8 border-white/60 bg-white/90 text-ink-700 shadow-sm backdrop-blur-sm hover:bg-white"
        />
      </div>
    </article>
  );
}
