import type { MetadataRoute } from "next";

import { db } from "@/lib/db";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const teachers = await db.teacherProfile
    .findMany({
      where: { consentPublic: true, user: { status: "active" } },
      select: { handle: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 1000,
    })
    .catch(() => []);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/reels`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/feed`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/guidelines`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/register/teacher`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/register/student`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const teacherPages: MetadataRoute.Sitemap = teachers.map((t) => ({
    url: `${siteUrl}/teacher/${t.handle}`,
    lastModified: t.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...teacherPages];
}
