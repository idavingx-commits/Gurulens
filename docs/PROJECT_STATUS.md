# Project Status

Last updated: 2026-11-20

## Live release

- **URL:** https://gurulens.us (apex canonical)
- **`www`:** 308-redirects to the apex, preserving path/query
- **Branch:** `feat/cloudflare-neon` (deployed from commit `fd4e55e`)
- **Worker:** `gurulens`, version `c8112189-1fea-4d2c-b00e-a275156063ba` (ecosystem upgrade)
- **Hosting:** Cloudflare Workers via `@opennextjs/cloudflare`
- **Database:** Neon Postgres, project `ancient-hall-97118808`, branch `production`, database `neondb`
- **Media:** Neon Object Storage, private bucket `assets` (S3 API + presigned uploads)
- **Redirect Worker:** `gurulens-www` (`workers/www-redirect/`)

The old Netlify site, database and blob files are untouched. Nothing was
deleted from Netlify.

## Current data

| Item | Count |
|---|---:|
| Public tables | **60** (34 original + 26 ecosystem upgrade) |
| Indexes | **163** |
| Foreign keys | **76** |
| Users | 2 (1 admin, 1 moderator) |
| Teacher profiles | **0** |
| Demo teachers / students | **0** |
| Subjects / districts / grades / languages | 22 / 25 / 11 / 3 |
| Badges | 4 |
| **Subscription plans** | **6** (Free, Teacher Pro, Institute, Institute Plus, Campus Pilot, Campus Pro) |

### New tables added (2026-11-20)

**Organizations:** `Organization`, `OrganizationBranch`, `OrganizationMember`, `OrganizationVerificationRequest`

**Channels:** `Channel`, `ChannelFollow`, `ChannelPost`, `ChannelReaction`, `ChannelVerificationRequest`, `VoiceMessage`, `Poll`, `PollVote`

**ClassHub:** `Class`, `ClassEnrollment`, `ClassSession`, `Attendance`, `Assignment`, `Submission`

**Guardian:** `Guardian`, `GuardianStudent`

**Subscriptions:** `Plan`, `UserSubscription`, `FeatureEntitlement`

**ClassPulse:** `VirtualDevice`, `DeviceEvent`, `StudentCard`

The production seed creates reference data, badges and the bootstrap
admin/moderator only. Demo teachers, students, posts and reviews are opt-in
with `SEED_DEMO_DATA=true` and are **not** present on the live platform.

## Verified live (2026-11-19)

A 38-check smoke test ran against `https://gurulens.us` and the new database:

| Check | Result |
|---|---|
| Public routes (`/`, `/login`, `/register`, registration pages, `/explore`, `/about`, sitemap, robots) | 9/9 `200` |
| Anonymous protected routes redirect to `/login?next=...` | 5/5 `307` |
| Wrong password | `401` |
| Admin login + `/admin`, `/admin/verification`, `/admin/users`, `/admin/badges`, `/admin/reports` | 6/6 `200` |
| Student registration + dashboard/settings/explore/notifications/saved | 6/6 `200` |
| Avatar upload to Neon storage + `/api/media/<id>` | `200 image/png` |
| Session persistence after logout/re-login | Pass |
| No seeded demo teacher names on `/explore` | Pass |
| DB assertions (test user/media present, 0 teachers, 1 admin) | Pass |
| Smoke user + storage object cleanup | Pass |
| `www` → apex redirect (path + query preserved) | `308` |
| Presigned PUT from browser origin / unsigned read | `200` / `403` |

Build checks also passed: `npx tsc --noEmit`, `npm run build`,
`npm run cf:build`, and `wrangler deploy`. A final stress run of five home /
explore pairs and three admin login → `/admin` → logout cycles returned
`200` throughout (home 247–385 ms, login 345–360 ms). The presigned
upload/complete/fetch flow was re-verified against the final Worker version
(`77bb1aa5`).

## Remaining blockers and risks

1. **Workers Free plan CPU limit (10 ms).** Earlier WebSocket-backed runs
   intermittently returned `503` / `error code: 1102` and hung requests. The
   final hybrid HTTP/WebSocket transport removed the cross-request I/O errors,
   and the final 38-check smoke, presign flow, and stress run all passed. The
   10 ms ceiling is still a headroom risk for bcrypt and heavy SSR; Workers
   Paid ($5/month) is recommended. Do not lower bcrypt rounds.
2. **Cloudflare Workers Builds API returns `403 Authentication error`.**
   Production is deployed from this machine with `npx wrangler deploy`; GitHub
   auto-deploy is not wired.
3. **Zone DNS/settings API returns `403`.** DNS records cannot be read or
   changed from the CLI. `www` is handled with a Worker route, so no DNS change
   is needed; future DNS work must be done in the dashboard.
4. **AI Gateway has no model credits.** It is provisioned but no app feature
   calls it.
5. **R2 is not enabled** (`code: 10042`). It is no longer required because media
   uses Neon Object Storage; the R2 code path remains as a fallback.

## Neon services

`neon.ts` declares Postgres, Auth, AI Gateway, Object Storage, Functions and
Realtime, and `neon deploy` applied them. Only Postgres and Object Storage are
used by the app today:

- **Postgres** — all application data.
- **Object Storage** — private bucket `assets`, presigned uploads, media proxy.
- **Auth** — provisioned but **not wired**; GuruLens keeps its existing
  DB-backed sessions, CSRF and bcrypt auth.
- **AI Gateway** — provisioned but unused (no AI features, no credits).
- **Realtime** — provisioned but unused (no live-query features).
- **Functions** — `hello` health-check function deployed; the Next.js app runs
  on the Worker.

## Not implemented (future milestones)

These do not exist in the codebase and must not be described as shipped:

- Workspaces / multi-role memberships (school teacher, institute owner, parent, principal)
- GuruLens Channels (3-free-channel quota, voice messages, polls, channel verification)
- ClassHub (classes, attendance, timetable, assignments, manual fees)
- Campus school edition (academic years, assessments, guardian linking)
- ClassPulse (device simulator, future hardware APIs)
- Plan entitlements and quota enforcement beyond the existing membership tiers
- Expanded admin RBAC
- Tamil localisation (architecture only)

## Honest summary

GuruLens is deployed and functional at `https://gurulens.us` on the new Neon
database, with demo teachers removed and uploads working through Neon Object
Storage. The remaining reliability issue is the Workers Free plan CPU ceiling,
not application code or database connectivity.
