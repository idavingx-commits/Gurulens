import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/primitives";
import { cn, timeAgo } from "@/lib/format";

export type ReviewItemData = {
  id: string;
  stars: number;
  clarity: number | null;
  support: number | null;
  organization: number | null;
  feedback: string;
  createdAt: Date;
  teacherReply: string | null;
  author: { id: string; name: string; avatarKey: string | null };
};

export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name={i <= Math.round(value) ? "star" : "star-outline"}
          size={size}
          className={i <= Math.round(value) ? "text-warn-500" : "text-ink-200"}
        />
      ))}
    </span>
  );
}

export function RatingSummary({
  avgStars,
  reviewCount,
  clarity,
  support,
  organization,
  buckets,
}: {
  avgStars: number | null;
  reviewCount: number;
  clarity: number | null;
  support: number | null;
  organization: number | null;
  buckets: number[];
}) {
  const total = buckets.reduce((a, b) => a + b, 0);

  return (
    <div className="glass rounded-card p-5 sm:p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex flex-none items-center gap-4 sm:flex-col sm:gap-1.5 sm:pr-6">
          <div className="text-center">
            <div className="text-4xl font-extrabold text-ink-900 tabular-nums">
              {avgStars !== null && reviewCount > 0 ? avgStars.toFixed(1) : "—"}
            </div>
            <Stars value={avgStars ?? 0} size={13} className="mt-1" />
            <div className="mt-1 text-[11.5px] font-semibold text-ink-400">
              {reviewCount} verified review{reviewCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = buckets[star - 1] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2.5">
                <span className="flex w-8 flex-none items-center gap-0.5 text-[11.5px] font-bold text-ink-500 tabular-nums">
                  {star}
                  <Icon name="star" size={10} className="text-warn-500" />
                </span>
                <ProgressBar value={pct} className="h-1.5" tone="warn" />
                <span className="w-7 flex-none text-right text-[11.5px] font-semibold text-ink-400 tabular-nums">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid flex-none grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-1.5 sm:border-l sm:border-ink-100 sm:pl-6">
          <SubScore label="Clarity" value={clarity} />
          <SubScore label="Support" value={support} />
          <SubScore label="Organization" value={organization} />
        </div>
      </div>
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px] sm:justify-start">
      <span className="font-semibold text-ink-400">{label}</span>
      <span className="font-bold text-ink-800 tabular-nums">
        {value !== null ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}

export function ReviewItem({ review }: { review: ReviewItemData }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar
          name={review.author.name}
          src={review.author.avatarKey ? `/api/media/${review.author.avatarKey}` : null}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[13.5px] font-bold text-ink-900">{review.author.name}</span>
            <span className="inline-flex items-center gap-1 rounded-chip bg-success-100 px-2 py-0.5 text-[10.5px] font-bold text-success-600">
              <Icon name="check" size={10} strokeWidth={3} />
              Verified student
            </span>
            <span className="text-[12px] text-ink-400">· {timeAgo(review.createdAt)}</span>
          </div>
          <Stars value={review.stars} size={13} className="mt-1" />
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">
        {review.feedback}
      </p>

      {review.clarity !== null || review.support !== null || review.organization !== null ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] font-semibold text-ink-400">
          {review.clarity !== null ? <span>Clarity {review.clarity}/5</span> : null}
          {review.support !== null ? <span>Support {review.support}/5</span> : null}
          {review.organization !== null ? <span>Organization {review.organization}/5</span> : null}
        </div>
      ) : null}

      {review.teacherReply ? (
        <div className="mt-3.5 rounded-2xl border-l-2 border-brand-400 bg-brand-50/60 p-3.5">
          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-brand-700">
            <Icon name="message" size={12} />
            Teacher&apos;s reply
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-700">{review.teacherReply}</p>
        </div>
      ) : null}
    </div>
  );
}
