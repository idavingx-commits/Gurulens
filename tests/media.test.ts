import path from "node:path";

import { describe, expect, it } from "vitest";

import { isImageMime, isVideoMime, sniffMime, storagePath } from "@/lib/media";

function buf(...bytes: number[]): Buffer {
  const b = Buffer.alloc(Math.max(12, bytes.length));
  bytes.forEach((v, i) => (b[i] = v));
  return b;
}

describe("storagePath", () => {
  it("resolves keys under the storage root", () => {
    const full = storagePath("avatar/2026/10/abc.png");
    expect(full.startsWith(path.join(process.cwd(), "storage"))).toBe(true);
  });

  it("strips leading separators", () => {
    const full = storagePath("/avatar/x.png");
    expect(full).toBe(path.join(process.cwd(), "storage", "avatar", "x.png"));
  });

  it("blocks path traversal", () => {
    expect(() => storagePath("../../etc/passwd")).toThrow("Invalid storage key");
    expect(() => storagePath("..\\..\\windows\\system32")).toThrow("Invalid storage key");
  });
});

describe("sniffMime", () => {
  it("detects images by magic bytes", () => {
    expect(sniffMime(buf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffMime(buf(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(
      sniffMime(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")])),
    ).toBe("image/webp");
    expect(sniffMime(Buffer.from("GIF89a............"))).toBe("image/gif");
  });

  it("detects videos and PDFs", () => {
    expect(sniffMime(Buffer.from("....ftypisom...."))).toBe("video/mp4");
    expect(sniffMime(buf(0x1a, 0x45, 0xdf, 0xa3))).toBe("video/webm");
    expect(sniffMime(Buffer.from("%PDF-1.7........"))).toBe("application/pdf");
  });

  it("returns null for unknown content and short buffers", () => {
    expect(sniffMime(Buffer.from("plain text content here"))).toBeNull();
    expect(sniffMime(Buffer.from("tiny"))).toBeNull();
    expect(sniffMime(Buffer.alloc(0))).toBeNull();
  });

  it("does not trust file extensions (content is the source of truth)", () => {
    // A text buffer declared as a PNG still sniffs as null.
    expect(sniffMime(Buffer.from("not really a png file, but long enough"))).toBeNull();
  });
});

describe("mime helpers", () => {
  it("classifies images and videos", () => {
    expect(isImageMime("image/png")).toBe(true);
    expect(isImageMime("video/mp4")).toBe(false);
    expect(isVideoMime("video/webm")).toBe(true);
    expect(isVideoMime("application/pdf")).toBe(false);
  });
});
