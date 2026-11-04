import type { Metadata } from "next";
import Link from "next/link";

import { BulletList, StaticPage, StaticSection } from "@/components/legal/StaticPage";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description:
    "How we keep GuruLens a safe, honest, education-first community for students and teachers.",
};

export default function GuidelinesPage() {
  return (
    <StaticPage
      kicker="Trust & Safety"
      title="Community Guidelines"
      intro="GuruLens works only if students can trust what they read and teachers feel safe to share. These rules apply to every post, comment, review, quiz and profile on the platform."
      updated="18 October 2026"
    >
      <StaticSection title="Be honest">
        <BulletList
          items={[
            "Write reviews only about your real experience as a student — reviews require verified enrolment.",
            "Teachers: keep qualifications, experience and verification evidence accurate. Fake credentials are removed and can get accounts suspended.",
            "Never impersonate another person, institute or brand.",
          ]}
        />
      </StaticSection>

      <StaticSection title="Be kind">
        <BulletList
          items={[
            "No harassment, bullying, hate speech, threats or targeted abuse — towards anyone, including other teachers and students.",
            "Criticise teaching quality honestly in reviews, but never attack a person's character, appearance or private life.",
            "Respect privacy: do not share anyone's personal information — phone numbers, addresses, screenshots of private chats — without consent.",
          ]}
        />
      </StaticSection>

      <StaticSection title="Keep it educational">
        <BulletList
          items={[
            "No spam, advertising, referral links or unrelated promotions.",
            "No content that is sexual, violent, dangerous, or unrelated to education and learning.",
            "Quizzes and lessons must actually teach something — accurate, respectful and appropriate for school students.",
          ]}
        />
      </StaticSection>

      <StaticSection title="Safety of young users">
        <BulletList
          items={[
            "GuruLens is for users aged 13 and above. Teachers must never arrange private in-person meetings with minors outside a parent-aware class setting.",
            "Report any suspicious behaviour immediately using the report button — reports are confidential.",
            "Accounts of users who endanger minors are suspended immediately and may be reported to the authorities.",
          ]}
        />
      </StaticSection>

      <StaticSection title="What happens when rules are broken">
        <p>We apply a fair, escalating ladder depending on seriousness:</p>
        <BulletList
          items={[
            "A private warning notification with an explanation.",
            "Content removal — the post, comment, review or quiz is hidden and the author notified.",
            "Account suspension — for repeated or serious violations. Suspended users can appeal.",
            "Permanent removal of verification or badges when they were earned through deception.",
          ]}
        />
        <p>
          You can always{" "}
          <Link href="/support" className="font-bold text-brand-600 hover:underline">
            appeal a moderation decision
          </Link>{" "}
          — a different moderator will review it.
        </p>
      </StaticSection>
    </StaticPage>
  );
}
