# Environment Variables

GuruLens runs on **Cloudflare Workers** with **Neon PostgreSQL** and **Cloudflare R2**.
Never commit real values. `.env*` is gitignored except `.env.example`.

## Where each value lives

| Environment | File / place | Notes |
|---|---|---|
| Local development | `.env` (repo root) | Prisma CLI reads `.env` only — not `.env.local` |
| Local override | `.env.local` | Optional; Next.js gives it priority |
| Cloudflare production | Workers **Settings → Variables and Secrets** | Mark everything secret except `NEXT_PUBLIC_SITE_URL` |

## Variables

### Database (required)

| Name | Description |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (`...-pooler...`). Used by the app at runtime and by local scripts. |
| `DIRECT_URL` | Neon **direct** connection string (no `-pooler`). Used only by `prisma migrate` / `prisma db push` / seed. |

Get both from Neon Console → project `ancient-hall-97118808` → **Connect**.

### Application (required)

| Name | Description |
|---|---|
| `SESSION_SECRET` | 32+ byte random secret for signed sessions/CSRF. Generate: `openssl rand -base64 48` |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, no trailing slash. Production: `https://gurulens.us` |

`NEXT_PUBLIC_*` values are inlined into the client bundle **at build time**. Set it in the Workers build environment as well as at runtime.

### Media storage — Cloudflare R2 (required for uploads)

| Name | Description |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key (Object Read & Write) |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | Bucket name, e.g. `gurulens-media` |
| `MEDIA_PUBLIC_URL` | Public bucket domain, e.g. `https://media.gurulens.us` |

Without these, uploads fail with a clear "Media storage is not configured" error. Media is never required for read-only browsing.

### Seed-only (optional)

| Name | Description |
|---|---|
| `SEED_ADMIN_EMAIL` | Bootstrap admin email (default `admin@gurulens.lk`) |
| `SEED_ADMIN_PASSWORD` | If omitted, a random password is generated and printed once |
| `SEED_DEMO_PASSWORD` | If omitted, a random password is generated and printed once |

`SEED_*` values are **not** needed in production. Seed against a fresh database only.

### Optional

| Name | Description |
|---|---|
| `GOOGLE_SITE_VERIFICATION` | Search Console verification meta tag |

## Security rules

1. No credential is ever committed. The seed prints generated passwords once — store them in a password manager.
2. Never expose `DATABASE_URL`, `R2_SECRET_ACCESS_KEY` or `SESSION_SECRET` with a `NEXT_PUBLIC_` prefix.
3. Rotate `SESSION_SECRET` to invalidate every session.
4. Rotate R2 keys from the Cloudflare dashboard if a key is exposed.
5. The old Netlify admin SQL migration is **not** applied to Neon; its hardcoded hash must not be reused.
