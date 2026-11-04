import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  otpauthUrl,
  totpCode,
  verifyTotp,
} from "@/lib/totp";

// RFC 6238 test secret: ASCII "12345678901234567890".
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("base32", () => {
  it("round-trips arbitrary buffers", () => {
    const buf = Buffer.from("GuruLens!");
    expect(base32Decode(base32Encode(buf)).toString()).toBe("GuruLens!");
  });

  it("tolerates spacing, padding and lowercase", () => {
    const encoded = base32Encode(Buffer.from("hello world"));
    expect(base32Decode(` ${encoded.toLowerCase()} `).toString()).toBe("hello world");
    expect(base32Decode(`${encoded}====`).toString()).toBe("hello world");
  });

  it("rejects invalid characters", () => {
    expect(() => base32Decode("ABC$")).toThrow("Invalid base32");
  });
});

describe("totpCode (RFC 6238 SHA-1 vectors, 6-digit truncation)", () => {
  it("matches the reference vectors", () => {
    expect(totpCode(RFC_SECRET, 59_000)).toBe("287082");
    expect(totpCode(RFC_SECRET, 1_111_111_109_000)).toBe("081804");
  });

  it("is stable within a 30-second step and changes across steps", () => {
    const a = totpCode(RFC_SECRET, 60_000);
    const b = totpCode(RFC_SECRET, 89_999);
    const c = totpCode(RFC_SECRET, 90_000);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("verifyTotp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(59_000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts the current code", () => {
    expect(verifyTotp(RFC_SECRET, "287082")).toBe(true);
  });

  it("accepts adjacent steps within the window and rejects far-away codes", () => {
    // At t=59s the counter is 1; t=60s (counter 2) is one step ahead and inside the window.
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, 60_000))).toBe(true);
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, 210_000))).toBe(false);
  });

  it("rejects malformed codes", () => {
    expect(verifyTotp(RFC_SECRET, "abc123")).toBe(false);
    expect(verifyTotp(RFC_SECRET, "12345")).toBe(false);
    expect(verifyTotp(RFC_SECRET, "")).toBe(false);
  });
});

describe("generateTotpSecret / otpauthUrl", () => {
  it("generates a valid 32-char base32 secret by default", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(secret).not.toBe(generateTotpSecret());
  });

  it("builds a well-formed otpauth URL", () => {
    const url = otpauthUrl(RFC_SECRET, "admin@gurulens.lk");
    expect(url.startsWith("otpauth://totp/GuruLens%3Aadmin%40gurulens.lk?")).toBe(true);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("secret")).toBe(RFC_SECRET);
    expect(params.get("digits")).toBe("6");
    expect(params.get("period")).toBe("30");
  });
});
