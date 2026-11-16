# Deployment — Cloudflare Workers + Neon + R2

This document describes the current release target: the existing GuruLens
Next.js app deployed to **Cloudflare Workers** through the **OpenNext adapter**,
backed by **Neon PostgreSQL** and **Cloudflare R2** for media.

> Netlify is no longer the target. The old Netlify database and blob files are
> left untouched; nothing here deletes them.

## 1. Architecture

```
GitHub: idavingx-commits/Gurulens
        │ push to main
        ▼
Cloudflare Workers Builds  (Linux, npm ci → opennextjs-cloudflare build → deploy)
        │
        ├── Neon PostgreSQL  (DATABASE_URL / DIRECT_URL)
        └── Cloudflare R2    (S3 API + media.gurulens.us)
```

## 2. Prerequisites

- Neon project `ancient-hall-97118808` (org `org-divine-base-49419417`)
- Cloudflare account with:
  - Workers enabled
  - R2 enabled (a payment method is required even for the free allowance)
  - DNS zone for `gurulens.us`
- Registrar access to change nameservers (if the domain is not already on Cloudflare)

## 3. Database setup (one time, from your machine)

1. Put the Neon pooled + direct URLs in `.env` (see `docs/ENVIRONMENT.md`).
2. Install dependencies:

```bash
npm ci
```

3. Apply the baseline migration **to Neon only**:

```bash
npm run db:migrate:deploy
```

4. Seed reference data, the bootstrap admin and fictional demo accounts:

```bash
npm run db:seed
```

The seed prints generated passwords **once**. Save them immediately.

5. Verify:

```bash
npx prisma migrate status
```

Expected: 33 tables, 51 indexes, migration `0001_init` applied.

> The old `netlify/database/migrations/*.sql` files are historical and are not
> applied to Neon.

## 4. R2 setup

1. Create bucket `gurulens-media`.
2. Create an R2 API token with **Object Read & Write** for that bucket.
3. Add the public custom domain `media.gurulens.us` to the bucket.
4. Configure CORS so the browser can PUT presigned uploads:

```json
[
  {
    "AllowedOrigins": ["https://gurulens.us", "https://www.gurulens.us", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

Without this CORS rule, large video uploads fail in the browser even though the
signed URL is valid.

## 5. Cloudflare Worker project

Create the Worker from the Cloudflare dashboard: **Workers & Pages → Create → Connect to Git**, select `idavingx-commits/Gurulens`.

Use exactly these commands (the defaults shown by the wizard are wrong for OpenNext):

| Field | Value |
|---|---|
| Project name | `gurulens` |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Preview command | `npx opennextjs-cloudflare preview` |

Then add the environment variables from `docs/ENVIRONMENT.md` under
**Settings → Variables and Secrets** (production and preview) before the first
deploy. `NEXT_PUBLIC_SITE_URL` must exist at build time.

`wrangler.jsonc` already sets:
- `main: .open-next/worker.js`
- `compatibility_flags: ["nodejs_compat", "nodejs_compat_populate_process_env"]`
- `assets` binding for static files

## 6. Custom domains

1. Add `gurulens.us` and `www.gurulens.us` as **Custom Domains** on the Worker.
2. If the domain is registered elsewhere:
   - Create the zone in Cloudflare first and copy the existing DNS records.
   - Change the nameservers at the registrar to the pair Cloudflare provides.
   - Keep the old host live until the new deployment has been verified.
3. Keep `https://gurulens.us` canonical and redirect `www` → apex with a
   Cloudflare Redirect Rule (301). `src/lib/site.ts` and `NEXT_PUBLIC_SITE_URL`
   must agree.

## 7. Verification checklist

- [ ] `https://gurulens.us/` loads
- [ ] `https://www.gurulens.us/` redirects to apex
- [ ] `/login` works with a seeded account
- [ ] Session persists after a refresh and across Worker restarts
- [ ] Teacher registration + profile update persists
- [ ] Avatar upload → file readable via `/api/media/<id>`
- [ ] Large video upload (direct-to-R2) reaches 100%
- [ ] Feed, explore, reels, quiz, admin routes render
- [ ] Student cannot open `/admin`; non-owner cannot read a private document
- [ ] `sitemap.xml` includes teacher profiles
- [ ] Worker logs show no `Error 1102` (CPU limit) for auth routes

## 8. Known limits and risks

- **Cloudflare Workers Free plan** allows 10 ms CPU per request. bcrypt hashing
  (11 rounds) and full SSR can exceed that. If login/registration fails with a
  CPU error, the project needs **Workers Paid ($5/month)**. Do not lower bcrypt
  rounds to work around it.
- **Worker body limit** is 100 MB; videos use presigned direct-to-R2 uploads, so
  the 200 MB product limit still works.
- **Worker memory** is 128 MB. Never buffer a large video in the Worker.
- **Builds run on Linux.** A Windows-only symlink limitation in OpenNext does
  not affect Cloudflare builds.
- The custom-domain cutover changes nameservers. Plan it, and keep the previous
  host live until verification passes.

## 9. Rollback

- Code: revert the deployment in Cloudflare (Workers → Deployments → rollback)
  or revert the git commit and redeploy.
- Database: Neon keeps 6 hours of instant restore history and one manual
  snapshot on the free plan. Take a snapshot before destructive migrations.
- DNS: revert nameservers at the registrar — propagation may take time.
