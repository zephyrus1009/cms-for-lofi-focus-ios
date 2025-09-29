# Deploying cms-for-lofi-focus-ios to Render + Neon

## Overview

- Render keeps Strapi running as a persistent Node.js service, which is required for the CMS REST/GraphQL APIs the `lofi-focus-ios` app consumes.
- Neon hosts the managed Postgres database. Use the direct connection string for migrations and a pooled PgBouncer string for runtime traffic.
- Cloudflare R2 (fronted by a CDN) stores mentor videos and posters. Strapi uploads files through the S3-compatible API and returns CDN URLs to the app.

## Prerequisites

- Render account with access to this repository.
- Neon account with a project dedicated to the CMS database.
- Cloudflare account with R2 enabled and a custom domain (or Workers route) that fronts the mentor media bucket.
- Local machine with Node.js 20.x, npm (or Yarn), and the Strapi CLI (`npx @strapi/cli`).
- Production secrets: `APP_KEYS`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, Cloudflare R2 keys, and any Render cron secrets you plan to use.

## Step 1 ? Prepare Neon

1. Create a Neon project (e.g. `lofi-focus-cms`) in a region close to your users.
2. Keep the `main` branch for production and create a database such as `strapi`.
3. Add a role (e.g. `strapi_prod`) with a strong password and grant full privileges on the branch/database.
4. Copy both connection strings from the Neon console:
   - **Pooled** (`-pooler` host): use in production runtime.
   - **Direct** (no `-pooler`): use locally for migrations/maintenance.
5. With the direct string saved in your `.env`, run Strapi locally to initialise the schema:
   ```bash
   cd cms-for-lofi-focus-ios
   set -a; source .env; set +a     # loads DATABASE_URL and related secrets
   NODE_ENV=production npm install
   NODE_ENV=production npm run build
   NODE_ENV=production npm run strapi migrations:run   # only if you keep custom migrations
   NODE_ENV=production npm run start                   # ensure the app boots against Neon
   ```
6. After the initial run, stop the server and switch `DATABASE_URL` back to your local dev database so you do not edit production data while coding.

### Ongoing database sync

Whenever content-types change:

```bash
export DATABASE_URL="postgresql://...direct...?sslmode=require"
NODE_ENV=production npm run strapi migrations:run
NODE_ENV=production npm run strapi export --no-encrypt   # optional backup
```

Confirm the API still works (`curl http://localhost:1337/api/mentor-groups?populate=insights`). This keeps Neon aligned before the next deploy.

## Step 2 ? Provision Cloudflare R2 and CDN

1. Create an R2 bucket (e.g. `lofi-focus-mentor`).
2. Generate an API token with **Edit** permission on that bucket.
3. Note the S3 endpoint: `https://<account-id>.r2.cloudflarestorage.com`.
4. Set up a public domain (for example `https://cdn.lofifocus.com`) mapped to the bucket using Cloudflare R2 custom domains or a Worker.
5. Arrange folders so mentors are easy to manage:
   - `mentor/master/mentor_sleep_sensei_master.mp4`
   - `mentor/720/mentor_sleep_sensei_720.mp4`
   - `mentor/poster/mentor_sleep_sensei_poster.png`
6. Store the access key, secret, endpoint, bucket name, and CDN base; you will map them to environment variables in Step 3.

## Step 3 ? Environment variables

Add these locally (`.env`) and in Render > _Environment_.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` (Render) |
| `APP_KEYS` | Comma-separated list of =2 random strings (`openssl rand -base64 32`) |
| `ADMIN_JWT_SECRET` | Random 32+ char string |
| `JWT_SECRET` | Random 32+ char string |
| `API_TOKEN_SALT` | Random 16+ char string |
| `TRANSFER_TOKEN_SALT` | Random 16+ char string |
| `DATABASE_CLIENT` | `postgres` |
| `DATABASE_URL` | Neon pooled string in Render, direct string locally for migrations |
| `DATABASE_SSL` | `true` |
| `PORT` | `10000` (Render defaults to 10000) |
| `HOST` | `0.0.0.0` |
| `STRAPI_TELEMETRY_DISABLED` | `true` (optional) |
| `AWS_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `AWS_SECRET_ACCESS_KEY` | Cloudflare R2 secret |
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | R2 bucket name |
| `S3_REGION` | `auto` (Cloudflare) |
| `CDN_BASE_URL` | `https://cdn.lofifocus.com` (or your domain) |
| `MENTOR_MEDIA_BASE_PATH` | `mentor` (matches your folder structure) |

If you use Strapi transfer/upload tokens, also add `STRAPI_ADMIN_CLIENT_URL` or other defaults required by your build.

## Step 4 ? Deploy to Render

1. Click **New +** ? **Web Service**, pick this repo, and set the root to the repository root.
2. Configure:
   - Environment: Node
   - Region: same as Neon if possible
   - Build command: `npm install && npm run build`
   - Start command: `npm run strapi migrations:run && npm run start`
   - Instance: start with the free tier; upgrade to Starter when CPU/RAM usage demands it.
3. Add all environment variables from Step 3. Use the **pooled** Neon string for `DATABASE_URL` in Render.
4. Create the service. Render will install dependencies, run the build, execute migrations, and boot Strapi.
5. Once the deployment shows ?Live?, open `https://<service>.onrender.com/admin` to finish the admin onboarding.

### Optional: cron jobs

If you want automated exports or daily sync jobs, create a Render Cron Job that runs a command such as:
```bash
npm run strapi export -- --no-encrypt
```
Schedule it nightly and upload the exported zip to R2 or another safe location.

## Step 5 ? Post-deploy checklist

1. **Create the first admin** via the Strapi onboarding UI.
2. **Configure the upload provider** (S3 plugin) with the R2 credentials.
3. **Import or author mentor content**. Re-create the eight mentor groups/insights using the values from `lofi-focus-ios/docs/lifestyle_mentor_package`. Confirm that each group includes `personaSlug` and media URLs pointing at your CDN.
4. **Generate a Strapi API token** with read access. Store it as `STRAPI_API_TOKEN` in the `lofi-focus-ios` project.
5. **Verify the public API**:
   ```bash
   curl "https://<service>.onrender.com/api/mentor-groups?populate=insights"
   ```
   Response should include populated `insights` and media URLs with your CDN base.
6. **Update the main app**: set `STRAPI_API_URL`, `STRAPI_API_TOKEN`, `CDN_BASE_URL`, and (optionally) `MENTOR_MEDIA_BASE_URL` in the `lofi-focus-ios` deployment so it fetches from this CMS.

## Step 6 ? Maintenance

- Rotate Strapi secrets quarterly and redeploy.
- Monitor Render logs and the Neon dashboard for connection saturation. Upgrade the Neon plan if you see frequent `too many connections` errors.
- Keep R2 in sync: replacing a mentor video should upload a file with the same filename so the app does not require a code change.
- Run `npm run strapi export` before major releases and store the artifact as a backup.
- Enable Neon automated backups, or schedule your own via psql dumps executed from a Render job.

## Quick reference

```bash
# Run migrations against production
export DATABASE_URL="postgresql://...direct...?sslmode=require"
NODE_ENV=production npm run strapi migrations:run

# Generate Strapi application keys (example)
openssl rand -base64 32

# Reset an admin password
npm run strapi admin:reset-user-password -- --email admin@example.com --password "NewStrongPass123!"
```

Keep this document along with `STRAPI_CDN_REQUIREMENTS.md` so the infrastructure and app teams stay aligned during deployments.
