import { describe, expect, it } from "vitest";

import {
  adminBadgeActionSchema,
  claimCodeSchema,
  commentSchema,
  emailSchema,
  enrollmentCodeSchema,
  handleSchema,
  isAgeEligible,
  passwordSchema,
  postSchema,
  quizAttemptSchema,
  quizSchema,
  reportSchema,
  reviewSchema,
} from "@/lib/validation";

describe("emailSchema", () => {
  it("trims and lowercases valid addresses", () => {
    expect(emailSchema.parse("  Admin@GuruLens.LK ")).toBe("admin@gurulens.lk");
  });

  it("rejects invalid addresses", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("requires 8+ chars with a letter and a number", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("onlyletters").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("Demo#2026").success).toBe(true);
  });
});

describe("handleSchema", () => {
  it("normalizes to lowercase and validates the pattern", () => {
    expect(handleSchema.parse("  Anuradha-Perera ")).toBe("anuradha-perera");
    expect(handleSchema.safeParse("ab").success).toBe(false);
    expect(handleSchema.safeParse("-bad-start").success).toBe(false);
    expect(handleSchema.safeParse("has space").success).toBe(false);
  });
});

describe("isAgeEligible", () => {
  it("allows 13+ and blocks children", () => {
    const thirteen = new Date();
    thirteen.setFullYear(thirteen.getFullYear() - 13);
    thirteen.setDate(thirteen.getDate() - 1);
    expect(isAgeEligible(thirteen)).toBe(true);

    const twelve = new Date();
    twelve.setFullYear(twelve.getFullYear() - 12);
    expect(isAgeEligible(twelve)).toBe(false);
  });
});

describe("postSchema", () => {
  it("applies defaults for media and visibility", () => {
    const parsed = postSchema.parse({ type: "post", text: "Hello class" });
    expect(parsed.mediaIds).toEqual([]);
    expect(parsed.visibility).toBe("public");
  });

  it("rejects an empty body and unknown types", () => {
    expect(postSchema.safeParse({ type: "post", text: "   " }).success).toBe(false);
    expect(postSchema.safeParse({ type: "story", text: "hi" }).success).toBe(false);
  });
});

describe("commentSchema / reviewSchema", () => {
  it("bounds comment length", () => {
    expect(commentSchema.parse({ text: "  nice  " }).text).toBe("nice");
    expect(commentSchema.safeParse({ text: "" }).success).toBe(false);
    expect(commentSchema.safeParse({ text: "x".repeat(1001) }).success).toBe(false);
  });

  it("requires a feedback of at least 10 characters and 1-5 stars", () => {
    const base = { teacherId: "t1", stars: 5, feedback: "Great teacher overall" };
    expect(reviewSchema.safeParse(base).success).toBe(true);
    expect(reviewSchema.safeParse({ ...base, stars: 6 }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, feedback: "too short" }).success).toBe(false);
  });
});

describe("reportSchema", () => {
  it("accepts known reasons and rejects unknown ones", () => {
    expect(
      reportSchema.safeParse({ targetType: "post", targetId: "p1", reason: "spam" }).success,
    ).toBe(true);
    expect(
      reportSchema.safeParse({ targetType: "post", targetId: "p1", reason: "because" }).success,
    ).toBe(false);
  });
});

describe("claimCodeSchema / enrollmentCodeSchema", () => {
  it("trims codes and bounds their length", () => {
    expect(claimCodeSchema.parse({ code: "  GL-ANURAD-1000 " }).code).toBe("GL-ANURAD-1000");
    expect(claimCodeSchema.safeParse({ code: "ab" }).success).toBe(false);
  });

  it("defaults maxUses to 1", () => {
    expect(enrollmentCodeSchema.parse({}).maxUses).toBe(1);
    expect(enrollmentCodeSchema.safeParse({ maxUses: 501 }).success).toBe(false);
  });
});

describe("quizSchema / quizAttemptSchema", () => {
  const validQuestion = { text: "2+2?", options: ["3", "4"], correctIndex: 1 };

  it("accepts a valid quiz and defaults published to false", () => {
    const parsed = quizSchema.parse({ title: "Maths basics", questions: [validQuestion] });
    expect(parsed.published).toBe(false);
  });

  it("rejects a correctIndex outside the options", () => {
    expect(
      quizSchema.safeParse({
        title: "Bad quiz",
        questions: [{ text: "q", options: ["a", "b"], correctIndex: 2 }],
      }).success,
    ).toBe(false);
  });

  it("allows -1 (skipped) answers in attempts", () => {
    expect(quizAttemptSchema.parse({ answers: [-1, 0, 1] }).answers).toEqual([-1, 0, 1]);
    expect(quizAttemptSchema.safeParse({ answers: [-2] }).success).toBe(false);
  });
});

describe("adminBadgeActionSchema", () => {
  it("requires a userId or userEmail", () => {
    const base = { badgeKey: "verified-teacher", action: "grant" };
    expect(adminBadgeActionSchema.safeParse(base).success).toBe(false);
    expect(adminBadgeActionSchema.safeParse({ ...base, userId: "u1" }).success).toBe(true);
    expect(adminBadgeActionSchema.safeParse({ ...base, userEmail: "x@y.lk" }).success).toBe(true);
  });
});
