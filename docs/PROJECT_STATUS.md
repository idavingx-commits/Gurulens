# Project Status

Last updated: 2026-11-16

## Release target

Move the **existing** GuruLens application to:

- **Cloudflare Workers** (OpenNext adapter, GitHub automatic deployment)
- **Neon PostgreSQL** (fresh database, schema only)
- **Cloudflare R2** (media, including large video uploads)
- Custom domains `gurulens.us` and `www.gurulens.us`

The old Netlify database and media are left untouched. No production data was
deleted or copied.

## Existing features (preserved)

- Teacher discovery, filters, search
- Teacher profiles, reviews with enrollment-code eligibility, verification + badges
- Posts, comments, reactions, saves, feed
- Reels (vertical viewer, autoplay, progress, keyboard navigation)
- Quizzes (questions, attempts, results)
- Reports and moderation, admin users/verification/reports
- Notifications, audit logs
- Membership tiers
- Sessions, CSRF, TOTP MFA, rate limiting
- SEO: metadata, canonicals, structured data, robots, sitemap

These are unchanged in behaviour. Storage and database plumbing were swapped.

## Implemented in this release

| Area | Change |
|---|---|
| Database | Prisma datasource now `DATABASE_URL` + `DIRECT_URL` (Neon); native engine removed (`engineType = "client"`) |
| DB client | `@prisma/adapter-pg` driver adapter; lazy client so builds don't need a live DB |
| Migrations | Baseline `prisma/migrations/0001_init` generated from the schema (33 tables, 51 indexes) |
| Hosting | `@opennextjs/cloudflare` + `wrangler.jsonc` + `open-next.config.ts` |
| Next.js | Upgraded 16.4.2 → 16.4.6 (OpenNext minimum is 16.4.5) |
| Media | Netlify Blobs replaced with R2 via the S3 API (`aws4fetch`) |
| Large uploads | Presigned direct-to-R2 flow (`/api/upload/presign`, `/api/upload/complete`); 200 MB product limit kept |
| Media delivery | Public media 302-redirects to `media.gurulens.us`; private documents stay behind the auth check |
| Sitemap | Now dynamic so new teachers appear without a rebuild |
| Secrets | Hardcoded admin/demo passwords removed from the seed and `PROJECT_MEMORY.md`; generated once at seed time |
| Docs | `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md`, `.env.example` |

## Verified

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | Pass — 6 suites / 60 tests |
| `npm run build` (Next.js) | Pass |
| `npm run cf:build` (OpenNext) | Pass (local Windows symlink workaround in `node_modules` only) |
| `wrangler deploy --dry-run` | Pass — Worker 10.7 MB raw / **2.65 MB gzip** |
| Prisma schema validation | Pass |
| Baseline migration generation | Pass — 33 CREATE TABLE, 51 indexes |

## Not verified

- Neon connection, migration apply and seed — **blocked until `.env` contains the real connection strings**
- Login/registration against the real database
- R2 upload/download round-trip — blocked until R2 credentials and bucket exist
- Cloudflare deployment — no Cloudflare account access from this environment
- Custom domain and DNS cutover
- End-to-end permissions matrix against live data

## Not implemented (future milestones)

These modules do not exist in the codebase yet. They were listed in the wider
roadmap and must not be described as shipped:

- Workspaces / multi-role memberships (school teacher, institute owner, parent, principal)
- GuruLens Channels (3-free-channel quota, voice messages, polls, channel verification)
- ClassHub (classes, attendance, timetable, assignments, manual fees)
- Campus school edition (academic years, assessments, guardian linking)
- ClassPulse (device simulator, future hardware APIs)
- Plan entitlements and quota enforcement beyond the existing membership tiers
- Expanded admin RBAC
- Tamil localisation (architecture only)

## Blockers

1. **Neon credentials** must be placed in `.env` locally and in Workers secrets.
2. **Cloudflare account access** is required to create the Worker, R2 bucket and domains.
3. **Registrar / nameserver access** is required for `gurulens.us` if the zone is not already on Cloudflare.
4. **Workers Free CPU limit** (10 ms) likely breaks bcrypt-backed auth routes. Test the deployed app; if it fails, Workers Paid ($5/month) is required.

## Honest summary

The repository is production-buildable for Cloudflare Workers and the schema is
ready for Neon. Nothing has been deployed, and no database has been created or
seeded yet. Claims about a live deployment should wait until the checklist in
`docs/DEPLOYMENT.md` passes.
