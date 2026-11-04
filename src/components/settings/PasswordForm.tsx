"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/interactive";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

export function PasswordForm() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) {
      setError("New password: at least 8 characters with a letter and a number.");
      return;
    }
    if (next !== confirm) {
      setError("The new passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/api/settings/password", {
        method: "POST",
        body: { currentPassword: current, newPassword: next },
      });
      toast.success("Password updated. Other sessions were signed out.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not change your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 sm:p-6">
      <h2 className="text-[15px] font-extrabold text-ink-900">Password</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-400">
        Changing your password signs out all other devices.
      </p>

      <div className="mt-4 grid max-w-md gap-3">
        <Field label="Current password">
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Field label="New password">
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm new password" error={error}>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Button
          type="submit"
          variant="secondary"
          disabled={busy || !current || !next || !confirm}
        >
          {busy ? <Spinner size={15} /> : <Icon name="lock" size={15} />}
          Update password
        </Button>
      </div>
    </form>
  );
}
