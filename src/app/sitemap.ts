import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { SITE_URL as siteUrl } from "@/lib/site";

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
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/guidelines`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const teacherPages: MetadataRoute.Sitemap = teachers.map((t) => ({
    url: `${siteUrl}/teacher/${t.handle}`,
    lastModified: t.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...teacherPages];
}
