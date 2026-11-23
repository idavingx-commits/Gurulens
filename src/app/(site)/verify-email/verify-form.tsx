"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

export function VerifyEmailForm({
  email,
  signedIn,
  initialVerified,
  mailConfigured,
  smsConfigured,
  devCode,
  next,
  role,
  phone,
  phoneVerified,
}: {
  email: string;
  signedIn: boolean;
  initialVerified: boolean;
  mailConfigured: boolean;
  smsConfigured: boolean;
  devCode: string | null;
  next: string | null;
  role: string | null;
  phone: string | null;
  phoneVerified: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [verified, setVerified] = useState(initialVerified);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [hintCode, setHintCode] = useState<string | null>(devCode);

  const [phoneInput, setPhoneInput] = useState(phone ?? "");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneDone, setPhoneDone] = useState(phoneVerified);
  const [phoneHint, setPhoneHint] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const destination =
    next ?? (role === "teacher" ? "/studio" : role === "admin" || role === "moderator" ? "/admin" : "/feed");

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (pending || code.length !== 6) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch("/api/auth/verify-email", {
        method: "POST",
        body: { action: "verify", email: email || undefined, code },
      });
      setVerified(true);
      toast.success("Email verified — welcome to GuruLens!");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not verify the code.");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || pending) return;
    setError(null);
    setPending(true);
    try {
      const data = await apiFetch<{ devCode?: string }>("/api/auth/verify-email", {
        method: "POST",
        body: { action: "resend", email: email || undefined },
      });
      setCooldown(30);
      if (data.devCode) setHintCode(data.devCode);
      toast.success(
        data.devCode
          ? "Dev code shown below (email provider not configured)."
          : "A new code is on its way to your inbox.",
      );
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not resend the code.");
    } finally {
      setPending(false);
    }
  }

  async function sendPhone() {
    if (phoneBusy) return;
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      const data = await apiFetch<{ devCode?: string }>("/api/auth/phone", {
        method: "POST",
        body: { action: "send", phone: phoneInput },
      });
      setPhoneSent(true);
      if (data.devCode) setPhoneHint(data.devCode);
      toast.success(
        data.devCode ? "Dev SMS code shown below." : "OTP sent by SMS.",
      );
    } catch (err) {
      setPhoneError(err instanceof ClientApiError ? err.message : "Could not send the OTP.");
    } finally {
      setPhoneBusy(false);
    }
  }

  async function verifyPhone() {
    if (phoneBusy || phoneCode.length !== 6) return;
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      await apiFetch("/api/auth/phone", {
        method: "POST",
        body: { action: "verify", phone: phoneInput, code: phoneCode },
      });
      setPhoneDone(true);
      toast.success("Phone number verified.");
      router.refresh();
    } catch (err) {
      setPhoneError(err instanceof ClientApiError ? err.message : "Could not verify the OTP.");
    } finally {
      setPhoneBusy(false);
    }
  }

  return (
    <div className="glass-strong animate-fade-up relative overflow-hidden rounded-3xl p-7 sm:p-9">
      <div
        aria-hidden="true"
        className="absolute inset-x-10 top-0 h-[3px] rounded-b-full bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500"
      />
      <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name="shield-check" size={20} />
      </span>
      <h1 className="mt-3 text-xl font-extrabold tracking-tight text-ink-900">
        Verify your account
      </h1>
      <p lang="si" className="font-si mt-1.5 text-[13px] font-semibold leading-[1.85] text-ink-500">
        ඔබේ විද්‍යුත් තැපෑල තහවුරු කරන්න — කේතය ඔබේ inbox එකට එවනු ලැබේ.
      </p>

      {verified ? (
        <div className="mt-5">
          <InfoNote tone="brand" icon="check-circle">
            <p className="font-bold">Email verified{email ? ` — ${email}` : ""}.</p>
            <p className="mt-1">Your account is fully active. Welcome aboard!</p>
          </InfoNote>
          <Button
            type="button"
            size="lg"
            className="mt-4 w-full justify-center"
            onClick={() => {
              router.push(destination);
              router.refresh();
            }}
          >
            Continue to GuruLens <Icon name="arrow-right" size={16} />
          </Button>
        </div>
      ) : (
        <form onSubmit={verify} className="mt-5 space-y-4">
          <p className="text-[13px] leading-relaxed text-ink-500">
            We sent a 6-digit code to <span className="font-bold text-ink-800">{email || "your email"}</span>.
            Enter it below to activate your account.
          </p>

          {!mailConfigured && !hintCode ? (
            <InfoNote tone="warn" icon="info">
              Email sending is not enabled on this deployment yet. You can keep using GuruLens —
              verification activates automatically once email is configured.
            </InfoNote>
          ) : null}

          {hintCode ? (
            <InfoNote tone="warn" icon="key">
              Development mode: your code is <span className="font-mono font-bold">{hintCode}</span>
            </InfoNote>
          ) : null}

          <Field label="Verification code" htmlFor="verify-code">
            <Input
              id="verify-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="text-center font-mono text-lg tracking-[0.3em]"
            />
          </Field>

          {error ? <InfoNote tone="danger" icon="alert">{error}</InfoNote> : null}

          <Button type="submit" size="lg" className="w-full justify-center" disabled={pending || code.length !== 6}>
            {pending ? "Verifying…" : "Verify email"}
          </Button>

          <button
            type="button"
            onClick={() => void resend()}
            disabled={cooldown > 0 || pending}
            className="w-full text-center text-[12.5px] font-bold text-brand-600 hover:text-brand-700 disabled:text-ink-300"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </form>
      )}

      {/* Phone OTP */}
      {signedIn ? (
        <div className="mt-7 border-t border-ink-100 pt-5">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-ink-900">
            <Icon name="smartphone" size={15} className="text-brand-600" />
            Phone verification (OTP)
            {phoneDone ? (
              <span className="rounded-chip bg-success-100 px-2 py-0.5 text-[10px] font-bold text-success-600">
                Verified
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
            Add a Sri Lankan mobile number and verify it with a one-time SMS code.
          </p>

          {phoneDone ? (
            <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-success-600">
              <Icon name="check-circle" size={14} /> {phoneInput || phone} is verified.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <Field label="Mobile number" htmlFor="phone-number">
                <div className="flex gap-2">
                  <Input
                    id="phone-number"
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="077 123 4567"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={phoneBusy || phoneInput.trim().length < 9}
                    onClick={() => void sendPhone()}
                  >
                    {phoneBusy && !phoneSent ? "Sending…" : "Send OTP"}
                  </Button>
                </div>
              </Field>

              {phoneHint ? (
                <InfoNote tone="warn" icon="key">
                  Development mode: your SMS code is{" "}
                  <span className="font-mono font-bold">{phoneHint}</span>
                </InfoNote>
              ) : null}

              {!smsConfigured && !phoneHint ? (
                <p className="text-[11px] text-ink-400">
                  SMS gateway not configured yet — OTP delivery activates once SMS_API_URL is set.
                </p>
              ) : null}

              {phoneSent ? (
                <Field label="SMS code" htmlFor="phone-code">
                  <div className="flex gap-2">
                    <Input
                      id="phone-code"
                      inputMode="numeric"
                      maxLength={6}
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="flex-1 text-center font-mono tracking-[0.3em]"
                    />
                    <Button
                      type="button"
                      size="md"
                      disabled={phoneBusy || phoneCode.length !== 6}
                      onClick={() => void verifyPhone()}
                    >
                      {phoneBusy ? "Checking…" : "Verify"}
                    </Button>
                  </div>
                </Field>
              ) : null}

              {phoneError ? <InfoNote tone="danger" icon="alert">{phoneError}</InfoNote> : null}
            </div>
          )}
        </div>
      ) : null}

      <p className="mt-6 text-center text-[12.5px] text-ink-400">
        Wrong account?{" "}
        <Link href="/login" className="font-bold text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
