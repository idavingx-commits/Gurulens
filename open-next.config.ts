import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext configuration for Cloudflare Workers.
 *
 * No incremental cache is configured: GuruLens pages are dynamic (auth-aware)
 * and the app does not use ISR, so the default no-op cache is correct.
 */
export default defineCloudflareConfig({});
