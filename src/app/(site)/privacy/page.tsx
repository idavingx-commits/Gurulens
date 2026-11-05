import type { Metadata } from "next";
import Link from "next/link";

import { BulletList, StaticPage, StaticSection } from "@/components/legal/StaticPage";
import { COMPANY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy Policy",
  description:
    "What data GuruLens collects, why we collect it, and the rights you have under Sri Lanka's data protection law.",
};

export default function PrivacyPage() {
  return (
    <StaticPage
      kicker="Legal"
      title="Privacy Policy"
      intro={`${COMPANY_NAME} ("GuruLens", "we") builds an education-first platform. This policy explains, in plain language, what we collect and how we protect it. We follow Sri Lanka's Personal Data Protection Act No. 9 of 2022.`}
      updated="18 October 2026"
    >
      <StaticSection title="What we collect">
        <BulletList
          items={[
            <>
              <strong className="text-ink-800">Account data:</strong> your name, email address,
              hashed password, date of birth (to confirm you are 13+), and role (student, teacher…).
            </>,
            <>
              <strong className="text-ink-800">Profile data:</strong> photo, bio, subjects,
              districts, grades, qualifications and contact details you choose to publish. Public
              profile fields are visible to everyone — you control what you add.
            </>,
            <>
              <strong className="text-ink-800">Content you create:</strong> posts, comments, review
              text, quizzes, uploads and reactions.
            </>,
            <>
              <strong className="text-ink-800">Security data:</strong> active sessions, audit events
              for moderation and admin actions, and security settings such as two-factor
              authentication.
            </>,
            <>
              <strong className="text-ink-800">Verification evidence:</strong> documents you submit
              (optional) are visible only to our moderation team, never to the public.
            </>,
          ]}
        />
      </StaticSection>

      <StaticSection title="How we use it">
        <BulletList
          items={[
            "To run your account, show your profile, and deliver your content to the right audience.",
            "To keep reviews trustworthy — only students who verified enrolment can review a teacher.",
            "To keep the community safe: reviewing reports, verifying teachers, and enforcing our guidelines.",
            "To send you notifications about your account and content — no third-party advertising, ever.",
          ]}
        />
        <p>
          We do not sell your personal data. We do not run third-party ad tracking on GuruLens.
        </p>
      </StaticSection>

      <StaticSection title="Cookies & local storage">
        <BulletList
          items={[
            "gl_session — a secure, HTTP-only cookie that keeps you signed in. Required for the platform to work.",
            "gl_csrf — a security token protecting your account against cross-site request forgery.",
            "Theme and interface preferences stored in your browser.",
          ]}
        />
        <p>We use no advertising or cross-site tracking cookies.</p>
      </StaticSection>

      <StaticSection title="Children and age limits">
        <p>
          GuruLens is designed for users aged 13 and above. We ask for your date of birth at
          registration and block younger sign-ups. If you believe a child under 13 has created an
          account, contact us and we will remove it promptly.
        </p>
      </StaticSection>

      <StaticSection title="Retention and your rights">
        <BulletList
          items={[
            "You can edit your profile and content at any time, and delete posts, comments and reviews yourself.",
            "You can request a copy of your data, or deletion of your account, by contacting support.",
            "Audit and moderation records are kept for safety and legal reasons, with access restricted to the moderation team.",
          ]}
        />
        <p>
          To exercise any privacy right, or with any question about this policy, reach us through{" "}
          <Link href="/support" className="font-bold text-brand-600 hover:underline">
            Support
          </Link>
          .
        </p>
      </StaticSection>
    </StaticPage>
  );
}
