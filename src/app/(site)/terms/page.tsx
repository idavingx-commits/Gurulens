import type { Metadata } from "next";
import Link from "next/link";

import { BulletList, StaticPage, StaticSection } from "@/components/legal/StaticPage";
import { COMPANY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
  title: "Terms of Service",
  description: "The rules for using GuruLens — for students, teachers and everyone in between.",
};

export default function TermsPage() {
  return (
    <StaticPage
      kicker="Legal"
      title="Terms of Service"
      intro={`These terms are an agreement between you and ${COMPANY_NAME} for using GuruLens. By creating an account or using the platform, you accept them. Please read them together with our Community Guidelines and Privacy Policy.`}
      updated="18 October 2026"
    >
      <StaticSection title="Your account">
        <BulletList
          items={[
            "You must be at least 13 years old to use GuruLens.",
            "Keep your password and account secure — you are responsible for activity on your account. Two-factor authentication is available in Settings.",
            "One person, one account. Do not impersonate others or create accounts to bypass moderation.",
          ]}
        />
      </StaticSection>

      <StaticSection title="Your content">
        <BulletList
          items={[
            "You keep ownership of everything you post — lessons, reels, quizzes, reviews and comments.",
            "You grant GuruLens a licence to host, display and distribute your content on the platform (for example, showing a post in feeds and search). This licence ends when you delete the content, except for copies already shared or cached.",
            "You confirm you have the rights to everything you upload and that it follows our Community Guidelines.",
          ]}
        />
      </StaticSection>

      <StaticSection title="Teachers, verification and memberships">
        <BulletList
          items={[
            "Teacher profiles must describe real qualifications and experience. Verification is free and reviewed by our team, but it is a trust signal — not a certification or an endorsement of teaching quality or exam results.",
            "Enrollment codes are for verifying your real students. Do not sell them or use them to solicit fake reviews.",
            "Membership tiers currently gate supporters-only content only. No payments are processed on GuruLens at launch; nothing on the platform is a paid transaction between users.",
          ]}
        />
      </StaticSection>

      <StaticSection title="Reviews and ratings">
        <BulletList
          items={[
            "Only students who verified enrolment with a teacher's code can review that teacher.",
            "Reviews must be honest, based on genuine experience. Fake, retaliatory or coordinated reviews are removed.",
            "Teachers may reply publicly to a review once — replies must stay professional.",
            "Ratings are community signals, not guarantees: we are not responsible for outcomes of any tuition arrangement.",
          ]}
        />
      </StaticSection>

      <StaticSection title="Moderation and suspension">
        <p>
          We apply the enforcement ladder described in our Community Guidelines — warnings, content
          removal and suspensions. You can appeal any moderation decision through Support, and a
          different moderator will review it. We may suspend or terminate accounts immediately for
          serious violations, especially anything endangering minors.
        </p>
      </StaticSection>

      <StaticSection title="Disclaimers and limits">
        <BulletList
          items={[
            "GuruLens is provided \u201cas is\u201d. We work hard to keep it available, secure and accurate, but we cannot promise uninterrupted or error-free service.",
            "We are not a party to any agreement between a student and a teacher, and we do not guarantee learning outcomes or exam results.",
            "To the maximum extent allowed by law, our liability is limited to the amount you paid us (which is currently zero for all features at launch).",
          ]}
        />
      </StaticSection>

      <StaticSection title="Governing law and changes">
        <p>
          These terms are governed by the laws of Sri Lanka. If we make material changes, we will
          notify you in the app before they take effect. Continuing to use GuruLens after a change
          means you accept the updated terms.
        </p>
        <p>
          Questions about these terms?{" "}
          <Link href="/support" className="font-bold text-brand-600 hover:underline">
            Contact support
          </Link>
          .
        </p>
      </StaticSection>
    </StaticPage>
  );
}
