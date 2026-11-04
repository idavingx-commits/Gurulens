import type { MetadataRoute } from "next";

import { SITE_URL as siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/studio",
          "/dashboard",
          "/settings",
          "/notifications",
          "/feed",
          "/saved",
          "/api/",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
