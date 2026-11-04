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
- Local URL: `http://localhost:3000` (dev server currently running — see §4).

## 2. Stack & structure

- **Next.js 16.4.2 (App Router)** — BREAKING CHANGES vs training data. Read `node_modules/next/dist/docs/` before writing code (also enforced by the auto-managed block in `AGENTS.md`).
- React 19, TypeScript (strict), Tailwind v4 (configured via `@theme` in `src/app/globals.css` — no tailwind.config).
- DB: SQLite + Prisma → `prisma/schema.prisma`, dev db `prisma/dev.db`, seed `prisma/seed.ts`.
- Tests: Vitest, config `vitest.config.ts` (node env, `@` → `src` alias), suites in `tests/` (ranking, format, totp, rate-limit, validation, media — 61 tests).
- Auth: DB-backed sessions (httpOnly `gl_session`) + CSRF double-submit (`gl_csrf` cookie ↔ `x-csrf-token` header via `src/lib/client.ts`).
- Media: local filesystem `storage/` served through `/api/media/[key]`; seed assets in `storage/seed/`, brand assets in `public/brand/`.

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

| Purpose | Email | Password |
|---|---|---|
| Admin | `admin@gurulens.lk` | `GuruLens#Admin2026` |
| Moderator | `moderator@gurulens.lk` | `GuruLens#Admin2026` |
| Demo teacher | `anuradha-perera@teachers.gurulens.lk` | `Demo#2026` |
| Demo student | `kavindu.silva@students.gurulens.lk` | `Demo#2026` |

- Roles: `student | teacher | moderator | admin`. Admin console `/admin` (moderator too); teacher studio `/studio`; students land on `/feed`.
- **Promote any account**: `npx tsx scripts/set-role.ts <email> [role]` (default role `admin`). Verified 2026-10-18: admin login → `GET /admin` 200.
- Dev DB test artifacts (safe to ignore/delete): `test.student.<ts>`, `browser.test.<ts>`, `final.check.<ts>` @example.com (password `Test#2026`), earlier `smoke.*` users (`Smoke#123`), enrollment codes `GL-SMOKE-*`.
- Enrollment codes format: `GL-<handle6>-<1000+i>` e.g. `GL-ANURAD-1000` (demo teacher).

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
