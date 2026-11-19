# Environment Variables

GuruLens runs on **Cloudflare Workers** with **Neon PostgreSQL** and
**Neon Object Storage** (Cloudflare R2 is still supported as a fallback).
Never commit real values. `.env*` is gitignored except `.env.example`.

## Where each value lives

| Environment | File / place | Notes |
|---|---|---|
| Local development | `.env` (repo root) | Prisma CLI reads `.env` only — not `.env.local` |
| Local override | `.env.local` | Optional; Next.js gives it priority |
| Cloudflare production | Worker **Settings → Variables and Secrets** | Set with Wrangler; see `docs/DEPLOYMENT.md` |

`neon init` / `neon deploy` write the Neon-managed values into `.env` and update
the linked project. Do not hand-edit Neon credentials unless you are rotating
them.

## Database (required)

Neon project **`cold-haze-56644745`**, branch **production**, database
**`neondb`**. The linked org/project/branch is stored in the gitignored
`.neon` file.

| Name | Description |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (`...-pooler...`). Used by the Worker at runtime. |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string, written by the Neon CLI. |
| `DIRECT_URL` | Prisma migration/seed URL. Set this to the same value as `DATABASE_URL_UNPOOLED`. |

```bash
neon link --org-id org-divine-base-49419417 \
  --project-id cold-haze-56644745 --branch production
neon env pull        # refreshes DATABASE_URL + DATABASE_URL_UNPOOLED in .env
```

Keep `DIRECT_URL` equal to `DATABASE_URL_UNPOOLED`; `prisma migrate` must not
run through PgBouncer.

## Application (required)

| Name | Description |
|---|---|
| `SESSION_SECRET` | 32+ byte random secret for signed sessions/CSRF. Generate: `openssl rand -base64 48` |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, no trailing slash. Production: `https://gurulens.us` |
| `MEDIA_BUCKET` | Object-storage bucket name. Production: `assets` |

`NEXT_PUBLIC_*` values are inlined into the client bundle **at build time**. Set
it before `npm run cf:build` as well as at runtime.

## Media storage — Neon Object Storage (default)

These are pulled by `neon deploy` from the branch's object-storage service:

| Name | Description |
|---|---|
| `AWS_ENDPOINT_URL_S3` | Neon branch S3 endpoint |
| `AWS_ACCESS_KEY_ID` | Neon object-storage access key |
| `AWS_SECRET_ACCESS_KEY` | Neon object-storage secret |
| `AWS_REGION` | Branch region (for example `ap-southeast-1`) |
| `MEDIA_BUCKET` | `assets` — the private bucket declared in `neon.ts` |

The bucket is **private**. Uploads use presigned PUT URLs
(`/api/upload/presign`), and `/api/media/[id]` checks visibility before
streaming private objects. Neon storage accepts browser PUTs from
`https://gurulens.us` and rejects unsigned object reads with `403`.
`MEDIA_PUBLIC_URL` is optional; when unset, public media is streamed through
`/api/media/[id]` rather than redirected to a CDN.

### R2 fallback (optional)

If the Neon `AWS_*` variables are absent, `src/lib/media.ts` falls back to
Cloudflare R2:

| Name | Description |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key (Object Read & Write) |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | Bucket name |
| `MEDIA_PUBLIC_URL` | Public bucket domain, e.g. `https://media.gurulens.us` |

R2 is **not required** for the current deployment. Without any storage
configuration, uploads fail with a clear "Media storage is not configured"
error; read-only browsing still works.

## Other Neon services (provisioned, not consumed)

`neon.ts` declares Auth, AI Gateway, Functions and Realtime so the branch is
ready for them, and `neon deploy` writes their variables:

| Name | Status |
|---|---|
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` | Provisioned; the app keeps its own DB-backed auth |
| `NEON_AI_GATEWAY_BASE_URL`, `NEON_AI_GATEWAY_TOKEN` | Provisioned; no AI features call it yet (credits required) |
| `NEON_REALTIME_URL`, `NEON_REALTIME_SECRET` | Provisioned; no live-query features yet |
| `NEON_FUNCTION_HOST_SUFFIX` | Deployed `hello` function health check |

These are not Worker secrets and are not read by the application.

## Seed-only (optional)

| Name | Description |
|---|---|
| `SEED_ADMIN_EMAIL` | Bootstrap admin email (default `admin@gurulens.lk`) |
| `SEED_ADMIN_PASSWORD` | If omitted, a random password is generated and printed once |
| `SEED_DEMO_DATA` | `true` creates fictional teachers/students/posts. **Default `false`** |
| `SEED_DEMO_PASSWORD` | Password for demo accounts; only used when `SEED_DEMO_DATA=true` |

`SEED_*` values are **not** needed in production. Seed against a fresh database
only. Production has the admin and moderator accounts and zero demo teachers.

## Optional

| Name | Description |
|---|---|
| `GOOGLE_SITE_VERIFICATION` | Search Console verification meta tag |

## Security rules

1. No credential is ever committed. The seed prints a generated password once — store it in a password manager.
2. Never expose `DATABASE_URL`, `AWS_SECRET_ACCESS_KEY`, `R2_SECRET_ACCESS_KEY` or `SESSION_SECRET` with a `NEXT_PUBLIC_` prefix.
3. Rotate `SESSION_SECRET` to invalidate every session.
4. Rotate object-storage keys in the Neon console if a key is exposed.
5. The old Netlify admin SQL migration is **not** applied to Neon; its hardcoded hash must not be reused.
