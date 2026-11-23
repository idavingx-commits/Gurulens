/**
 * SMS OTP sender hook. Configure any HTTP SMS gateway (e.g. TextLK,
 * Notify.lk) with SMS_API_URL + SMS_API_KEY (+ optional SMS_SENDER_ID).
 * The gateway must accept JSON { to, message, sender? } and return 2xx.
 * Without configuration the sender is dormant (logged in development).
 */

export function isSmsConfigured(): boolean {
  return Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY);
}

export async function sendSms(opts: {
  to: string;
  message: string;
}): Promise<{ sent: boolean }> {
  const url = process.env.SMS_API_URL;
  const key = process.env.SMS_API_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[sms:dev] to=${opts.to} message=${opts.message}`);
    }
    return { sent: false };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: opts.to,
        message: opts.message,
        ...(process.env.SMS_SENDER_ID ? { sender: process.env.SMS_SENDER_ID } : {}),
      }),
    });
    if (!res.ok) {
      console.error("[sms:error]", res.status, await res.text().catch(() => ""));
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error("[sms:error]", err);
    return { sent: false };
  }
}
