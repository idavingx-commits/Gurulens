# GuruLens — Project Memory

> **Living document. Keep it true.**
> This is the single source of truth for the GuruLens project: what it is, how it runs, what was built, and what changed when.
> **Every session (human or AI agent) must: (1) read this file before making changes, (2) update it after every significant change** — append to the Changelog and fix any affected section below.
> Agent entry point: `AGENTS.md` points here. Never delete or rename this file without updating `AGENTS.md`.

---

## 1. What this is

- **GuruLens** — Sri Lanka's education-first teacher discovery + social platform: teacher profiles, verification badges, honest reviews, posts, reels/videos, quizzes, admin/moderation console.
- Company: **IneshDev (Pvt) Ltd**. Bilingual UI: **Sinhala + English**.
- Product spec: `C:\Users\Iworld\Downloads\GuruLens_Concept_v2_Social_Platform_Sinhala.txt`
- Production: **https://gurulens.us** (apex canonical; `www` 308-redirects to apex). Local URL: `http://localhost:3000`.

## 2. Stack & structure

- **Next.js 16.4.6 (App Router)** — BREAKING CHANGES vs training data. Read `node_modules/next/dist/docs/` before writing code (also enforced by the auto-managed block in `AGENTS.md`). OpenNext requires Next ≥ 16.4.5.
- React 19, TypeScript (strict), Tailwind v4 (configured via `@theme` in `src/app/globals.css` — no tailwind.config).
- DB: **Neon Postgres + Prisma driver adapter** → `prisma/schema.prisma` (`provider = "postgresql"`, `url = env("DATABASE_URL")` pooled, `directUrl = env("DIRECT_URL")`, `engineType = "client"`). Runtime client: `src/lib/db.ts` uses a hybrid `@prisma/adapter-neon` transport (`src/lib/db-adapter.ts`): ordinary queries go over Neon's stateless **HTTP** driver, while each transaction opens a short-lived **WebSocket** pool that is closed on commit/rollback. Neon project **`ancient-hall-97118808`** (upgraded 2026-11-20), branch **production** (`br-soft-dew-aoz4mgtd`), database **`neondb`**; `neon.ts` declares Object Storage bucket `assets`. **Schema: 60 tables, 163 indexes, 76 FKs** including Organizations, Channels, ClassHub, Subscriptions, ClassPulse, and Guardians. `neon deploy` pulls `DATABASE_URL` + `DATABASE_URL_UNPOOLED`; `DIRECT_URL` must equal the unpooled URL. **Schema changes need a migration in `prisma/migrations/`** — `npm run db:migrate` locally, `npm run db:migrate:deploy` to apply. Prisma CLI reads `.env` only. Seed `prisma/seed.ts` creates reference data + admin/moderator; `prisma/seed-plans.ts` creates subscription plans.
- Hosting: **Cloudflare Workers** via `@opennextjs/cloudflare` (`wrangler.jsonc`, `open-next.config.ts`); `npm run cf:build` / `cf:preview` / `cf:deploy`. Production is deployed from this machine with `npx wrangler deploy` (the Workers Builds API currently returns 403, so GitHub auto-deploy is not wired). A separate tiny Worker `gurulens-www` (`workers/www-redirect/`) owns the `www.gurulens.us/*` route and 308-redirects to the apex; `gurulens.us` is a Worker custom domain.
- Search uses `contains` + `mode: "insensitive"` (Postgres is case-sensitive, unlike SQLite).
- Tests: Vitest, config `vitest.config.ts` (node env, `@` → `src` alias), suites in `tests/` (ranking, format, totp, rate-limit, validation, media — 60 tests).
- Auth: DB-backed sessions (httpOnly `gl_session`) + CSRF double-submit (`gl_csrf` cookie ↔ `x-csrf-token` header via `src/lib/client.ts`).
- Media: **Neon Object Storage** (S3-compatible, bucket `assets`, private) via `aws4fetch` in `src/lib/media.ts`, served through `/api/media/[id]`. Cloudflare R2 remains a fallback when the Neon `AWS_*` variables are absent. Public files 302-redirect to `MEDIA_PUBLIC_URL` when set; otherwise they stream through the Worker. Private docs require auth. Large videos use presigned direct-to-storage uploads (`/api/upload/presign` + `/api/upload/complete`); Neon storage CORS accepts browser PUTs and unsigned reads return 403.

Key dirs: `src/app/(site)` public pages, `src/app/(auth)` login/register, `src/app/(studio)` teacher studio, `src/app/(admin)` console, `src/lib/*` (db, auth, api, rate-limit, ranking, audit, media, totp, format, validation, client, data), `src/components/*` (ui, layout, auth, teacher, post, moderation, admin, studio, legal).

## 3. Environment playbook (Windows / PowerShell 5.1)

- **HAZARD — D: drive**: `D:\node js\node.exe` intermittently fails I/O ("not recognized as an internal or external command" / commands silently killed). If that happens, re-copy the shim:
  `Copy-Item "C:\Users\Iworld\AppData\Local\studio_app\app-1.15.0\resources\bin\node.exe" "C:\Users\Iworld\AppData\Local\Temp\opencode\bin\node.exe" -Force`
  Command prefix used in every shell call:
  `$env:PATH = "C:\Users\Iworld\AppData\Local\Temp\opencode\bin;" + (($env:PATH -split ';' | Where-Object { $_ -and ($_ -notlike 'D:\node js*') }) -join ';');`
- **PowerShell gotchas**: inline JSON breaks curl → write body with `[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))` then `curl.exe --data-binary "@$path"`; `$args` shadows the automatic variable (use another name); `Invoke-WebRequest` ignores manual Cookie headers (use `curl.exe`); trust `$LASTEXITCODE` over npm notice noise; join curl stdout with `(...) -join "\`n"`.
- Temp workspace: `C:\Users\Iworld\AppData\Local\Temp\opencode\` (bin shim, dev-server.log, smoke scripts, temp json/cookies).

## 4. Dev server & verification

- Dev server: currently the hide-started `npm run dev` (Start-Process) logging to `C:\Users\Iworld\AppData\Local\Temp\opencode\dev-server.log`; also `.next/dev/logs/next-development.log`. **Restarting it clears in-memory rate-limit buckets** (useful when locked out in dev).
- Standard verification before declaring anything done:
  1. `npm run typecheck` (= `tsc --noEmit` style, exit 0)
  2. `npm run lint` (exit 0, zero warnings)
  3. `npm test` (61 tests pass)
  4. `npm run build` (exit 0)
  5. Render check with curl, e.g.:
     `$st=(& curl.exe -s -o "$tmp\page.html" -w "%{http_code}" "http://localhost:3000/path") -join ""`
- Authed curl: login via `POST /api/auth/login` saving cookies (`-c cookiejar`), then `-b cookiejar`. `sameOrigin()` passes for curl (no Origin mismatch) when the `Origin: http://localhost:3000` header is sent.
- **Agents cannot view images** — for any visual/brand/animation result, ask the human to confirm in the browser.

## 5. Accounts, roles & admin access

Credentials are **never stored in this repository**. `prisma/seed.ts` uses `SEED_ADMIN_PASSWORD` when provided, otherwise generates a strong random password and prints it once to the terminal. Demo teachers/students are **not** seeded by default; `SEED_DEMO_DATA=true` (plus `SEED_DEMO_PASSWORD`) is local-only opt-in.

| Purpose | Email |
|---|---|
| Admin (bootstrap) | value of `SEED_ADMIN_EMAIL` (default `admin@gurulens.lk`) |
| Moderator | `moderator@gurulens.lk` (same password as admin) |

Production currently has exactly these two accounts and **zero teacher profiles**; there are no demo teachers or demo students on the live platform.

- Roles: `student | teacher | moderator | admin`. Admin console `/admin` (moderator too); teacher studio `/studio`; students land on `/feed`.
- **Promote any account**: `npx tsx scripts/set-role.ts <email> [role]` (default role `admin`). Verified 2026-10-18: admin login → `GET /admin` 200.
- Dev DB test artifacts (safe to ignore/delete): `test.student.<ts>`, `browser.test.<ts>`, `final.check.<ts>` @example.com, earlier `smoke.*` users, enrollment codes `GL-SMOKE-*`. Passwords for these throwaway accounts are not recorded here.
- Enrollment codes format: `GL-<handle6>-<1000+i>` (created per teacher; only demo data uses the seed suffix).

## 6. Core systems — rules that bite

- **Auth/proxy**: `src/proxy.ts` only checks the `gl_session` cookie for protected prefixes (`/studio`, `/admin`, `/feed`, ...). It must NOT bounce `/login` or `/register` (stale-cookie redirect loop bug fixed 2026-10-18). Real session validation for the auth pages lives in `src/app/(auth)/layout.tsx` (`getAuth()` → `redirect("/")` if genuinely signed in).
- **Rate limits (in-memory, per IP; dev has one shared "local" bucket)**: register 5/hr, login 15/15min per IP + 8/15min per email, reports 10/day, reviews 6/hr, verification requests 5/day, post/media creations per `src/lib/rate-limit.ts` keys.
- **Ranking** (`src/lib/ranking.ts`): Bayesian-smoothed rating; "5.0 from 2" can never outrank "4.8 from 200". Tests lock this.
- **Reviews**: only students with a redeemed enrollment code for that teacher can review; one per student per teacher; stars 1–5; status flow `published | hidden`.
- **Quiz editing** (`PATCH /api/studio/quizzes/[id]`): requires the FULL body (title, description, questions etc.) — partial bodies wipe fields.
- **Quizzes have `moderationStatus`** (`approved | pending | rejected | hidden`) — public pages must filter.
- **Enrollment-code delete guard**: cannot delete a code that has redemptions.
- **Media keys**: `avatarKey`, `coverKey` etc. point to `storage/` keys; always render via `/api/media/<key>`.
- **Date/purity lint rules**: never call `Date.now()`/`new Date()` directly in component render (react-hooks/purity). Use the helpers `maxDobForMinimumAge()` / `isExpired()` in `src/lib/format.ts` or derived state. Never synchronously setState in an effect body (set-state-in-effect) — derive during render or set inside timers/IO callbacks.
- Status enums: users `active | suspended | pending`; posts/reels `approved | pending | rejected | hidden`; reports `open | resolved | dismissed`.

## 7. Design system & UI conventions

- **Aesthetic**: glassy Apple-like, aurora background, soft blue/violet brand, generous whitespace, subtle motion. Inspired by ap.lk (layout) and nas.com (landing editorial touches).
- **Tokens** (`globals.css` `@theme`): brand 50–900 (`#0094fd` family), ink 50–900 (text), accent only **100/300/500/600/700** (no accent-400 — don't use it), success 100/500/600, warn 100/500/600 (`warn-500 #e8a012`), danger. Radii incl. `rounded-card`; shadows `shadow-lift`, `--shadow-glass`.
- **Fonts**: default `font-sans` = Plus Jakarta Sans (Latin) with Noto Sans Sinhala fallback. **Sinhala styling convention**: wrap Sinhala text with `lang="si"` + `font-si` (Tailwind utility from `--font-si`, Sinhala-first stack) and make it feel intentional: `font-semibold`/`font-bold`, `leading-[1.85]`–`[1.9]`, darker ink (social: brand/accent/ink). Apply to any new Sinhala copy.
- **Glass classes**: `glass`, `glass-strong` (cards/forms), `glass-subtle`. Aurora page bg via `aurora` class. Decorative floating blobs: `animate-float-slow` / `animate-float-slower` on blurred circles (`bg-brand-400/15 blur-3xl` etc.) inside `aria-hidden` `-z-10` layers.
- **Cinematic orbs**: `.orb` + `.orb-brand` / `.orb-accent` (radial gradient blur circles, 60px blur) — use inside `aria-hidden` overflow-hidden containers.
- **Animations**: `animate-fade-up` (entrance), `animate-scale-up`, `animate-slide-left/-right`, `text-shimmer` (gradient text sweep), `.reveal` (scroll-driven fade-up; Chromium-only, reduced-motion safe), `.verified-tick` seal, `.glow-pulse` (blue glow for CTAs), `.float-card` (subtle float), `.gradient-mesh` (animated bg), `.hero-gradient` (moving gradient).
- **Premium cards**: `.card-premium` (white bg, ring, shadow-md, hover lift + shadow-xl + brand ring), `.bento-item` (hover scale 1.02), `.gradient-border` (hover gradient border via ::before).
- **Quote styling**: `.quote-cinematic` adds decorative large opening quote via ::before.
- **Stagger utility**: `.stagger` applies 50ms animation-delay per child (up to 8).
- **Components (key APIs)**:
  - `Icon { name, size, className, strokeWidth }` — unknown names fall back to `help`. There is NO `megaphone`. `star` is pre-filled (`fill="currentColor"`); `star-outline` is the outline. Known set: search, home, compass, star, star-outline, check, x, user, users, play, pause, video, film, bell, sliders, menu, heart, bookmark, share, flag, eye, upload, plus, pencil, trash, logout, shield, shield-check, chart, book, clock, sparkles, filter, external, image, camera, info, alert, location, mail, phone, message, help, globe, lock, key, refresh, more, link, crown, zap, fire, send, volume, mute, copy, download, grid, list, award, target, chevron-down/up/left/right, arrow-right, arrow-left, rotate-ccw, panel-left.
  - `Avatar { name, src, size ("sm"…), className, ring }` — pass `src={key ? `/api/media/${key}` : null}`.
  - `Button`/`LinkButton` variants `primary | secondary | outline | ghost | danger | accent | success`, sizes `xs | sm | md | lg`.
  - `SectionHeader { title: string, subtitle?: ReactNode, action?: ReactNode }` — subtitle accepts JSX (used for styled Sinhala spans).
  - `VerifiedTick { className, title?, live? }` — scalloped gradient seal, white check draw-in, pop/shine; `live` adds breathing glow + looping shine (teacher profile header uses it).
  - `CountUp { value, className?, duration? }` — client component; SSR renders final value, animates 0→value on first view (no sync setState in effect).
  - `StarRating { value, onChange?, size?, readOnly? }` (renders buttons), `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `Modal`, `ConfirmDialog`, `Switch`, `Chip`, `InfoNote`, `Skeleton`, `Spinner`, `Toast`.
- **Landing page** (`src/app/(site)/page.tsx`): floating blobs layer, hero (badge → headline w/ shimmer span → Sinhala subtitle → SearchBar → avatar stack + stats strip → subject chips), stats grid (CountUp), "Two ways in" cards (student brand-gradient + teacher dark-ink w/ `teacherCta`), trust note, top teachers, popular subjects, latest posts, "Loved by students" review wall (real 5-star published reviews, masonry columns), how-it-works w/ ghost numbers, teacher CTA, FAQ (`<details>` accordions). Consts: `POPULAR_SUBJECTS`, `HOW_IT_WORKS`, `FAQS`, `teacherCta` (isEducator → `/studio` else `/register/teacher`).
- **Auth pages**: split-screen shell (`(auth)/layout.tsx`) — sticky brand panel left (badge, shimmer headline, Sinhala sub, CountUp stats, 3 Sinhala bullets, live top-review quote card), form column right (34rem); login/student/teacher cards share the gradient top-bar + icon-chip header pattern; register chooser = two gradient cards mirroring landing. Forms use 2-col field grids (`sm:grid-cols-2`) for password+DOB, class-format+experience, etc.

## 8. Backlog / ideas (not built yet)

- Echo/notifications page is a placeholder; CRM-style "schools" concept untouched.
- Landing extras discussed: testimonials auto-scroll carousel, hero teacher mini-card, dark mode touch.
- FAQ section could get Sinhala translations (questions are English-only today).
- Full-page visual review on the user's ultra-wide monitor (agent can't see images).

## 9. Changelog (newest first)

### 2026-11-20 — Ecosystem Upgrade Phase 4: Campus, Verification Panels & UI Consistency

**UI consistency pass (all new pages rebuilt on the existing design system):**
- Uses `Field/Input/Select/Textarea`, `Stat`, `SectionHeader`, `EmptyState`, `InfoNote`, `.card`, `LinkButton`, `Icon` and `apiFetch`.
- Page shell follows existing pages: `mx-auto w-full max-w-4xl/5xl px-4 pt-8 pb-12 sm:px-6`, `text-2xl font-extrabold tracking-tight`, `text-[13px] text-ink-500`.
- Removed ad-hoc gradient cards/badges/emoji selects that did not match GuruLens.

**Campus (School Edition):**
- `/campus` — schools + institutes hub, live org stats (members/classes/students/channels), admin sees all orgs.
- `/campus/create` — register a school (admin) or institute (teacher); auto slug.
- `/campus/[slug]` — campus profile, team, branches, classes, verification status + request form.
- `POST /api/organizations/[id]/verify` — owner/manager verification request with evidence note.

**Four independent verification workflows:**
1. Teacher verification (`/admin/verification`, existing).
2. Organization verification (`/admin/organizations`, new).
3. Channel verification (`/admin/channels`, new; request from `/channel/[slug]`).
4. Studio/content verification remains in `/studio/verification` (teacher evidence upload).

**Admin additions:**
- `POST /api/admin/organizations/[id]` — in_review / request_info / approve / reject (id = request id), notifies owners.
- `POST /api/admin/channels/[id]` — same actions for channel requests, notifies channel owner/org staff.
- `AdminNav` now has Teachers, Organizations, Channels with pending-count badges.
- `VerificationDecisions` shared client queue component (reason modal + confirm dialog).

**Navigation:** Campus added to header (signed-in) and to teacher/admin user menus.

**Channel posts — polls & reactions:**
- Poll composer (question + 2–6 options, multiple-choice toggle) in `create-post-form.tsx`.
- Poll voting UI with % bars, chosen state and ended state; `POST /api/channels/[slug]/posts/[postId]/vote`.
- Like/unlike with real persistence; `POST /api/channels/[slug]/posts/[postId]/react`.
- Voice message playback via `/api/media/<key>` (recording still pending).

**Verification:** TypeScript pass, ESLint 0 errors, 60/60 tests, Next build pass.

### 2026-11-20 — Ecosystem Upgrade Phase 3: UI Implementation

**New Pages Created:**
- `/channels` - Browse, search, and discover channels with trending section
- `/channels/create` - Create new channel with slug auto-generation
- `/channel/[slug]` - Full channel view with posts, follow, voice messages
- `/classhub` - Teacher dashboard with stats, classes, upcoming sessions
- `/classhub/create` - Create class form with subject/grade/mode selection
- `/classpulse` - Virtual device dashboard with simulation notice
- `/classpulse/simulator` - Interactive card scan simulator interface
- `/dashboard/student` - Student portal with enrollments and attendance
- `/guardian` - Parent portal to monitor children's progress
- `/pricing` - Subscription plans display (Free, Pro, Institute, Campus)

**Navigation Updates:**
- Added "Channels" to main navigation bar
- Added ClassHub, My Channels, ClassPulse to teacher dropdown menu

**Key UI Features:**
- 3-channel limit indicator for free users
- Channel posts with pinned/urgent badges
- Voice message placeholders with waveform UI
- Poll voting interface
- Follow/unfollow button with state management
- Attendance rate color-coded visualization
- Pending assignment warnings for students and guardians
- Child linking interface for guardians

**Deployment:**
- Worker version: `b99bebfa-f636-437c-9fb3-664be50579ea`
- Commit: `808c792`

### 2026-11-20 — Ecosystem Upgrade Phase 2: Core APIs Implementation

**New Core Service Libraries:**
- `src/lib/channels.ts` - Channel management with 3-channel limit enforcement for free users
- `src/lib/classhub.ts` - Class management, enrollments, sessions, attendance, assignments
- `src/lib/classpulse.ts` - Virtual device management and attendance simulation
- `src/lib/organizations.ts` - Institute/school creation and member management
- `src/lib/guardians.ts` - Parent-student linking and monitoring
- `src/lib/subscriptions.ts` - Plan management and feature entitlements
- `src/lib/roles.ts` - Multi-role permission system with workspace access control

**New API Routes:**
- `/api/channels` - CRUD, search, trending channels
- `/api/channels/[slug]/posts` - Channel posts, voice messages, polls
- `/api/channels/[slug]/follow` - Follow/unfollow channels
- `/api/classes` - Teacher class management
- `/api/classes/[id]/enrollments` - Student enrollment
- `/api/classes/[id]/sessions` - Class sessions
- `/api/classes/[id]/sessions/[sessionId]/attendance` - Attendance tracking
- `/api/classpulse/devices` - Virtual device management
- `/api/classpulse/simulate` - Card scan and bulk attendance simulation
- `/api/organizations` - Institute/school management
- `/api/subscriptions` - Plans and user subscriptions
- `/api/guardian` - Parent-child linking and monitoring

**Features Implemented:**
- 3-channel limit for free teachers (server-enforced)
- Voice messages with waveform visualization
- Poll creation and voting
- Bulk attendance simulation for ClassPulse
- Virtual student card generation
- Multi-role permission checking
- Parent dashboard with child monitoring

**Deployment:**
- Worker version: `150d86de-1443-416a-a242-3d0978080811`
- All 60 tests passing
- TypeScript, Next.js, and Cloudflare builds verified

### 2026-11-20 — Ecosystem Upgrade Phase 1: Schema Extension

**Database Migration:**
- Switched to NEW Neon project **`ancient-hall-97118808`** (org `org-divine-base-49419417`, branch `production`).
- Old database `cold-haze-56644745` backed up to `.env.backup-cold-haze` and `.neon.backup-cold-haze`.
- Cleaned all demo data (24 demo users deleted), keeping only admin + moderator accounts.
- Applied migration `20261120163810_ecosystem_upgrade` adding **26 new tables**:
  - **Organizations**: `Organization`, `OrganizationBranch`, `OrganizationMember`, `OrganizationVerificationRequest`
  - **Channels**: `Channel`, `ChannelFollow`, `ChannelPost`, `ChannelReaction`, `ChannelVerificationRequest`, `VoiceMessage`, `Poll`, `PollVote`
  - **ClassHub**: `Class`, `ClassEnrollment`, `ClassSession`, `Attendance`, `Assignment`, `Submission`
  - **Guardian**: `Guardian`, `GuardianStudent`
  - **Subscriptions**: `Plan`, `UserSubscription`, `FeatureEntitlement`
  - **ClassPulse**: `VirtualDevice`, `DeviceEvent`, `StudentCard`
- Final schema: **60 tables, 163 indexes, 76 foreign keys**.

**Subscription Plans Seeded:**
- GuruLens Free (3 channels, 5 classes, 500 MB)
- GuruLens Teacher Pro (10 channels, 20 classes, 5 GB)
- GuruLens Institute (25 channels, 50 classes, 20 GB, 10 teachers)
- GuruLens Institute Plus (100 channels, 200 classes, 100 GB, 50 teachers, 10 branches)
- GuruLens Campus Pilot (50 channels, 100 classes, 50 GB, 500 students)
- GuruLens Campus Pro (unlimited, 500 GB)

**Configuration Updated:**
- `neon.ts` simplified to declare only Object Storage bucket `assets` (auth/aiGateway/realtime removed - not used).
- `prisma/seed-plans.ts` created for subscription plan seeding.
- `DIRECT_URL` fixed to point to new database (was incorrectly pointing to old project).

**Builds Verified:**
- TypeScript check: ✓
- Tests: 60/60 passing
- Next.js build: ✓
- OpenNext Cloudflare build: ✓

**Documentation:**
- Created `docs/AUDIT_AND_UPGRADE_PLAN.md` with comprehensive feature requirements and implementation phases.

**Remaining Work (from AUDIT_AND_UPGRADE_PLAN.md):**
- Phase 2: Multi-role & organization system APIs
- Phase 3: Channel system implementation with 3-channel limit enforcement
- Phase 4-6: ClassHub, Institute, Campus features
- Phase 7: ClassPulse simulator
- Phase 8: Subscription enforcement
- Phase 9+: Reels upgrade, Admin extensions, testing, deployment

### 2026-11-19 — Live on Neon + Cloudflare, demo data removed
- Linked Neon project **`cold-haze-56644745`** (org `org-divine-base-49419417`, branch `production`, database `neondb`) with `neon init`; `neon deploy` provisioned the declared services and pulled 15 env vars. Object Storage bucket **`assets`** and Functions `hello` are deployed; Neon Auth, AI Gateway and Realtime are provisioned but **not wired** (the app keeps its own DB-backed auth and has no AI/realtime features).
- Applied `0001_init` to the new DB and seeded it: **34 tables, 85 indexes, 40 FKs**, 22 subjects, 25 districts, 11 grades, 3 languages, 4 badges, **2 users (admin + moderator), 0 teacher profiles, 0 demo accounts**.
- `prisma/seed.ts` now treats demo teachers/students/posts as opt-in (`SEED_DEMO_DATA=true`); the default path creates only reference data, badges and the admin/moderator. Production `.env` sets `SEED_DEMO_DATA=false`.
- Runtime DB transport settled on a hybrid `@prisma/adapter-neon` client: **HTTP** for ordinary queries, a short-lived **WebSocket pool per transaction** (`src/lib/db-adapter.ts`). The earlier `React.cache` + module-level WebSocket pool produced `cross-request-pipeline` / "promise created by a request that has since ended" errors under load; HTTP has no socket to carry across requests. `pg`/`pg-cloudflare` TCP hangs on Workers, so it is not used by the app.
- Media moved to **Neon Object Storage** (S3 API, bucket `assets`, private) with R2 still supported as a fallback in `src/lib/media.ts`. Presigned PUT + CORS verified from `https://gurulens.us`; unsigned GET returns 403; `/api/media/[id]` still enforces visibility.
- Rotated Worker secrets (`DATABASE_URL`, `AWS_*`, `MEDIA_BUCKET`) and deployed version **`74c3a5bc-3e95-468d-adc4-a3833ced30ad`** to `gurulens.us` (OpenNext, 10.9 MB raw / 2.70 MB gzip).
- Verification exposed two production-only defects, both fixed in final version **`77bb1aa5-4786-4d1b-a5cb-ea4b4cb06835`**: Neon rejects `HEAD` on private objects (replaced with a ranged-GET metadata fallback in `src/lib/media.ts`), and Cloudflare cancelled requests that reused a WebSocket-backed Prisma client across requests (replaced with the hybrid HTTP/WebSocket adapter in `src/lib/db-adapter.ts`).
- Added `www.gurulens.us` → apex **308** redirect via a dedicated Worker `gurulens-www` and route `www.gurulens.us/*`; DNS was already proxied, so no DNS change was needed.
- Live smoke test on the final version: **38/38 passed** — public routes, anonymous redirects, wrong-password 401, admin login + all five admin pages, student registration, dashboard/settings/explore/notifications/saved, avatar upload + fetch through Neon storage, re-login persistence, demo-name absence, DB assertions, cleanup. Presigned upload → PUT → complete → public fetch was re-verified separately, as were five home/explore rounds and three admin login/logout cycles.
- Remaining platform risks: Workers **Free plan 10 ms CPU** is still tight headroom for bcrypt and heavy SSR, though the final hybrid transport did not reproduce the earlier `503`/`1102`; Workers Builds API `403`; zone DNS/settings API `403` (no DNS edits from CLI); R2 stays disabled and is no longer required.
- Updated `README.md`, `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md`, `docs/PROJECT_STATUS.md`; `neon.ts` and `workers/www-redirect/` added to the repo. Deployed from commit **`74f42ba`** on branch **`feat/cloudflare-neon`**; `main` was not merged.

### 2026-11-16 — Neon + Cloudflare Workers migration (superseded by 2026-11-19)
- Prisma datasource switched from `NETLIFY_DB_URL` to `DATABASE_URL` (pooled) + `DIRECT_URL` (direct), generator set to `engineType = "client"` with `@prisma/adapter-pg`. Native Prisma engine removed so the client can run in Workers.
- `src/lib/db.ts` is now a lazy proxy around a driver-adapter client; imports no longer require `DATABASE_URL` at build time.
- Baseline migration generated at `prisma/migrations/0001_init` (final: 34 tables, 85 indexes) + `migration_lock.toml`. Old `netlify/database/migrations/*.sql` are historical and are not applied to Neon.
- Media moved from Netlify Blobs to Cloudflare R2 (S3 API via `aws4fetch`). Public media 302-redirects to `MEDIA_PUBLIC_URL`; private docs stay behind the auth check. New presigned flow `/api/upload/presign` → browser PUT → `/api/upload/complete` keeps the 200 MB video limit despite the Workers 100 MB body limit.
- Added `@opennextjs/cloudflare` + `wrangler.jsonc` + `open-next.config.ts`; `next` upgraded to 16.4.6 (OpenNext minimum 16.4.5). Scripts: `cf:build`, `cf:preview`, `cf:deploy`.
- Sitemap is now `force-dynamic` so new teachers appear without a rebuild.
- Security: removed hardcoded admin/demo passwords from `prisma/seed.ts` and this file. Seed now generates random passwords and prints them once.
- Docs: `.env.example`, `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md`, `docs/PROJECT_STATUS.md`, README stack/deploy section.
- Verified: typecheck, lint, 60 tests, Next build, OpenNext build, `wrangler deploy --dry-run` (2.65 MB gzip). Not verified: Neon connection/seed, R2 round-trip, Cloudflare deploy, DNS — see `docs/PROJECT_STATUS.md`.

### 2026-11-04 — WhatsApp Channel promo pop-up
- `src/components/layout/WhatsAppChannelPopup.tsx` (client), mounted in `(site)/layout.tsx`: shows `public/promo/whatsapp-channel.jpg` 1.5s after load, once per browser session (`sessionStorage` key `gl_wa_popup_seen`). Brand-gradient "Join Channel" button → `https://chat.whatsapp.com/Fe8Z0LIzB779B0PaB9hVQl`. Closes via X, backdrop, Esc or "Maybe later". To change the link/image edit `CHANNEL_URL` / the image file.

### 2026-11-04 — SEO: rank for "GuruLens" on Google
- New `src/lib/site.ts` (`SITE_URL`, `jsonLd()`): canonical URL = `NEXT_PUBLIC_SITE_URL` → `https://gurulens.us` on Netlify/production → localhost in dev. Previously sitemap/robots/metadataBase pointed at `http://localhost:3000` in production because the env var was unset.
- Home page: own title/description with brand + domain, canonical `/`, JSON-LD Organization + WebSite (with SearchAction → `/explore?q=`). Canonicals added to explore/about/reels/legal/teacher pages.
- Root metadata: brand keyword variants, robots/googleBot directives, `en_LK` OG locale, optional `GOOGLE_SITE_VERIFICATION` env → google-site-verification meta.
- Sitemap no longer lists login-only/disallowed pages (`/feed`, `/register/*`); robots disallows `/feed`.
- Manual follow-up: verify gurulens.us in Google Search Console and submit `https://gurulens.us/sitemap.xml`.

### 2026-11-04 — Admin account on the live database (historical, Netlify era)
- Migration `20261104200000_create_admin_account.sql` created `admin@gurulens.lk` on the old Netlify database. It is **not** applied to Neon.
- The Neon baseline (`prisma/migrations/0001_init`) contains schema only. The admin account is created by `prisma/seed.ts` with a generated password printed once — no credentials live in the repo.

### 2026-11-04 — Fixed production outage on Netlify (every page returned 500)
- Cause: Prisma was configured for SQLite with `DATABASE_URL`, which doesn't exist on Netlify (`PrismaClientInitializationError: Environment variable not found: DATABASE_URL`). Local `storage/` uploads also can't persist on serverless.
- Switched Prisma to Postgres on Netlify Database (`NETLIFY_DB_URL`), added `rhel-openssl-3.0.x` binary target, `prisma generate` in `build` + `postinstall`.
- Added migrations `netlify/database/migrations/20261104193000_create_initial_schema.sql` (full schema) and `20261104193100_seed_reference_data.sql` (languages, subjects, districts, grades, badges, settings). Validated with PGlite.
- Uploads/media moved to Netlify Blobs (`@netlify/blobs`); `/api/media/[id]` reads from Blobs (range requests still supported).
- Search queries made case-insensitive; `storagePath` now treats `\` as a separator on Linux (fixed failing traversal test).
- Production DB starts empty apart from reference data: no demo teachers/admin. Register an account, then promote it to admin (see §5).
- `.netlify/**` added to eslint ignores. Verified: typecheck, eslint (src/tests), 61 tests green.

### 2026-10-25 — Fixed Auth Pages + Site-wide Floating Decorations
- **Auth pages completely redesigned** to fix text visibility issues:
  - Removed heavy 3D FloatingObjects component that was overlapping content
  - New simple gradient background (`bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20`)
  - Corner blur decorations only (no overlap with content area)
  - Subtle emoji decorations in far corners only (📚🎓💡🍎), hidden on mobile, very low opacity (20%)
  - Grid pattern at 1.5% opacity for subtle texture
  - All form cards now use solid white background (`bg-white`) with shadows instead of glass
  - Removed `glow-pulse` from buttons that could cause visibility issues
- **New `FloatingDecorations` component** (`src/components/ui/floating-decorations.tsx`):
  - Emoji-based, positioned in far corners only
  - Three variants: `default`, `brand`, `dark`
  - Very low opacity (8-15%) to avoid content interference
  - Hidden on mobile by default
  - Added to landing page, explore page, feed page
- **Removed old FloatingObjects** from auth pages (the complex 3D CSS objects)
- Verified: typecheck/lint/build green, 61 tests passing.

### 2026-10-25 — Facebook-style Reels + 3D Auth Pages
- **Reels page complete rewrite** (`src/app/(site)/reels/page.tsx` + `src/components/reel/ReelViewer.tsx`):
  - Full-screen vertical scroll experience like Facebook/TikTok
  - Snap scrolling between reels with `scroll-snap-type: y mandatory`
  - Auto-play current video, pause others when scrolling
  - Keyboard navigation (Arrow keys, j/k)
  - Side action buttons: Like (with optimistic update), Comment link, Save, Share (Web Share API), Mute toggle
  - Progress bar at top showing video position
  - Teacher info overlay at bottom (avatar, name, verified tick, handle, follow button)
  - Gradient overlays for text readability
  - Navigation dots on desktop
  - Back button overlay to return home
- **3D Floating Objects** (`src/components/ui/floating-objects.tsx`):
  - CSS 3D transforms with perspective for depth
  - Education-themed objects: Book, Graduation Cap, Pencil, Lightbulb, Apple, Globe, Calculator, Notebook
  - `animate-float-3d` / `animate-float-3d-reverse` animations with rotation
  - Objects positioned on far edges only (left 1-3%, right 97-99%) to avoid overlapping content
  - Hidden on mobile, progressively shown on lg/xl/2xl screens
  - Reduced opacity (60-70%) so they don't distract
  - Decorative stars on edges only (lg+ screens)
- **Auth pages redesign** (`src/app/(auth)/layout.tsx`, `LoginForm.tsx`, `register/page.tsx`):
  - Glass backdrop wrapper around form area (`bg-white/40 backdrop-blur-xl`)
  - Premium card styling with gradient top accent, corner glow
  - Sinhala subtitle in gradient box
  - Divider with "New to GuruLens?" text
  - Register chooser: header card with emoji, two gradient option cards
- **New CSS animations** (`globals.css`): `animate-float-3d`, `animate-float-3d-reverse`, `animate-spin-slow`, `animate-pulse-slow`, `animate-pulse-glow`, `.auth-gradient-bg`, `.auth-card-premium`
- Verified: typecheck/lint/build green, 61 tests passing.

### 2026-10-25 — Cinematic redesign (premium visual overhaul)
- **New CSS animations** (`globals.css`): `gradient-mesh` (animated organic gradients), `hero-gradient` (moving gradient for CTAs), `glow-pulse` (blue glow animation), `gradient-border` (hover gradient border effect), `card-premium` (depth + hover lift), `float-card` (subtle card float), `.stagger` (child delay helper), `animate-scale-up`, `animate-slide-left/-right`, `.bento-item` (hover scale), `.quote-cinematic` (large decorative quote), `.orb`/`.orb-brand`/`.orb-accent` (blur orb decorations).
- **Landing page complete rewrite** (`src/app/(site)/page.tsx`):
  - Full-viewport hero (92vh) with cinematic orbs, dot-pattern overlay, giant typography (clamp 2.5rem→5.5rem), animated underline SVG, text-shimmer headline
  - Badge chip + Sinhala subtitle + SearchBar with subtle glow
  - Large stat counters (CountUp 3xl–4xl) + avatar stack social proof
  - **Bento grid features section**: mixed-size cards with `card-premium` class, icons with gradients, hover effects
  - **Two paths cards** (student + teacher): 2rem border-radius, dramatic gradients, `glow-pulse` CTA buttons, hover scale transform
  - Top teachers grid with staggered fade-up
  - **How it works**: step cards with 120px watermark numbers, icon hover scale
  - **Testimonials wall**: masonry columns, `quote-cinematic` styling, fade-up stagger
  - Popular subjects: gradient icon hover effect
  - **Final CTA**: dramatic gradient section with dual buttons
  - FAQ: enhanced details cards with shadows
- **TeacherCard enhancement** (`src/components/teacher/TeacherCard.tsx`): gradient overlay on hover, ring transition, deeper shadows
- **Explore page** (`src/app/(site)/explore/page.tsx`): cinematic orbs (`.orb`), larger header (3xl–4xl), staggered card animations, gradient info note
- **Feed page** (`src/app/(site)/feed/page.tsx`): cinematic orbs, larger header, modern tab bar with ring/shadow
- Verified: typecheck/lint/build green, 61 tests passing.

### 2026-10-18 — Full visual polish pass (site-wide)
- Polished all main pages with consistent floating blobs, font-si Sinhala typography, gradient accents, fade-up/reveal animations:
  - `/explore`: blobs, Sinhala subtitle, staggered animations, reveal on cards
  - `/feed`: blobs, Sinhala subtitle, glass tab bar with gradient active state, reveal on posts
  - `/teacher/[handle]`: blobs, fade-up on cover/header, font-si on Sinhala nameSi, reveal on content
  - `/post/[id]`: blobs, fade-up on card and comments
  - `/reels`: blobs, font-si, icon shadow, reveal on grid
  - `/quiz/[id]`: blobs, fade-up animations
  - `/studio` layout: blobs, Sinhala subtitle, reveal on children
  - `/admin` layout: ink-toned blobs, Sinhala subtitle, reveal on children
- Verified: typecheck/lint/build/tests green; all routes 200 (307 for auth-protected pages as expected).

### 2026-10-18 — Project memory + admin access
- Created this file (`PROJECT_MEMORY.md`) and wired `AGENTS.md` to it (read-first, update-after rule).
- Added `scripts/set-role.ts` (`npx tsx scripts/set-role.ts <email> [student|teacher|moderator|admin]`) to promote accounts locally. Verified with seeded admin (login OK, `/admin` 200).

### 2026-10-18 — Auth pages redesign (split-screen) + desktop fixes
- `(auth)/layout.tsx`: rewrote as split-screen — full-width aurora + big floating blobs, sticky left brand showcase (live stats via CountUp, Sinhala bullets, real top-review quote), right form column (34rem). Grid is `items-start` (was `items-center` — brand panel floated mid-page beside the long teacher form making desktop look broken; user screenshot reported).
- `LoginForm`: gradient top bar, icon-chip header, Sinhala subtitle.
- `register/page.tsx`: chooser rebuilt as two gradient cards (student brand / teacher dark-ink) + "Already have an account? Sign in" link added.
- `StudentForm` + `TeacherForm`: new headers w/ icon chips + Sinhala subtitles; password+DOB now 2-col (`sm:grid-cols-2`); teacher section headings got gradient tick marks.
- `login/page.tsx` skeleton updated to match card layout.
- Verified: typecheck/lint/build green, all 4 auth routes 200.

### 2026-10-18 — Sinhala typography pass (landing)
- `globals.css`: added `--font-si` theme var → `font-si` utility (Noto Sans Sinhala first, then Jakarta).
- `SectionHeader.subtitle` type widened `string → ReactNode` (so styled Sinhala spans can be passed).
- Landing page: all Sinhala text now `lang="si"` + `font-si`, bold/semibold, `leading-[1.85–1.9]`, darker ink; hero subtitle split into bold lead + body; subject cards show `nameSi` styled.

### 2026-10-18 — Landing polish pass 2 ("lassanata")
- `globals.css`: `float-y` keyframes + `.animate-float-slow/-slower`, `.text-shimmer` + `shimmer-pan`, scroll-driven `.reveal` (Chromium-only, reduced-motion safe).
- New `src/components/ui/count-up.tsx`.
- `src/lib/data.ts`: added `getTopReviews(limit=6)` (published 5-star reviews, author/teacher selects, public teachers only).
- `(site)/page.tsx`: root `relative isolate` + floating glow layer; hero avatar stack + reviews/districts strip; shimmer headline; CountUp stats; "Loved by students" review wall; ghost numbers on how-it-works; `reveal` on sections.

### 2026-10-18 — Landing pass 1 (nas.com inspiration)
- Dual "Two ways in" cards (student brand-gradient / teacher dark-ink w/ smart `teacherCta`), FAQ section (5 `<details>` items) below teacher CTA. Verified render/lint/typecheck/build.

### 2026-10-18 — Verified badge redesign
- `VerifiedTick` (primitives): scalloped seal via CSS mask, teal→blue gradient, white check draw-in, pop + shine animations; new `live` prop (breathing glow + looping shine) used on teacher profile header. CSS: `.verified-tick`, `.vt-seal`, `.vt-shine`, `.vt-check`, `.verified-tick-live` + vt-* keyframes. All 8 usage sites updated automatically via the component.

### 2026-10-18 — Login/register bounce bug (stale cookie)
- Root cause: `src/proxy.ts` redirected `/login` + `/register` to `/` whenever ANY `gl_session` cookie existed (even invalid). Fix: removed AUTH_PAGES bounce + those matcher entries; added real `getAuth()` validation in `(auth)/layout.tsx`. Verified: stale cookie → /login,/register 200; valid session → 307→/; fresh register → /feed.

### 2026-10-18 — Lint hygiene + test suite + hardening
- Fixed 5 eslint errors + 8 warnings (react-hooks/purity → `maxDobForMinimumAge`/`isExpired` helpers in format.ts; set-state-in-effect → derived state in TeacherForm/SearchBar; ChipGroup `max` prop removed; unused disables/imports cleaned).
- Vitest added: `vitest.config.ts` + 6 suites / 61 tests (ranking, format, totp w/ RFC 6238 vectors, rate-limit, validation, media) — all passing.
- Hardening: `robots.ts` (Disallow /admin), `sitemap.ts` (static + teacher handles), custom `not-found.tsx`, `StaticPage` component + pages `/about` (anchors #verification #ranking), `/guidelines`, `/privacy`, `/terms`, `/support`. Smoke-verified.

### Earlier phases (pre-memory — all smoke-verified)
- Phase 0–4: scaffold, Prisma schema + seed, core libs, auth (sessions/CSRF/TOTP/rate-limit), media pipeline.
- Phase 5–8: UI kit, site pages (explore/teacher profile/feed/posts/reels/quizzes), Content APIs.
- Phase 9: Teacher Studio + smoke10 (create flow, uploads, quizzes, verification request, enrollment codes).
- Phase 11: Admin console + smoke11 (users, moderation queue, reports, verification review, subjects/audit).

---

## 10. Session checklist (copy for every session)

1. Start: read this file + `AGENTS.md`. Confirm dev server is up (`curl http://localhost:3000` → 200), else start it.
2. Work: follow §3 environment rules; keep code conventions from §7; verify with §4 commands.
3. End: update §9 Changelog (what/where/how-verified), adjust any affected section above, and mention anything awaiting human visual confirmation.
