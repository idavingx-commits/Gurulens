import { VerificationQueue, type VerificationRow } from "@/components/admin/VerificationQueue";
import { SectionHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db";

export default async function AdminVerificationPage() {
  const requests = await db.verificationRequest.findMany({
    where: { status: { in: ["pending", "in_review", "more_info"] } },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      status: true,
      evidenceNote: true,
      evidenceKey: true,
      createdAt: true,
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarKey: true,
          createdAt: true,
          teacherProfile: {
            select: {
              handle: true,
              qualifications: true,
              experienceYears: true,
              verifiedStatus: true,
            },
          },
        },
      },
    },
  });

  const rows: VerificationRow[] = requests.map((r) => ({
    id: r.id,
    status: r.status,
    evidenceNote: r.evidenceNote,
    evidenceMediaId: r.evidenceKey,
    createdAt: r.createdAt.toISOString(),
    teacherId: r.teacher.id,
    teacherName: r.teacher.name,
    teacherAvatarKey: r.teacher.avatarKey,
    teacherHandle: r.teacher.teacherProfile?.handle ?? null,
    teacherEmail: r.teacher.email,
    qualifications: r.teacher.teacherProfile?.qualifications ?? null,
    experienceYears: r.teacher.teacherProfile?.experienceYears ?? null,
    memberSince: r.teacher.createdAt.toISOString(),
  }));

  return (
    <div>
      <SectionHeader
        title="Verification queue"
        subtitle={`${rows.length} open request${rows.length === 1 ? "" : "s"} · oldest first`}
      />
      <VerificationQueue rows={rows} />
    </div>
  );
}
