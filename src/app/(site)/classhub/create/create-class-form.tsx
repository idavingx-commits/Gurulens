"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { apiFetch, ClientApiError, uploadMedia } from "@/lib/client";

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
  const coverRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  async function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setCoverError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setCoverError("Class thumbnails must be 8 MB or smaller.");
      return;
    }

    setCoverUploading(true);
    setCoverError(null);
    try {
      const media = await uploadMedia(file, "class_cover");
      setCoverKey(media.id);
      setCoverPreview(media.url);
    } catch (err) {
      setCoverError(err instanceof ClientApiError ? err.message : "Upload failed.");
    } finally {
      setCoverUploading(false);
      if (coverRef.current) coverRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || coverUploading) return;
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
      coverKey: coverKey ?? undefined,
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

      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-ink-700">Class thumbnail</p>
        <div className="relative h-40 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700 sm:h-48">
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPreview}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/85">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                <Icon name="school" size={22} />
              </span>
              <span className="text-[12px] font-bold">Give your class a face</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/50 via-transparent to-transparent" />
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
            <span className="text-[11.5px] font-bold text-white/90">
              {coverPreview ? "Thumbnail preview" : "Students see this on /classes"}
            </span>
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={coverUploading}
              className="inline-flex flex-none items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11.5px] font-bold text-ink-900 shadow-sm transition-colors hover:bg-white disabled:opacity-70"
            >
              {coverUploading ? (
                <Icon name="loader" size={13} className="animate-spin" />
              ) : (
                <Icon name="camera" size={13} />
              )}
              {coverUploading ? "Uploading…" : coverPreview ? "Change photo" : "Add photo"}
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[11.5px] text-ink-400">
          Optional · JPG, PNG or WebP up to 8 MB. Wide images (16:9) look best.
        </p>
        {coverError ? (
          <p className="mt-1 text-[11.5px] font-semibold text-danger-600">{coverError}</p>
        ) : null}
        <input
          ref={coverRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={pickCover}
        />
      </div>

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
        <Button type="submit" disabled={pending || coverUploading} className="flex-1">
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
