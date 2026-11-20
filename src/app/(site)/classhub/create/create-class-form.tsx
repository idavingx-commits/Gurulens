"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { apiFetch, ClientApiError } from "@/lib/client";

type Subject = { id: string; name: string; nameSi: string | null };
type Grade = { id: string; name: string };

export function CreateClassForm({
  subjects,
  grades,
}: {
  subjects: Subject[];
  grades: Grade[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      subjectId: formData.get("subjectId") as string || undefined,
      gradeId: formData.get("gradeId") as string || undefined,
      mode: formData.get("mode") as string,
      maxStudents: formData.get("maxStudents") ? Number(formData.get("maxStudents")) : undefined,
      feeAmount: formData.get("feeAmount") ? Number(formData.get("feeAmount")) : undefined,
      location: formData.get("location") as string || undefined,
      onlineLink: formData.get("onlineLink") as string || undefined,
    };

    if (!data.name?.trim()) return setError("Please enter a class name.");

    setPending(true);
    try {
      const result = await apiFetch<{ class: { id: string } }>("/api/classes", {
        method: "POST",
        body: data,
      });
      router.push(`/classhub/class/${result.class.id}`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <InfoNote icon="alert" tone="danger">
          {error}
        </InfoNote>
      )}

      <Field label="Class name" htmlFor="name" hint="Give your class a descriptive name">
        <Input id="name" name="name" placeholder="e.g., A/L Chemistry 2024" required />
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" placeholder="Describe your class…" rows={3} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Subject" htmlFor="subjectId">
          <Select id="subjectId" name="subjectId">
            <option value="">Select subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.nameSi && ` (${s.nameSi})`}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Grade / Level" htmlFor="gradeId">
          <Select id="gradeId" name="gradeId">
            <option value="">Select grade</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Class mode" htmlFor="mode">
        <Select id="mode" name="mode" defaultValue="both">
          <option value="physical">Physical only</option>
          <option value="online">Online only</option>
          <option value="both">Physical & Online</option>
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Max students" htmlFor="maxStudents" hint="Leave empty for unlimited">
          <Input id="maxStudents" name="maxStudents" type="number" min={1} placeholder="e.g., 30" />
        </Field>

        <Field label="Monthly fee (LKR)" htmlFor="feeAmount" hint="Leave empty if free">
          <Input id="feeAmount" name="feeAmount" type="number" min={0} placeholder="e.g., 3000" />
        </Field>
      </div>

      <Field label="Location" htmlFor="location" hint="Physical location for in-person classes">
        <Input id="location" name="location" placeholder="e.g., Colombo, Sri Lanka" />
      </Field>

      <Field label="Online link" htmlFor="onlineLink" hint="Zoom, Google Meet, etc.">
        <Input id="onlineLink" name="onlineLink" type="url" placeholder="https://zoom.us/j/…" />
      </Field>

      <div className="flex gap-3 pt-3">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? (
            <>
              <Icon name="loader" size={18} className="animate-spin" />
              Creating…
            </>
          ) : (
            "Create Class"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
