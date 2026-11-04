/**
 * Canonical public URL of the site, used for metadataBase, canonical links,
 * sitemap.xml, robots.txt and structured data.
 *
 * Order: explicit NEXT_PUBLIC_SITE_URL → the production domain on Netlify
 * production builds → localhost for local dev. Deploy previews also point
 * canonicals at the production domain so Google never indexes duplicates.
 */
const PRODUCTION_URL = "https://gurulens.us";

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.NETLIFY === "true" || process.env.NODE_ENV === "production") {
    return PRODUCTION_URL;
  }
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

/** Serialize JSON-LD safely for a <script> tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
