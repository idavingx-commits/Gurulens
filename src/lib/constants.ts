export const APP_NAME = "GuruLens";
export const APP_TAGLINE = "Find the Right Teacher for You.";
export const COMPANY_NAME = "IneshDev (Pvt) Ltd";

export const SESSION_COOKIE = "gl_session";
export const CSRF_HEADER = "x-csrf-token";
export const SESSION_TTL_DAYS = 30;

export const ROLES = ["student", "teacher", "moderator", "admin"] as const;
export type Role = (typeof ROLES)[number];
export const ADMIN_ROLES: readonly Role[] = ["moderator", "admin"];
export const SUPER_ADMIN_ROLES: readonly Role[] = ["admin"];

export const USER_STATUSES = ["active", "suspended", "pending_deletion"] as const;

export const MODERATION_STATUSES = ["pending", "approved", "rejected", "removed"] as const;

export const VERIFICATION_STATUSES = [
  "none",
  "pending",
  "in_review",
  "more_info",
  "verified",
  "rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const BADGE_KEYS = {
  verified: "verified-teacher",
  highlyRated: "highly-rated",
  activeEducator: "active-educator",
  communityContributor: "community-contributor",
} as const;

export const POST_TYPES = ["post", "announcement", "lesson", "reel", "video"] as const;
export type PostType = (typeof POST_TYPES)[number];

export const TEACHING_MODES = ["physical", "online", "both"] as const;

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "impersonation",
  "copyright",
  "misinformation",
  "inappropriate",
  "other",
] as const;

export const UPLOAD_LIMITS: Record<string, number> = {
  avatar: 5 * 1024 * 1024,
  cover: 8 * 1024 * 1024,
  post_image: 10 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  doc: 10 * 1024 * 1024,
};

export const UPLOAD_MIME: Record<string, string[]> = {
  avatar: ["image/png", "image/jpeg", "image/webp"],
  cover: ["image/png", "image/jpeg", "image/webp"],
  post_image: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm"],
  doc: ["application/pdf", "image/png", "image/jpeg"],
};

export const MIN_REVIEWS_FOR_RATING = 1;
export const RANKING_PRIOR_MEAN = 3.8;
export const RANKING_PRIOR_WEIGHT = 5;
