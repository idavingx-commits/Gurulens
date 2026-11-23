/**
 * Transactional email via Resend's HTTP API (works on Cloudflare Workers —
 * no SMTP sockets). When RESEND_API_KEY is absent the sender is dormant:
 * messages are logged in development and skipped in production, and the
 * login email-verification gate stays off until a provider is configured.
 */

const RESEND_URL = "https://api.resend.com/emails";

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function mailFrom(): string {
  return process.env.MAIL_FROM || "GuruLens <onboarding@resend.dev>";
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail:dev] to=${opts.to} subject=${opts.subject}`);
    }
    return { sent: false };
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailFrom(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      console.error("[mail:error]", res.status, await res.text().catch(() => ""));
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error("[mail:error]", err);
    return { sent: false };
  }
}

export function verificationEmailHtml(code: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0a1b3d">
    <h2 style="margin:0 0 8px">Verify your GuruLens email</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">
      Enter this code to finish creating your account. It expires in 10 minutes.
    </p>
    <p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:0 0 16px;color:#0094fd">${code}</p>
    <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6">
      If you did not create a GuruLens account, you can ignore this email.
    </p>
  </div>`;
}
