import { ReportsQueue, type ReportRow } from "@/components/admin/ReportsQueue";
import { SectionHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db";

function snippet(text: string | null | undefined, max = 220): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export default async function AdminReportsPage() {
  const reports = await db.report.findMany({
    where: { status: { in: ["open", "in_review"] } },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      details: true,
      createdAt: true,
      reporter: { select: { name: true } },
    },
  });

  const idsByType = new Map<string, string[]>();
  for (const r of reports) {
    const list = idsByType.get(r.targetType) ?? [];
    list.push(r.targetId);
    idsByType.set(r.targetType, list);
  }

  const previews = new Map<string, { snippet: string | null; meta: string | null }>();

  const [posts, comments, reviews, quizzes, media, users] = await Promise.all([
    idsByType.has("post")
      ? db.post.findMany({
          where: { id: { in: idsByType.get("post")! } },
          select: { id: true, text: true, title: true, author: { select: { name: true } } },
        })
      : Promise.resolve([]),
    idsByType.has("comment")
      ? db.comment.findMany({
          where: { id: { in: idsByType.get("comment")! } },
          select: {
            id: true,
            text: true,
            author: { select: { name: true } },
            post: { select: { id: true, title: true } },
          },
        })
      : Promise.resolve([]),
    idsByType.has("review")
      ? db.review.findMany({
          where: { id: { in: idsByType.get("review")! } },
          select: {
            id: true,
            feedback: true,
            stars: true,
            author: { select: { name: true } },
            teacher: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    idsByType.has("quiz")
      ? db.quiz.findMany({
          where: { id: { in: idsByType.get("quiz")! } },
          select: { id: true, title: true, teacherId: true },
        })
      : Promise.resolve([]),
    idsByType.has("media")
      ? db.media.findMany({
          where: { id: { in: idsByType.get("media")! } },
          select: { id: true, kind: true, mimeType: true, ownerId: true },
        })
      : Promise.resolve([]),
    idsByType.has("user")
      ? db.user.findMany({
          where: { id: { in: idsByType.get("user")! } },
          select: { id: true, name: true, role: true, status: true },
        })
      : Promise.resolve([]),
  ]);

  for (const p of posts) {
    previews.set(p.id, {
      snippet: snippet(p.text) ?? snippet(p.title),
      meta: `Post by ${p.author.name}`,
    });
  }
  for (const c of comments) {
    previews.set(c.id, {
      snippet: snippet(c.text),
      meta: `Comment by ${c.author.name}${c.post?.title ? ` on “${c.post.title}”` : ""}`,
    });
  }
  for (const rv of reviews) {
    previews.set(rv.id, {
      snippet: snippet(rv.feedback),
      meta: `Review by ${rv.author.name} for ${rv.teacher.name} · ${rv.stars}★`,
    });
  }
  for (const q of quizzes) {
    previews.set(q.id, { snippet: q.title, meta: "Quiz" });
  }
  for (const m of media) {
    previews.set(m.id, { snippet: `${m.kind} · ${m.mimeType}`, meta: "Uploaded file" });
  }
  for (const u of users) {
    previews.set(u.id, { snippet: `${u.name} · ${u.role}`, meta: `Account status: ${u.status}` });
  }

  const rows: ReportRow[] = reports.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    details: r.details,
    createdAt: r.createdAt.toISOString(),
    reporterName: r.reporter.name,
    targetSnippet: previews.get(r.targetId)?.snippet ?? null,
    targetMeta: previews.get(r.targetId)?.meta ?? null,
  }));

  return (
    <div>
      <SectionHeader
        title="Reports queue"
        subtitle={`${rows.length} open report${rows.length === 1 ? "" : "s"} · oldest first`}
      />
      <ReportsQueue rows={rows} />
    </div>
  );
}
