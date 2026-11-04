import { describe, expect, it } from "vitest";

import { RANKING_PRIOR_MEAN, RANKING_PRIOR_WEIGHT } from "@/lib/constants";
import {
  bayesianAverage,
  displayRating,
  ratingBuckets,
  trustScore,
  wilsonLowerBound,
} from "@/lib/ranking";

describe("bayesianAverage", () => {
  it("returns 0 when there are no reviews", () => {
    expect(bayesianAverage(null, 0)).toBe(0);
    expect(bayesianAverage(4.9, 0)).toBe(0);
  });

  it("pulls small samples toward the prior", () => {
    const twoReviews = bayesianAverage(5, 2);
    const expected = (5 * 2 + RANKING_PRIOR_MEAN * RANKING_PRIOR_WEIGHT) / (2 + RANKING_PRIOR_WEIGHT);
    expect(twoReviews).toBeCloseTo(expected, 10);
    expect(twoReviews).toBeLessThan(5);
    expect(twoReviews).toBeGreaterThan(RANKING_PRIOR_MEAN);
  });

  it("approaches the raw average as the sample grows", () => {
    const big = bayesianAverage(4.8, 100000);
    expect(big).toBeCloseTo(4.8, 3);
  });
});

describe("wilsonLowerBound", () => {
  it("returns 0 for an empty sample", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });

  it("is monotonically increasing with more positives", () => {
    const low = wilsonLowerBound(10, 20);
    const mid = wilsonLowerBound(15, 20);
    const high = wilsonLowerBound(19, 20);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    expect(high).toBeLessThanOrEqual(1);
  });

  it("rewards confidence: same ratio, bigger sample scores higher", () => {
    expect(wilsonLowerBound(8, 10)).toBeLessThan(wilsonLowerBound(80, 100));
  });
});

describe("trustScore", () => {
  it("is 0 without ratings", () => {
    expect(trustScore({ avgStars: null, reviewCount: 0 })).toBe(0);
  });

  it("ranks a well-reviewed 4.8 above a tiny 5.0", () => {
    const solid = trustScore({ avgStars: 4.8, reviewCount: 250 });
    const thin = trustScore({ avgStars: 5, reviewCount: 2 });
    expect(solid).toBeGreaterThan(thin);
  });

  it("applies credibility weighting for unverified reviews", () => {
    const verified = trustScore({ avgStars: 4.5, reviewCount: 50, verifiedShare: 1 });
    const unverified = trustScore({ avgStars: 4.5, reviewCount: 50, verifiedShare: 0 });
    expect(verified).toBeGreaterThan(unverified);
    expect(unverified).toBeCloseTo(verified * 0.85, 5);
  });

  it("gives a small, bounded recency boost", () => {
    const fresh = trustScore({ avgStars: 4.5, reviewCount: 50, lastActivityAt: new Date() });
    const stale = trustScore({
      avgStars: 4.5,
      reviewCount: 50,
      lastActivityAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    });
    expect(fresh).toBeGreaterThan(stale);
    expect(fresh / stale).toBeLessThanOrEqual(1.05 + 1e-9);
  });
});

describe("displayRating / ratingBuckets", () => {
  it("formats the displayed rating", () => {
    expect(displayRating(null, 0)).toBe("—");
    expect(displayRating(4.25, 10)).toBe("4.3");
    expect(displayRating(5, 0)).toBe("—");
  });

  it("buckets star ratings 1..5", () => {
    expect(ratingBuckets([5, 5, 4, 3, 1, 4.4])).toEqual([1, 0, 1, 2, 2]);
  });
});
