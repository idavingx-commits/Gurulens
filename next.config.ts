import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg`/`pg-cloudflare` must stay external so the OpenNext bundler copies the
  // Cloudflare socket shim instead of tree-shaking it.
  serverExternalPackages: ["@prisma/client", "pg", "pg-cloudflare"],
  // Cloudflare Workers has no Sharp binary; the single `next/image` usage is a
  // static local asset, so unoptimized is the correct trade-off here.
  images: {
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
