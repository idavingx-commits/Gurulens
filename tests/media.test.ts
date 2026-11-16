import { describe, expect, it } from "vitest";

import {
  buildStorageKey,
  extensionForMime,
  isImageMime,
  isVideoMime,
  sniffMime,
} from "@/lib/media";

function buf(...bytes: number[]): Buffer {
  const b = Buffer.alloc(Math.max(12, bytes.length));
  bytes.forEach((v, i) => (b[i] = v));
  return b;
}

describe("storage keys", () => {
  it("maps mime types to file extensions", () => {
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("video/mp4")).toBe("mp4");
    expect(extensionForMime("application/pdf")).toBe("pdf");
    expect(extensionForMime("application/x-unknown")).toBe("bin");
  });

  it("builds kind/year/month keys with random names", () => {
    const key = buildStorageKey("avatar", "image/png");
    expect(key).toMatch(/^avatar\/\d{4}\/\d{2}\/[a-f0-9]{20}\.png$/);
    expect(buildStorageKey("avatar", "image/png")).not.toBe(key);
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
