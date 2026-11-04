import { type NextRequest } from "next/server";

import { ok, route } from "@/lib/api";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const GET = route(async (req: NextRequest) => {
  const limit = rateLimit(`search:${clientIp(req)}`, 90, 60 * 1000);
  if (!limit.ok) return ok({ results: [] });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return ok({ results: [] });

  const [teachers, subjects] = await Promise.all([
    db.teacherProfile.findMany({
      where: {
        OR: [
          { handle: { contains: q.toLowerCase(), mode: "insensitive" } },
          { user: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        user: { select: { name: true, avatarKey: true, status: true } },
        subjects: { include: { subject: true } },
        districts: { include: { district: true } },
      },
      take: 6,
    }),
    db.subject.findMany({
      where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { nameSi: { contains: q, mode: "insensitive" } }] },
      take: 3,
    }),
  ]);

  const results = [
    ...teachers
      .filter((t) => t.user.status === "active")
      .map((t) => ({
        kind: "teacher" as const,
        label: t.user.name,
        sub: [
          t.subjects.map((s) => s.subject.name).slice(0, 2).join(", "),
          t.districts.map((d) => d.district.name).slice(0, 1).join(", "),
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/teacher/${t.handle}`,
        avatarKey: t.user.avatarKey,
      })),
    ...subjects.map((s) => ({
      kind: "subject" as const,
      label: s.name,
      sub: "Subject",
      href: `/explore?subject=${s.slug}`,
    })),
  ];

  return ok({ results });
});
