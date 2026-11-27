/**
 * Public contact details for GuruLens / IneshDev (Pvt) Ltd.
 *
 * Keep these values in sync everywhere they are shown: pricing, contact page,
 * LMS pages, organization signup and the site footer.
 */

export const CONTACT_EMAIL = "info@gurulens.us";
export const CONTACT_PHONE = "0742366672";
export const CONTACT_PHONE_TEL = "+94742366672";
export const CONTACT_WHATSAPP = "0764001179";
export const CONTACT_WHATSAPP_URL = "https://wa.me/94764001179";
export const CONTACT_COMPANY = "IneshDev (Pvt) Ltd";

export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

export function contactMailto(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject });
  if (body) params.set("body", body);
  return `${CONTACT_MAILTO}?${params.toString()}`;
}

export const CONTACT_TOPICS = [
  {
    id: "pricing",
    icon: "crown",
    title: "Plans, pricing & offers",
    body: "Questions about a teacher, institute or school plan, launch offers, invoices or moving from one plan to another.",
    subject: "GuruLens plan enquiry",
    cta: "Ask about plans",
  },
  {
    id: "investment",
    icon: "chart",
    title: "Invest in GuruLens",
    body: "We are building Sri Lanka's education-first teacher discovery and learning platform. Talk to IneshDev about the round, traction and product roadmap.",
    subject: "GuruLens investment enquiry",
    cta: "Request the investor deck",
  },
  {
    id: "partnership",
    icon: "users",
    title: "Schools, institutes & partnerships",
    body: "Bring your campus online, connect a tuition institute or explore a content, distribution or technology partnership.",
    subject: "GuruLens partnership enquiry",
    cta: "Start a conversation",
  },
] as const;
