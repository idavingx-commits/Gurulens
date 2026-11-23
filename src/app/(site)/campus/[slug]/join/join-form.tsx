"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

export function JoinSchoolForm({
  organizationId,
  schoolName,
  accountRole,
  fullName,
  classes,
}: {
  organizationId: string;
  schoolName: string;
  accountRole: string;
  fullName: string;
  classes: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const isStudent = accountRole === "student";

  const [admissionNo, setAdmissionNo] = useState("");
  const [indexNo, setIndexNo] = useState("");
  const [staffId, setStaffId] = useState("");
  const [classId, setClassId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);

    if (isStudent && !admissionNo.trim()) {
      setError("Enter your admission number — the school office can give it to you.");
      return;
    }
    if (!isStudent && !staffId.trim()) {
      setError("Enter your staff ID.");
      return;
    }

    setPending(true);
    try {
      await apiFetch(`/api/organizations/${organizationId}/join`, {
        method: "POST",
        body: {
          role: isStudent ? "student" : "teacher",
          admissionNo: isStudent ? admissionNo.trim() : undefined,
          indexNo: isStudent ? indexNo.trim() || undefined : undefined,
          staffId: !isStudent ? staffId.trim() : undefined,
          schoolClassId: classId || undefined,
        },
      });
      setDone(true);
      toast.success("Registration sent to the school.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not send your registration.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-5 rounded-2xl border border-success-500/30 bg-success-100/60 p-4 text-[13px] text-success-600">
        <p className="flex items-center gap-2 font-bold">
          <Icon name="check-circle" size={16} /> Registration sent
        </p>
        <p className="mt-1 leading-relaxed">
          {schoolName} will review your details and approve your account. You&apos;ll be notified
          once you have access to timetables and school content.
        </p>
        <Link
          href="/campus"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success-500 px-3.5 py-1.5 text-[12px] font-bold text-white"
        >
          <Icon name="grid" size={13} /> Browse campus
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      {error ? (
        <InfoNote icon="alert" tone="danger">
          {error}
        </InfoNote>
      ) : null}

      <Field label="Full name" hint="From your GuruLens account.">
        <Input value={fullName} disabled />
      </Field>

      {isStudent ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Admission number" htmlFor="join-admission" hint="Unique to you at this school.">
              <Input
                id="join-admission"
                value={admissionNo}
                onChange={(e) => setAdmissionNo(e.target.value)}
                placeholder="e.g. 2024/10A/042"
                maxLength={40}
                required
              />
            </Field>
            <Field label="Index number (optional)" htmlFor="join-index" hint="Exam index number, if you have one.">
              <Input
                id="join-index"
                value={indexNo}
                onChange={(e) => setIndexNo(e.target.value)}
                placeholder="e.g. 2027-OL-12345"
                maxLength={40}
              />
            </Field>
          </div>
          {classes.length > 0 ? (
            <Field label="Your class" htmlFor="join-class" hint="Pick the grade/section you belong to.">
              <Select id="join-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Not sure yet</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </>
      ) : (
        <Field label="Staff ID" htmlFor="join-staff" hint="Your teacher/staff registration number at this school.">
          <Input
            id="join-staff"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            placeholder="e.g. TCH-2019-018"
            maxLength={40}
            required
          />
        </Field>
      )}

      <Button type="submit" disabled={pending} className="w-full justify-center">
        {pending ? (
          <>
            <Icon name="loader" size={15} className="animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Icon name="send" size={15} /> Register with {schoolName}
          </>
        )}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-ink-400">
        Your identifiers are only visible to this school&apos;s administrators.
      </p>
    </form>
  );
}
