import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cn, compactNumber, formatDate, initials, pluralize, timeAgo, truncate } from "@/lib/format";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, null, "b", undefined, "c")).toBe("a b c");
  });
});

describe("initials", () => {
  it("handles empty, single and multi-part names", () => {
    expect(initials("")).toBe("GL");
    expect(initials("Anuradha")).toBe("AN");
    expect(initials("Anuradha Perera")).toBe("AP");
    expect(initials("  kamal  jaya  silva ")).toBe("KS");
  });
});

describe("compactNumber", () => {
  it("formats thousands and millions", () => {
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(1000)).toBe("1K");
    expect(compactNumber(1540)).toBe("1.5K");
    expect(compactNumber(1_200_000)).toBe("1.2M");
    expect(compactNumber(Number.NaN)).toBe("0");
  });
});

describe("timeAgo", () => {
  const now = () => Date.now();

  it("formats recent times", () => {
    expect(timeAgo(now() - 5_000)).toBe("just now");
    expect(timeAgo(now() - 90_000)).toBe("1m ago");
    expect(timeAgo(now() - 3 * 60 * 60 * 1000)).toBe("3h ago");
    expect(timeAgo(now() - 2 * 24 * 60 * 60 * 1000)).toBe("2d ago");
    expect(timeAgo(now() - 14 * 24 * 60 * 60 * 1000)).toBe("2w ago");
    expect(timeAgo(now() - 60 * 24 * 60 * 60 * 1000)).toBe("2mo ago");
    expect(timeAgo(now() - 400 * 24 * 60 * 60 * 1000)).toBe("1y ago");
  });
});

describe("formatDate", () => {
  it("renders day, month and year", () => {
    const out = formatDate(new Date("2026-10-18T12:00:00Z"));
    expect(out).toContain("2026");
    expect(out).toContain("Oct");
  });
});

describe("truncate", () => {
  it("keeps short strings and trims long ones with an ellipsis", () => {
    expect(truncate("hello", 10)).toBe("hello");
    expect(truncate("hello world", 8)).toBe("hello w…");
  });
});

describe("pluralize", () => {
  it("chooses singular for 1 and plural otherwise", () => {
    expect(pluralize(1, "review")).toBe("review");
    expect(pluralize(0, "review")).toBe("reviews");
    expect(pluralize(2, "quiz", "quizzes")).toBe("quizzes");
  });
});
