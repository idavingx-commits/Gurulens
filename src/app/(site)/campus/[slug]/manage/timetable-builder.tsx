"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Select } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { SCHOOL_DAYS } from "@/lib/school-days";

type Entry = {
  dayOfWeek: number;
  period: number;
  subject: string;
  teacher: string | null;
  room: string | null;
};

type Cell = { subject: string; teacher: string };

const WEEKDAYS = SCHOOL_DAYS.filter((d) => d.day <= 5);

export function TimetableBuilder({
  organizationId,
  classes,
}: {
  organizationId: string;
  classes: Array<{ id: string; name: string; room: string | null }>;
}) {
  const router = useRouter();
  const toast = useToast();

  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [periodCount, setPeriodCount] = useState(8);
  const [cells, setCells] = useState<Record<string, Cell> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    apiFetch<{ entries: Entry[] }>(
      `/api/organizations/${organizationId}/timetable?classId=${classId}`,
    )
      .then((data) => {
        if (cancelled) return;
        const next: Record<string, Cell> = {};
        let maxPeriod = 8;
        for (const entry of data.entries) {
          next[`${entry.dayOfWeek}:${entry.period}`] = {
            subject: entry.subject,
            teacher: entry.teacher ?? "",
          };
          maxPeriod = Math.max(maxPeriod, entry.period);
        }
        setCells(next);
        setPeriodCount(Math.min(12, maxPeriod));
        setDirty(false);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setCells({});
        setError(err instanceof ClientApiError ? err.message : "Could not load the timetable.");
      });
    return () => {
      cancelled = true;
    };
  }, [classId, organizationId]);

  function setCell(day: number, period: number, patch: Partial<Cell>) {
    setCells((prev) => {
      const key = `${day}:${period}`;
      const current = prev?.[key] ?? { subject: "", teacher: "" };
      return { ...(prev ?? {}), [key]: { ...current, ...patch } };
    });
    setDirty(true);
  }

  async function save() {
    if (saving || !classId || !cells) return;
    setSaving(true);
    setError(null);
    try {
      const entries: Entry[] = [];
      for (const day of WEEKDAYS) {
        for (let period = 1; period <= periodCount; period++) {
          const cell = cells[`${day.day}:${period}`];
          if (!cell?.subject.trim()) continue;
          entries.push({
            dayOfWeek: day.day,
            period,
            subject: cell.subject.trim(),
            teacher: cell.teacher.trim() || null,
            room: classes.find((c) => c.id === classId)?.room ?? null,
          });
        }
      }
      await apiFetch(`/api/organizations/${organizationId}/timetable`, {
        method: "PUT",
        body: { schoolClassId: classId, entries },
      });
      toast.success("Timetable saved.");
      setDirty(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not save the timetable.");
    } finally {
      setSaving(false);
    }
  }

  if (classes.length === 0) {
    return (
      <section className="card p-5" id="timetable">
        <h2 className="text-[15px] font-extrabold text-ink-900">Weekly timetable</h2>
        <InfoNote icon="info" className="mt-3">
          Create a class above first — each class gets its own weekly timetable.
        </InfoNote>
      </section>
    );
  }

  return (
    <section className="card p-5" id="timetable">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink-900">Weekly timetable</h2>
          <p className="text-[12px] text-ink-400">
            Fill in the subjects and teachers for each period. Only this school&apos;s students and
            teachers can see the finished timetable.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            aria-label="Choose class"
            className="h-9 w-44 py-0 text-[12.5px]"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={String(periodCount)}
            onChange={(e) => {
              setPeriodCount(Number(e.target.value));
              setDirty(true);
            }}
            aria-label="Periods per day"
            className="h-9 w-32 py-0 text-[12.5px]"
          >
            {[6, 7, 8, 9, 10, 11, 12].map((n) => (
              <option key={n} value={n}>
                {n} periods
              </option>
            ))}
          </Select>
          <Button type="button" size="sm" disabled={saving || !dirty} onClick={() => void save()}>
            {saving ? (
              <Icon name="loader" size={14} className="animate-spin" />
            ) : (
              <Icon name="check" size={14} strokeWidth={3} />
            )}
            Save week
          </Button>
        </div>
      </div>

      {error ? (
        <InfoNote icon="alert" tone="danger" className="mt-4">
          {error}
        </InfoNote>
      ) : null}

      {cells === null ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-ink-200 p-6 text-[12.5px] font-semibold text-ink-400">
          <Icon name="loader" size={15} className="animate-spin" /> Loading timetable…
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr>
                <th className="w-12 px-1 py-2 text-[10.5px] font-black text-ink-400 uppercase">
                  #
                </th>
                {WEEKDAYS.map((d) => (
                  <th
                    key={d.day}
                    className="px-1 py-2 text-[11px] font-extrabold tracking-wide text-ink-700 uppercase"
                  >
                    {d.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periodCount }, (_, i) => i + 1).map((period) => (
                <tr key={period} className="border-t border-ink-100">
                  <td className="px-1 py-1.5 text-center text-[12px] font-extrabold text-ink-400 tabular-nums">
                    {period}
                  </td>
                  {WEEKDAYS.map((d) => {
                    const cell = cells[`${d.day}:${period}`];
                    return (
                      <td key={d.day} className="px-1 py-1.5 align-top">
                        <input
                          value={cell?.subject ?? ""}
                          onChange={(e) => setCell(d.day, period, { subject: e.target.value })}
                          placeholder="Subject"
                          maxLength={120}
                          aria-label={`${d.label} period ${period} subject`}
                          className="w-full rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[11.5px] font-bold text-ink-800 placeholder:font-medium placeholder:text-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        />
                        <input
                          value={cell?.teacher ?? ""}
                          onChange={(e) => setCell(d.day, period, { teacher: e.target.value })}
                          placeholder="Teacher"
                          maxLength={120}
                          aria-label={`${d.label} period ${period} teacher`}
                          className="mt-1 w-full rounded-lg border border-transparent bg-ink-50 px-2 py-1 text-[10.5px] font-semibold text-ink-500 placeholder:text-ink-300 focus:border-brand-300 focus:bg-white focus:outline-none"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px] font-semibold text-ink-400">
        Leave a cell empty for a free period. Saving replaces the whole week for the selected
        class.
      </p>
    </section>
  );
}
