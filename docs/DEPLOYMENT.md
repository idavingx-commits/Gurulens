# Deployment — Cloudflare Workers + Neon

This document describes the current production setup: the existing GuruLens
Next.js app deployed to **Cloudflare Workers** through the **OpenNext adapter**,
backed by **Neon PostgreSQL** and **Neon Object Storage**.

> Live: **https://gurulens.us** (apex canonical). `https://www.gurulens.us/*`
> 308-redirects to the apex. Netlify is no longer the target; its old database
> and blob files are left untouched.

## 1. Architecture

```
Local machine (Windows)
  npm run cf:build  ->  npx wrangler deploy
        │
        ▼
Cloudflare Worker "gurulens"  (custom domain gurulens.us)
        │
        ├── Neon PostgreSQL      project cold-haze-56644745 / production / neondb
        │                        DATABASE_URL (pooled), DIRECT_URL (direct)
        └── Neon Object Storage  bucket "assets" (private, S3 API)

Cloudflare Worker "gurulens-www"  (route www.gurulens.us/*)
        └── 308 redirect to https://gurulens.us + same path/query
```

The Prisma driver adapter in `src/lib/db-adapter.ts` sends ordinary queries
over Neon's **stateless HTTP** driver. Transactions open a **short-lived
WebSocket** pool that is closed in `commit`/`rollback`. Do not replace this
with a module-level WebSocket pool: Cloudflare Workers reject I/O objects that
cross request boundaries.

## 2. Prerequisites

- Neon project **`cold-haze-56644745`** (org `org-divine-base-49419417`,
  branch `production`); `neon` CLI authenticated.
- Cloudflare account with Workers enabled and the `gurulens.us` zone active.
- Node.js 20+, npm, and Wrangler authenticated (`npx wrangler whoami`).

No R2 subscription is required; media uses Neon Object Storage.

## 3. Neon services (one time, from the repo root)

```bash
neon init -y --org-id org-divine-base-49419417 \
  --project-id cold-haze-56644745 --branch production \
  --services postgres --services auth --services ai-gateway \
  --services object-storage --services functions --services realtime

neon deploy
```

`neon deploy` applies `neon.ts` (private bucket `assets`, `hello` function),
then pulls the branch environment into `.env`:

- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`
- `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `NEON_AUTH_*`, `NEON_AI_GATEWAY_*`, `NEON_REALTIME_*`, `NEON_FUNCTION_HOST_SUFFIX`

Set `DIRECT_URL` to the value of `DATABASE_URL_UNPOOLED`, and set
`MEDIA_BUCKET=assets`. Never commit `.env`; `.neon` is gitignored.

## 4. Database setup

```bash
npm ci
npx prisma migrate deploy     # baseline 0001_init
npx prisma db seed            # reference data + admin/moderator only
```

The seed is demo-free by default. Do **not** set `SEED_DEMO_DATA=true` in
production; that path creates fictional teachers, students and posts.

Expected after migration + seed:

- 34 public tables, 85 indexes, 40 foreign keys
- 22 subjects, 25 districts, 11 grades, 3 languages, 4 badges
- 2 users: the bootstrap admin (`SEED_ADMIN_EMAIL`) and the moderator
- **0 teacher profiles and 0 demo accounts**

Verify:

```bash
npx prisma migrate status
npx tsx scripts/set-role.ts <email> [student|teacher|moderator|admin]
```

The old `netlify/database/migrations/*.sql` files are historical and are not
applied to Neon.

## 5. Worker secrets

Production secrets are set with Wrangler, never committed:

| Secret | Source |
|---|---|
| `DATABASE_URL` | Neon pooled URL |
| `SESSION_SECRET` | existing random secret |
| `NEXT_PUBLIC_SITE_URL` | `https://gurulens.us` |
| `AWS_ACCESS_KEY_ID` | `neon deploy` output |
| `AWS_SECRET_ACCESS_KEY` | `neon deploy` output |
| `AWS_ENDPOINT_URL_S3` | `neon deploy` output |
| `AWS_REGION` | `neon deploy` output |
| `MEDIA_BUCKET` | `assets` |

Set them in bulk without printing values:

```bash
npx wrangler versions secret bulk ./secrets.json
npx wrangler deploy            # uploads the current .open-next build
```

A new deploy prints its **Current Version ID**. Record it in the release notes.
`DATABASE_URL_UNPOOLED` / `DIRECT_URL` are only used locally by Prisma; the
Worker needs only the pooled URL.

## 6. Build and deploy

```bash
npm run build          # Next.js build (required check)
npm run cf:build       # OpenNext bundle in .open-next/
npx wrangler deploy    # production version
```

`wrangler.jsonc` sets:

- `main: .open-next/worker.js`
- `compatibility_flags: ["nodejs_compat", "nodejs_compat_populate_process_env"]`
- `assets` binding for static files
- observability enabled

Workers Builds / GitHub auto-deploy is **not** wired: the Cloudflare Workers
Builds API returns `403 Authentication error` for this account. Deploy from a
trusted machine until that access is restored. Do not change the production
branch or build command blindly in the dashboard.

## 7. `www` redirect

The apex `gurulens.us` is a Worker **custom domain**. `www.gurulens.us` is
already proxied through Cloudflare, so no DNS record was changed. A dedicated
tiny Worker owns the `www` route:

```bash
npx wrangler deploy -c workers/www-redirect/wrangler.jsonc
```

`workers/www-redirect/index.js` returns `308` to `https://gurulens.us` while
preserving path and query. Verified: `/` → `https://gurulens.us/`;
`/about?ref=test` → `https://gurulens.us/about?ref=test`.

Do not edit DNS or nameservers for this redirect; the zone's DNS API is not
available to the current token (`403`). Email-related DNS records were not
touched.

## 8. Verification checklist

Verified **2026-11-19** against the live Worker (final version `77bb1aa5`):

- [x] `https://gurulens.us/` loads (`200`)
- [x] `https://www.gurulens.us/` 308-redirects to the apex
- [x] `/login`, `/register`, `/register/student`, `/register/teacher`, `/explore`, `/about`, `/sitemap.xml`, `/robots.txt` return `200`
- [x] Wrong password returns `401`; admin login returns `200`
- [x] `/admin`, `/admin/verification`, `/admin/users`, `/admin/badges`, `/admin/reports` return `200` for an admin
- [x] Anonymous `/admin`, `/studio`, `/dashboard`, `/settings` return `307` to `/login?next=...`
- [x] Student registration returns `200`; `/dashboard`, `/settings`, `/explore`, `/notifications`, `/saved` return `200`
- [x] Session persists across logout/re-login
- [x] Avatar upload → `/api/media/<id>` returns `200 image/png`
- [x] No seeded demo teacher names appear on `/explore`
- [x] Database contains 0 teacher profiles and 0 demo accounts
- [x] Browser-presigned PUT works from `https://gurulens.us`; unsigned GET is `403`

## 9. Known limits and risks

- **Cloudflare Workers Free plan** allows 10 ms CPU per request. Earlier
  WebSocket-backed runs intermittently produced `503` / `error code: 1102` and
  hung requests. The final hybrid HTTP/WebSocket Prisma transport removed the
  cross-request I/O failures, and the final smoke, presign and stress tests all
  passed, but 10 ms is still tight headroom for bcrypt and full SSR. Workers
  Paid ($5/month) is recommended. Do not lower bcrypt rounds.
- **Workers Builds API** returns `403`; GitHub pushes do not auto-deploy.
- **Zone DNS/settings API** returns `403`; DNS changes need dashboard access.
  The `www` route avoids needing one.
- **Worker body limit** is 100 MB; videos use presigned direct-to-storage
  uploads, so the 200 MB product limit still works.
- **Worker memory** is 128 MB. Never buffer a large video in the Worker.
- **AI Gateway** has no model credits; it is provisioned but unused.
- The custom-domain cutover for `gurulens.us` is already done; keep the old
  Netlify site untouched until it is intentionally retired.

## 10. Rollback

- Code: Workers → Deployments → rollback, or redeploy a previous git commit.
- Database: Neon keeps instant-restore history; take a branch/snapshot before
  destructive migrations. Do not run the demo seed in production.
- `www`: remove the `gurulens-www` route or redeploy the previous Worker.
- DNS: no changes were made for this release.
