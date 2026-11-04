import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientIp, rateLimit, sameOrigin } from "@/lib/rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows up to the limit, then blocks with a retry-after", () => {
    const key = `test:${Math.random()}`;
    const first = rateLimit(key, 3, 60_000);
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(2);

    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const third = rateLimit(key, 3, 60_000);
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);

    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("lets the window slide: old hits expire", () => {
    const key = `test:${Math.random()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    expect(rateLimit(key, 2, 60_000).ok).toBe(false);

    vi.setSystemTime(Date.now() + 60_001);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const a = `test:${Math.random()}`;
    const b = `test:${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers the first x-forwarded-for entry", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    });
    expect(clientIp(req)).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip, then local", () => {
    const real = new Request("https://example.com", { headers: { "x-real-ip": "198.51.100.7" } });
    expect(clientIp(real)).toBe("198.51.100.7");
    expect(clientIp(new Request("https://example.com"))).toBe("local");
  });
});

describe("sameOrigin", () => {
  it("allows requests without an Origin header", () => {
    expect(sameOrigin(new Request("https://example.com/api", { method: "POST" }))).toBe(true);
  });

  it("matches Origin host against Host", () => {
    const okReq = new Request("https://example.com/api", {
      method: "POST",
      headers: { origin: "https://example.com", host: "example.com" },
    });
    expect(sameOrigin(okReq)).toBe(true);

    const crossReq = new Request("https://example.com/api", {
      method: "POST",
      headers: { origin: "https://evil.example", host: "example.com" },
    });
    expect(sameOrigin(crossReq)).toBe(false);
  });

  it("rejects unparsable origins", () => {
    const bad = new Request("https://example.com/api", {
      method: "POST",
      headers: { origin: "not a url" },
    });
    expect(sameOrigin(bad)).toBe(false);
  });
});
