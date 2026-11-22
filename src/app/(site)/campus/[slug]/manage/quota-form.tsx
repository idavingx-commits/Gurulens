"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input } from "@/components/ui/input";
import { InfoNote, SectionHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

type Quotas = { teacherQuota: number; channelQuota: number; classQuota: number };
type Usage = { teachers: number; channels: number; classes: number; students: number };

function Meter({
  label,
  used,
  limit,
  icon,
}: {
  label: string;
  used: number;
  limit: number;
  icon: string;
}) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const tone = used > limit ? "bg-danger-500" : pct >= 90 ? "bg-warn-500" : "bg-brand-500";
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <Icon name={icon} size={13} className="text-ink-400" /> {label}
        </span>
        <span className={used > limit ? "text-danger-600" : "text-ink-500"}>
          {used} / {limit}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(3, pct)}%` }} />
      </div>
    </div>
  );
}

export function QuotaForm({
  organizationId,
  initial,
  defaults,
  usage,
  canEdit,
}: {
  organizationId: string;
  initial: Quotas;
  defaults: Quotas;
  usage: Usage;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState({
    teacherQuota: String(initial.teacherQuota),
    channelQuota: String(initial.channelQuota),
    classQuota: String(initial.classQuota),
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = {
    teacherQuota: Number(values.teacherQuota),
    channelQuota: Number(values.channelQuota),
    classQuota: Number(values.classQuota),
  };
  const valid = Object.values(parsed).every((value) => Number.isInteger(value) && value >= 1);
  const dirty =
    parsed.teacherQuota !== initial.teacherQuota ||
    parsed.channelQuota !== initial.channelQuota ||
    parsed.classQuota !== initial.classQuota;

  async function save() {
    if (pending) return;
    if (!valid) {
      setError("Every limit must be a whole number of at least 1.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/organizations/${organizationId}/quotas`, {
        method: "PATCH",
        body: parsed,
      });
      toast.success("Campus limits updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not update the limits.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card p-5">
      <SectionHeader
        title="Capacity"
        subtitle="Plan limits for seats, channels and classes. Usage updates live."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Meter
          label="Teacher seats"
          used={usage.teachers}
          limit={initial.teacherQuota}
          icon="users"
        />
        <Meter label="Channels" used={usage.channels} limit={initial.channelQuota} icon="radio" />
        <Meter label="Classes" used={usage.classes} limit={initial.classQuota} icon="book-open" />
      </div>

      <p className="mt-4 text-[11.5px] text-ink-400">
        {usage.students} active student enrolment{usage.students === 1 ? "" : "s"} across this
        campus. Seats count active teachers and staff.
      </p>

      {canEdit ? (
        <>
          {error ? (
            <InfoNote icon="alert" tone="danger" className="mt-4">
              {error}
            </InfoNote>
          ) : null}

          <div className="mt-5 rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
            <p className="mb-3 text-[12.5px] font-bold text-ink-700">Adjust plan limits</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Teacher seats" htmlFor="teacher-quota" hint={`Used ${usage.teachers}`}>
                <Input
                  id="teacher-quota"
                  type="number"
                  min={1}
                  max={1000}
                  value={values.teacherQuota}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, teacherQuota: event.target.value }))
                  }
                />
              </Field>
              <Field label="Channels" htmlFor="channel-quota" hint={`Used ${usage.channels}`}>
                <Input
                  id="channel-quota"
                  type="number"
                  min={1}
                  max={5000}
                  value={values.channelQuota}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, channelQuota: event.target.value }))
                  }
                />
              </Field>
              <Field label="Classes" htmlFor="class-quota" hint={`Used ${usage.classes}`}>
                <Input
                  id="class-quota"
                  type="number"
                  min={1}
                  max={10000}
                  value={values.classQuota}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, classQuota: event.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setValues({
                    teacherQuota: String(defaults.teacherQuota),
                    channelQuota: String(defaults.channelQuota),
                    classQuota: String(defaults.classQuota),
                  })
                }
                className="text-[11.5px] font-bold text-ink-400 transition-colors hover:text-ink-700"
              >
                Reset to {defaults.teacherQuota} teacher seats · {defaults.channelQuota} channels ·{" "}
                {defaults.classQuota} classes
              </button>
              <Button type="button" size="sm" disabled={pending || !dirty} onClick={() => void save()}>
                {pending ? (
                  <Icon name="loader" size={14} className="animate-spin" />
                ) : (
                  <Icon name="check" size={14} />
                )}
                Save limits
              </Button>
            </div>
          </div>
        </>
      ) : (
        <InfoNote icon="info" className="mt-4">
          Campus owners and admins can change plan limits.
        </InfoNote>
      )}
    </section>
  );
}
