"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icons";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { apiFetch } from "@/lib/client";

export type SchoolSignup = {
  organizationId: string;
  admissionNo?: string;
  indexNo?: string;
  staffId?: string;
  schoolClassId?: string;
};

type SchoolOption = {
  id: string;
  name: string;
  slug: string;
  schoolClasses: Array<{ id: string; name: string }>;
};

/**
 * Optional school membership at signup. Students provide admission/index
 * numbers and pick their class; teachers provide a staff ID. The school
 * approves the registration before school-only content unlocks.
 */
export function SchoolSignupFields({
  role,
  onChange,
}: {
  role: "student" | "teacher";
  onChange: (value: SchoolSignup | null) => void;
}) {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [indexNo, setIndexNo] = useState("");
  const [staffId, setStaffId] = useState("");
  const [classId, setClassId] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ schools: SchoolOption[] }>("/api/organizations/schools")
      .then((data) => {
        if (!cancelled) setSchools(data.schools);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  function emit(next: {
    enabled?: boolean;
    orgId?: string;
    admissionNo?: string;
    indexNo?: string;
    staffId?: string;
    classId?: string;
  }) {
    const state = {
      enabled: next.enabled ?? enabled,
      orgId: next.orgId ?? orgId,
      admissionNo: next.admissionNo ?? admissionNo,
      indexNo: next.indexNo ?? indexNo,
      staffId: next.staffId ?? staffId,
      classId: next.classId ?? classId,
    };
    if (!state.enabled || !state.orgId) {
      onChange(null);
      return;
    }
    onChange({
      organizationId: state.orgId,
      admissionNo: role === "student" ? state.admissionNo.trim() || undefined : undefined,
      indexNo: role === "student" ? state.indexNo.trim() || undefined : undefined,
      staffId: role === "teacher" ? state.staffId.trim() || undefined : undefined,
      schoolClassId: role === "student" ? state.classId || undefined : undefined,
    });
  }

  const selected = schools.find((s) => s.id === orgId);

  return (
    <div className="rounded-2xl border border-ink-200 bg-ink-50/50 p-4">
      <Checkbox
        checked={enabled}
        onChange={(e) => {
          setEnabled(e.target.checked);
          emit({ enabled: e.target.checked });
        }}
        label={
          <span className="flex items-center gap-1.5 font-semibold">
            <Icon name="school" size={14} className="text-brand-600" />
            I&apos;m joining a school on GuruLens
            <span className="text-[11px] font-medium text-ink-400">(optional)</span>
          </span>
        }
      />

      {enabled ? (
        <div className="mt-3 space-y-3">
          {schools.length === 0 ? (
            <p className="text-[12px] text-ink-400">
              No schools are registered yet. You can join one later from its campus page.
            </p>
          ) : (
            <>
              <Field label="School" htmlFor="signup-school">
                <Select
                  id="signup-school"
                  value={orgId}
                  onChange={(e) => {
                    setOrgId(e.target.value);
                    setClassId("");
                    emit({ orgId: e.target.value, classId: "" });
                  }}
                >
                  <option value="">Choose your school…</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {orgId ? (
                role === "student" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Admission number" htmlFor="signup-admission">
                        <Input
                          id="signup-admission"
                          value={admissionNo}
                          onChange={(e) => {
                            setAdmissionNo(e.target.value);
                            emit({ admissionNo: e.target.value });
                          }}
                          placeholder="e.g. 2024/10A/042"
                          maxLength={40}
                        />
                      </Field>
                      <Field label="Index number (optional)" htmlFor="signup-index">
                        <Input
                          id="signup-index"
                          value={indexNo}
                          onChange={(e) => {
                            setIndexNo(e.target.value);
                            emit({ indexNo: e.target.value });
                          }}
                          placeholder="Exam index"
                          maxLength={40}
                        />
                      </Field>
                    </div>
                    {selected && selected.schoolClasses.length > 0 ? (
                      <Field label="Your class" htmlFor="signup-class">
                        <Select
                          id="signup-class"
                          value={classId}
                          onChange={(e) => {
                            setClassId(e.target.value);
                            emit({ classId: e.target.value });
                          }}
                        >
                          <option value="">Not sure yet</option>
                          {selected.schoolClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : null}
                    <p className="text-[11px] leading-relaxed text-ink-400">
                      The school office approves your registration, then you can see your class
                      timetable.
                    </p>
                  </>
                ) : (
                  <>
                    <Field label="Staff ID" htmlFor="signup-staff">
                      <Input
                        id="signup-staff"
                        value={staffId}
                        onChange={(e) => {
                          setStaffId(e.target.value);
                          emit({ staffId: e.target.value });
                        }}
                        placeholder="e.g. TCH-2019-018"
                        maxLength={40}
                      />
                    </Field>
                    <p className="text-[11px] leading-relaxed text-ink-400">
                      Your school-issued staff registration number. The school approves it before
                      you get staff access.
                    </p>
                  </>
                )
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
