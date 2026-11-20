import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // GuruLens uses custom DB-backed auth, not Neon Auth
  // auth: false (omitted)
  
  // Object Storage for media uploads (avatars, covers, videos, docs)
  buckets: {
    // Private by default; served through /api/media/[id] with auth checks
    assets: { access: "private" },
  },
  
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch (production): no overrides
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire after 7 days
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
