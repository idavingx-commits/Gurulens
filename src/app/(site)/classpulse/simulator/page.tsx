import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SimulatorForm } from "./simulator-form";

export const metadata: Metadata = { title: "Card Simulator | ClassPulse" };

export default async function SimulatorPage() {
  const auth = await getAuth();

  if (!auth) redirect("/login?redirect=/classpulse/simulator");
  if (auth.user.role !== "teacher" && auth.user.role !== "admin") redirect("/classpulse");

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
      include: { student: { select: { name: true } } },
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-8 pb-12 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Card Simulator</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Simulate NFC card scans for attendance testing and demonstration.
        </p>
      </div>

      <SimulatorForm
        devices={devices}
        classes={classes}
        cards={studentCards.map((c) => ({
          id: c.id,
          cardNumber: c.cardNumber,
          studentName: c.student.name,
        }))}
      />
    </div>
  );
}
