/**
 * ClassPulse Card Simulator
 * Simulate NFC card scans for attendance
 */

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SimulatorInterface } from "./simulator-interface";

export const metadata = {
  title: "Card Simulator | ClassPulse | GuruLens",
  description: "Simulate NFC card scans for attendance tracking",
};

export default async function SimulatorPage() {
  const auth = await getAuth();

  if (!auth) {
    redirect("/login?redirect=/classpulse/simulator");
  }

  if (auth.user.role !== "teacher" && auth.user.role !== "admin") {
    redirect("/classpulse?error=teacher_only");
  }

  // Get user's organizations and devices
  const memberships = await db.organizationMember.findMany({
    where: { userId: auth.user.id, status: "active" },
    select: { organizationId: true },
  });

  const orgIds = memberships.map((m) => m.organizationId);

  const [devices, classes, studentCards] = await Promise.all([
    db.virtualDevice.findMany({
      where: { organizationId: { in: orgIds }, status: { not: "inactive" } },
      select: { id: true, name: true, deviceCode: true },
    }),
    db.class.findMany({
      where: { teacherId: auth.user.id, status: "active" },
      select: { id: true, name: true },
    }),
    db.studentCard.findMany({
      where: { isActive: true },
      include: { student: { select: { id: true, name: true } } },
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900">Card Simulator</h1>
        <p className="text-ink-500">
          Simulate NFC card scans for attendance testing and demonstration
        </p>
      </div>

      <SimulatorInterface
        devices={devices}
        classes={classes}
        studentCards={studentCards.map((card) => ({
          id: card.id,
          cardNumber: card.cardNumber,
          studentId: card.studentId,
          studentName: card.student.name,
        }))}
      />
    </div>
  );
}
