/**
 * Trust ranking math.
 *
 * A teacher's displayed rating is never a plain average:
 * - Bayesian smoothing pulls low-volume ratings toward a prior,
 *   so "5.0 from 2 students" cannot outrank "4.8 from 250 students".
 * - A Wilson lower bound powers the share of credible (verified) reviews.
 * - Recency gives a small, bounded boost to recently active teachers.
 */

import { RANKING_PRIOR_MEAN, RANKING_PRIOR_WEIGHT } from "@/lib/constants";

export function bayesianAverage(
  avgStars: number | null,
  reviewCount: number,
  priorMean: number = RANKING_PRIOR_MEAN,
  priorWeight: number = RANKING_PRIOR_WEIGHT,
): number {
  if (avgStars === null || reviewCount <= 0) return 0;
  return (avgStars * reviewCount + priorMean * priorWeight) / (reviewCount + priorWeight);
}

export function wilsonLowerBound(positive: number, total: number, z = 1.96): number {
  if (total <= 0) return 0;
  const phat = positive / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = phat + z2 / (2 * total);
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * total)) / total);
  return Math.max(0, (center - margin) / denom);
}

export type TrustInput = {
  avgStars: number | null;
  reviewCount: number;
  verifiedShare?: number; // 0..1
  lastActivityAt?: Date | null;
};

/**
 * Final ranking score (0..5-ish). Transparent formula, shown in the
 * methodology note on Explore pages.
 */
export function trustScore({
  avgStars,
  reviewCount,
  verifiedShare = 1,
  lastActivityAt = null,
}: TrustInput): number {
  const base = bayesianAverage(avgStars, reviewCount);
  if (base === 0) return 0;
  const credibility = 0.85 + 0.15 * Math.max(0, Math.min(1, verifiedShare));
  let recency = 1;
  if (lastActivityAt) {
    const days = (Date.now() - lastActivityAt.getTime()) / (24 * 60 * 60 * 1000);
    recency = 1 + 0.05 * Math.max(0, 1 - days / 90); // up to +5% for recent activity
  }
  return base * credibility * recency;
}

export function displayRating(avgStars: number | null, reviewCount: number): string {
  if (!avgStars || reviewCount === 0) return "—";
  return avgStars.toFixed(1);
}

export function ratingBuckets(starsList: number[]): number[] {
  const buckets = [0, 0, 0, 0, 0];
  for (const s of starsList) {
    const idx = Math.min(5, Math.max(1, Math.round(s))) - 1;
    buckets[idx] += 1;
  }
  return buckets;
}
