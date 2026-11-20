import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateClassForm } from "./create-class-form";

export const metadata: Metadata = { title: "Create Class" };

export default async function CreateClassPage() {
  const auth = await getAuth();

  if (!auth) redirect("/login?redirect=/classhub/create");
  if (auth.user.role !== "teacher" && auth.user.role !== "admin") redirect("/classhub");

  const [subjects, grades] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.grade.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-8 pb-12 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Create Class</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Set up a new class to manage students, attendance, and assignments.
        </p>
      </div>

      <CreateClassForm
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, nameSi: s.nameSi }))}
        grades={grades.map((g) => ({ id: g.id, name: g.name }))}
      />
    </div>
  );
}
