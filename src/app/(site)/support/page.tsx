import type { Metadata } from "next";
import Link from "next/link";

import { BulletList, StaticPage, StaticSection } from "@/components/legal/StaticPage";
import { COMPANY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  alternates: { canonical: "/support" },
  title: "Support",
  description:
    "Get help with GuruLens — reports, appeals, verification questions, account issues and safety concerns.",
};

export default function SupportPage() {
  return (
    <StaticPage
      kicker="Help"
      title="Support & Appeals"
      intro={`We are a small team building GuruLens at ${COMPANY_NAME}. Most questions below can be solved in a couple of taps — and for anything else, email us and we will get back to you.`}
    >
      <StaticSection title="Report content or a user">
        <p>
          Every post, comment and teacher profile has a <strong className="text-ink-800">Report</strong>{" "}
          action. Reports are confidential — the person you report will not know who reported them,
          and you will get a notification when a moderator has reviewed the report.
        </p>
        <p>
          For urgent safety concerns (threats, anything involving a minor), choose{" "}
          <em>Harassment or bullying</em> as the reason and add details — these are prioritised.
        </p>
      </StaticSection>

      <StaticSection title="Appeal a moderation decision">
        <p>
          If your content was removed or your account suspended, you can appeal. Email us from the
          address on your GuruLens account with the subject{" "}
          <strong className="text-ink-800">&ldquo;Appeal&rdquo;</strong> and include your username.
          A different moderator will review the decision.
        </p>
      </StaticSection>

      <StaticSection title="Verification questions">
        <BulletList
          items={[
            "Apply for verification from the Teacher Studio → Verification tab. It is free.",
            "Track your request status in the same tab — every update also appears in your notifications.",
            "If you were asked for more information, reply by submitting a new request with clearer evidence.",
            "Verification typically takes 2–3 days. It can take longer during busy periods — thank you for your patience.",
          ]}
        />
      </StaticSection>

      <StaticSection title="Account help">
        <BulletList
          items={[
            "Forgot your password? You can change it in Settings — Profile & Security if you are signed in.",
            "Enable two-factor authentication for extra security in Settings.",
            "Want your account deleted? Email us from your account address and we will delete it within 30 days.",
          ]}
        />
      </StaticSection>

      <StaticSection title="Contact us">
        <p>
          Email <strong className="text-ink-800">support@gurulens.lk</strong> — we usually reply
          within 2 working days.
        </p>
        <p className="text-[13px] text-ink-400">
          Before you write, check our{" "}
          <Link href="/guidelines" className="font-bold text-brand-600 hover:underline">
            Community Guidelines
          </Link>{" "}
          and{" "}
          <Link href="/guidelines" className="font-bold text-brand-600 hover:underline">
            moderation ladder
          </Link>{" "}
          — the answer might already be there.
        </p>
      </StaticSection>
    </StaticPage>
  );
}
