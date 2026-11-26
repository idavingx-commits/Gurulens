import type { Metadata } from "next";

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMailConfigured } from "@/lib/mail";
import { isSmsConfigured } from "@/lib/sms";
import { VerifyEmailForm } from "./verify-form";

type Props = {
  searchParams: Promise<{ email?: string; next?: string; dev?: string }>;
};

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const auth = await getAuth();
  const query = await searchParams;

  const user = auth
    ? await db.user.findUnique({
        where: { id: auth.user.id },
        select: { email: true, emailVerified: true, phone: true, phoneVerified: true, role: true },
      })
    : null;

  const email = user?.email ?? query.email?.trim().toLowerCase() ?? "";
  const next = query.next && query.next.startsWith("/") ? query.next : null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-10 pb-16 sm:px-6">
      <VerifyEmailForm
        email={email}
        signedIn={Boolean(auth)}
        initialVerified={user?.emailVerified ?? false}
        mailConfigured={isMailConfigured()}
        smsConfigured={isSmsConfigured()}
        devCode={process.env.NODE_ENV !== "production" ? (query.dev ?? null) : null}
        next={next}
        role={user?.role ?? null}
        phone={user?.phone ?? null}
        phoneVerified={user?.phoneVerified ?? false}
      />
    </div>
  );
}
