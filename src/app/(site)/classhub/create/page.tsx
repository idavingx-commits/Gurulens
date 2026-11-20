/**
 * Create Class Page
 */

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateClassForm } from "./create-class-form";

export const metadata = {
  title: "Create Class | ClassHub | GuruLens",
  description: "Create a new class to manage your students",
};

export default async function CreateClassPage() {
  const auth = await getAuth();

  if (!auth) {
    redirect("/login?redirect=/classhub/create");
  }

  if (auth.user.role !== "teacher" && auth.user.role !== "admin") {
    redirect("/classhub?error=teacher_only");
  }

  // Get subjects and grades for the form
  const [subjects, grades] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.grade.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900">Create Class</h1>
        <p className="text-ink-500">
          Set up a new class to manage your students, attendance, and assignments.
        </p>
      </div>

      <CreateClassForm
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, nameSi: s.nameSi }))}
        grades={grades.map((g) => ({ id: g.id, name: g.name, nameSi: null }))}
      />
    </div>
  );
}
