"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/primitives";
import { apiFetch, ClientApiError } from "@/lib/client";

type Device = { id: string; name: string; deviceCode: string };
type Class = { id: string; name: string };
type Card = { id: string; cardNumber: string; studentName: string };

type Result = {
  success: boolean;
  message: string;
  timestamp: Date;
};

export function SimulatorForm({
  devices,
  classes,
  cards,
}: {
  devices: Device[];
  classes: Class[];
  cards: Card[];
}) {
  const [deviceId, setDeviceId] = useState("");
  const [classId, setClassId] = useState("");
  const [cardId, setCardId] = useState("");
  const [manualCard, setManualCard] = useState("");
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  async function scan() {
    if (pending || !deviceId || !classId) return;

    const cardNumber = cardId
      ? cards.find((c) => c.id === cardId)?.cardNumber
      : manualCard;

    if (!cardNumber) {
      setResults((r) => [
        { success: false, message: "Select a card or enter a card number", timestamp: new Date() },
        ...r,
      ]);
      return;
    }

    setPending(true);
    try {
      const data = await apiFetch<{ message: string }>("/api/classpulse/simulate", {
        method: "POST",
        body: { deviceId, cardNumber, classId },
      });
      setResults((r) => [
        { success: true, message: data.message || "Card scanned successfully", timestamp: new Date() },
        ...r,
      ]);
    } catch (err) {
      setResults((r) => [
        { success: false, message: err instanceof ClientApiError ? err.message : "Scan failed", timestamp: new Date() },
        ...r,
      ]);
    } finally {
      setPending(false);
    }
  }

  async function bulkScan() {
    if (pending || !deviceId || !classId) return;
    setPending(true);
    try {
      const data = await apiFetch<{ present: number; absent: number }>("/api/classpulse/simulate", {
        method: "POST",
        body: { deviceId, classId, bulk: true, presentRate: 85 },
      });
      setResults((r) => [
        { success: true, message: `Bulk simulation: ${data.present} present, ${data.absent} absent`, timestamp: new Date() },
        ...r,
      ]);
    } catch (err) {
      setResults((r) => [
        { success: false, message: err instanceof ClientApiError ? err.message : "Bulk simulation failed", timestamp: new Date() },
        ...r,
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Controls */}
      <div className="space-y-5">
        <div className="card p-5">
          <SectionHeader title="1. Select Device" className="mb-4" />
          {devices.length === 0 ? (
            <p className="text-sm text-ink-500">No active devices found.</p>
          ) : (
            <div className="space-y-2">
              {devices.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDeviceId(d.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    deviceId === d.id
                      ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                      : "border-ink-200 hover:border-ink-300"
                  }`}
                >
                  <div>
                    <p className="font-bold text-ink-900">{d.name}</p>
                    <p className="text-sm text-ink-500">{d.deviceCode}</p>
                  </div>
                  {deviceId === d.id && <Icon name="check" size={18} className="text-brand-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <SectionHeader title="2. Select Class" className="mb-4" />
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select a class…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="card p-5">
          <SectionHeader title="3. Select Card" className="mb-4" />
          <Field label="Choose a registered card" htmlFor="cardId">
            <Select
              id="cardId"
              value={cardId}
              onChange={(e) => {
                setCardId(e.target.value);
                setManualCard("");
              }}
            >
              <option value="">Select a card…</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.studentName} — {c.cardNumber}
                </option>
              ))}
            </Select>
          </Field>
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-200" />
            <span className="text-xs text-ink-400">or</span>
            <div className="h-px flex-1 bg-ink-200" />
          </div>
          <Field label="Enter card number manually" htmlFor="manualCard">
            <Input
              id="manualCard"
              value={manualCard}
              onChange={(e) => {
                setManualCard(e.target.value);
                setCardId("");
              }}
              placeholder="e.g., CARD-12345678"
            />
          </Field>
        </div>

        <div className="flex gap-3">
          <Button onClick={scan} disabled={pending || !deviceId || !classId} className="flex-1">
            {pending ? <Icon name="loader" size={18} className="animate-spin" /> : <Icon name="zap" size={18} />}
            Simulate Scan
          </Button>
          <Button onClick={bulkScan} disabled={pending || !deviceId || !classId} variant="outline">
            <Icon name="users" size={18} /> Bulk
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="card p-5">
        <SectionHeader title="Scan Results" className="mb-4" />
        {results.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="zap" size={40} className="mx-auto mb-3 text-ink-300" />
            <p className="text-sm text-ink-500">Results will appear here</p>
          </div>
        ) : (
          <div className="max-h-[500px] space-y-2 overflow-y-auto">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  r.success ? "border-success-200 bg-success-50" : "border-danger-200 bg-danger-50"
                }`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full ${
                    r.success ? "bg-success-500" : "bg-danger-500"
                  } text-white`}
                >
                  <Icon name={r.success ? "check" : "x"} size={12} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${r.success ? "text-success-800" : "text-danger-800"}`}>
                    {r.message}
                  </p>
                  <p className="text-xs text-ink-500">{r.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
