import type { Metadata } from "next";

import { StudentForm } from "@/components/auth/StudentForm";

export const metadata: Metadata = { title: "Student sign up" };

export default function StudentRegisterPage() {
  return <StudentForm />;
}
