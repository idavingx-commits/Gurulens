"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/interactive";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

type SetupData = { secret: string; otpauthUrl: string; qrDataUrl: string };

export function MfaCard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const toast = useToast();

  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<SetupData>("/api/settings/mfa", {
        method: "POST",
        body: { action: "setup" },
      });
      setSetup(res);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not start setup.");
    } finally {
      setBusy(false);
    }
  }

  async function enable(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/settings/mfa", { method: "POST", body: { action: "enable", code } });
      toast.success("Two-factor authentication enabled.");
      setSetup(null);
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/settings/mfa", { method: "POST", body: { action: "disable", password } });
      toast.success("Two-factor authentication disabled.");
      setConfirmingDisable(false);
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not disable 2FA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 flex-none items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
            <Icon name="shield-check" size={18} />
          </span>
          <div>
            <h2 className="text-[15px] font-extrabold text-ink-900">Two-factor authentication</h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-400">
              {enabled
                ? "Enabled — a 6-digit authenticator code is required at sign-in."
                : "Add a second layer of security with any authenticator app (Google Authenticator, Authy, etc.)."}
            </p>
          </div>
        </div>
        {enabled ? (
          <span className="rounded-chip bg-success-100 px-2.5 py-1 text-[11px] font-bold text-success-600">
            Enabled
          </span>
        ) : null}
      </div>

      {!enabled && !setup ? (
        <div className="mt-4">
          <Button type="button" onClick={startSetup} disabled={busy}>
            {busy ? <Spinner size={15} /> : <Icon name="shield-check" size={15} />}
            Set up 2FA
          </Button>
          {error ? <p className="mt-2 text-[12.5px] font-semibold text-danger-600">{error}</p> : null}
        </div>
      ) : null}

      {!enabled && setup ? (
        <form onSubmit={enable} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex-none rounded-2xl border border-ink-100 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrDataUrl} alt="2FA QR code" width={180} height={180} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              Scan the QR code, or enter this secret manually:
            </p>
            <code className="mt-1.5 block rounded-xl bg-ink-100/70 px-3 py-2 font-mono text-[12px] tracking-wide break-all text-ink-700">
              {setup.secret}
            </code>
            <div className="mt-3 max-w-[220px]">
              <Field label="6-digit code" error={error}>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="000000"
                  className="text-center font-mono text-lg tracking-[0.3em]"
                />
              </Field>
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="submit" disabled={busy || code.length !== 6}>
                {busy ? <Spinner size={15} /> : <Icon name="check" size={15} strokeWidth={2.4} />}
                Verify & enable
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSetup(null);
                  setCode("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      ) : null}

      {enabled && !confirmingDisable ? (
        <div className="mt-4">
          <Button type="button" variant="outline" onClick={() => setConfirmingDisable(true)}>
            <Icon name="lock" size={15} />
            Disable 2FA
          </Button>
        </div>
      ) : null}

      {enabled && confirmingDisable ? (
        <form onSubmit={disable} className="mt-4 flex max-w-sm flex-col gap-3">
          <Field label="Confirm your password" error={error}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={busy || password.length === 0}>
              {busy ? <Spinner size={15} /> : <Icon name="lock" size={15} />}
              Disable 2FA
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setConfirmingDisable(false);
                setPassword("");
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
