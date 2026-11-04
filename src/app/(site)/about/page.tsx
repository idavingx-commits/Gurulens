import type { Metadata } from "next";
import Link from "next/link";

import { BulletList, StaticPage, StaticSection } from "@/components/legal/StaticPage";
import { COMPANY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About GuruLens",
  description:
    "Why GuruLens exists, how the verified badge works and how teacher rankings are calculated.",
};

export default function AboutPage() {
  return (
    <StaticPage
      kicker="About"
      title="Finding the right teacher should be trustworthy"
      intro="GuruLens is Sri Lanka's education-first teacher discovery and social platform. Students and parents discover trusted tuition teachers, follow their lessons and quizzes, and share verified learning experiences — in Sinhala, Tamil and English."
    >
      <StaticSection title="Why we built GuruLens">
        <p>
          Finding a good tuition teacher in Sri Lanka usually relies on word of mouth, crowded
          WhatsApp groups and uncertain recommendations. At the same time, brilliant teachers stay
          invisible online — or scattered across several social apps.
        </p>
        <p>
          GuruLens brings both sides together in one calm, education-first place: rich teacher
          profiles with verified credentials and reviews, educational posts, reels, quizzes, and a
          social feed focused on learning — not entertainment.
        </p>
      </StaticSection>

      <StaticSection id="verification" title="Verified badge rules">
        <p>
          The blue verified tick is free. Any teacher can apply from the Teacher Studio, and every
          request is reviewed by our moderation team before it is approved.
        </p>
        <BulletList
          items={[
            "Submit your real qualifications, teaching background and, optionally, a supporting document such as a degree certificate, appointment letter or NIC.",
            "Moderators may ask for more information before deciding — you will get a notification at every step.",
            "If approved, your profile gets the blue tick, the Verified Teacher badge, and a ranking boost. Students see it everywhere your profile appears.",
            "The tick can be revoked if it was granted based on false or misleading evidence, or if the account later breaks our community guidelines.",
          ]}
        />
      </StaticSection>

      <StaticSection id="ranking" title="How rankings work">
        <p>
          Search results use a trust score that combines several honest signals — no pay-to-win, no
          paid placement:
        </p>
        <BulletList
          items={[
            <>
              <strong className="text-ink-800">Bayesian average rating:</strong> new teachers start
              close to the platform average (3.8) and move gradually as real reviews arrive, so a
              single review cannot game the ranking.
            </>,
            <>
              <strong className="text-ink-800">Confidence weighting:</strong> ratings backed by more
              verified reviewers count more than a handful of reviews.
            </>,
            <>
              <strong className="text-ink-800">Recency:</strong> recent activity — published lessons,
              reels, quizzes and new reviews — keeps active teachers visible.
            </>,
            <>
              <strong className="text-ink-800">Verified reviews only:</strong> only students who
              verified enrolment (via the teacher&apos;s enrollment code) can write a review, so
              ratings reflect real students.
            </>,
          ]}
        />
        <p className="text-[13px] text-ink-400">
          Ratings are community signals, not a guarantee of exam results. We show how a score is
          built and never sell a better position.
        </p>
      </StaticSection>

      <StaticSection title="Who runs GuruLens">
        <p>
          GuruLens is designed and developed by {COMPANY_NAME}. We are building an education-first
          platform for Sri Lanka with privacy, safety and honesty as defaults.
        </p>
        <p>
          Questions, feedback or partnership ideas?{" "}
          <Link href="/support" className="font-bold text-brand-600 hover:underline">
            Reach our support team
          </Link>
          .
        </p>
      </StaticSection>
    </StaticPage>
  );
}
