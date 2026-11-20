"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icons";

interface Subject {
  id: string;
  name: string;
  nameSi: string | null;
}

interface Grade {
  id: string;
  name: string;
  nameSi: string | null;
}

export function CreateClassForm({
  subjects,
  grades,
}: {
  subjects: Subject[];
  grades: Grade[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      subjectId: formData.get("subjectId") as string || undefined,
      gradeId: formData.get("gradeId") as string || undefined,
      mode: formData.get("mode") as string,
      maxStudents: formData.get("maxStudents") ? parseInt(formData.get("maxStudents") as string) : undefined,
      feeAmount: formData.get("feeAmount") ? parseInt(formData.get("feeAmount") as string) : undefined,
      location: formData.get("location") as string || undefined,
      onlineLink: formData.get("onlineLink") as string || undefined,
    };

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to create class");
      }

      router.push(`/classhub/class/${result.class.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink-700">
          Class Name *
        </label>
        <Input
          id="name"
          name="name"
          required
          placeholder="e.g., A/L Chemistry 2024"
        />
        <p className="mt-1 text-xs text-ink-500">Give your class a descriptive name</p>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-ink-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded-lg border border-ink-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Describe your class..."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="subjectId" className="mb-1 block text-sm font-medium text-ink-700">
            Subject
          </label>
          <select
            id="subjectId"
            name="subjectId"
            className="w-full rounded-lg border border-ink-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Select subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
                {subject.nameSi && ` (${subject.nameSi})`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="gradeId" className="mb-1 block text-sm font-medium text-ink-700">
            Grade/Level
          </label>
          <select
            id="gradeId"
            name="gradeId"
            className="w-full rounded-lg border border-ink-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Select grade</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="mode" className="mb-1 block text-sm font-medium text-ink-700">
          Class Mode *
        </label>
        <select
          id="mode"
          name="mode"
          required
          defaultValue="both"
          className="w-full rounded-lg border border-ink-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="physical">Physical Only</option>
          <option value="online">Online Only</option>
          <option value="both">Physical & Online</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="maxStudents" className="mb-1 block text-sm font-medium text-ink-700">
            Maximum Students
          </label>
          <Input
            id="maxStudents"
            name="maxStudents"
            type="number"
            min={1}
            placeholder="e.g., 30"
          />
          <p className="mt-1 text-xs text-ink-500">Leave empty for unlimited</p>
        </div>

        <div>
          <label htmlFor="feeAmount" className="mb-1 block text-sm font-medium text-ink-700">
            Monthly Fee (LKR)
          </label>
          <Input
            id="feeAmount"
            name="feeAmount"
            type="number"
            min={0}
            placeholder="e.g., 3000"
          />
          <p className="mt-1 text-xs text-ink-500">Leave empty if free</p>
        </div>
      </div>

      <div>
        <label htmlFor="location" className="mb-1 block text-sm font-medium text-ink-700">
          Location
        </label>
        <Input
          id="location"
          name="location"
          placeholder="e.g., Colombo, Sri Lanka"
        />
        <p className="mt-1 text-xs text-ink-500">Physical location for in-person classes</p>
      </div>

      <div>
        <label htmlFor="onlineLink" className="mb-1 block text-sm font-medium text-ink-700">
          Online Meeting Link
        </label>
        <Input
          id="onlineLink"
          name="onlineLink"
          type="url"
          placeholder="https://zoom.us/j/..."
        />
        <p className="mt-1 text-xs text-ink-500">Zoom, Google Meet, or other video call link</p>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting && <Icon name="loader" size={16} className="animate-spin" />}
          Create Class
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
