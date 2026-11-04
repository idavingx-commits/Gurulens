import type { Metadata } from "next";

import { TeacherForm } from "@/components/auth/TeacherForm";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Teacher sign up" };

export default async function TeacherRegisterPage() {
  const [subjects, districts, grades, languages] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.district.findMany({ orderBy: { name: "asc" } }),
    db.grade.findMany({ orderBy: { order: "asc" } }),
    db.language.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <TeacherForm
      taxonomy={{
        subjects: subjects.map((s) => ({ slug: s.slug, name: s.name })),
        districts: districts.map((d) => ({ slug: d.slug, name: d.name })),
        grades: grades.map((g) => ({ slug: g.slug, name: g.name })),
        languages: languages.map((l) => ({ slug: l.slug, name: l.name })),
      }}
    />
  );
}
