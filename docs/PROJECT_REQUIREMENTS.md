# cms-for-lofi-focus-ios Project Requirements

## Purpose
- Provide a Strapi v4 CMS that curates mentor personas and insights for the Lofi Focus applications (iOS and web).
- Centralise editorial metadata and media references so client apps consume a consistent API and CDN surface.

## Functional Objectives
- Maintain the **Mentor Group** and **Mentor Insight** content types with ordered relationships.
- Expose read-only REST endpoints (`/api/mentor-groups`, `/api/mentor-insights`) that can be queried without authentication.
- Store and serve mentor media (master video, 720p fallback, poster) through Cloudflare R2 and a CDN domain.

## Core System Architecture
- **Strapi service**: Node.js 20 runtime, runs locally for development and on Render for production. Builds must compile the Strapi admin panel before deployment.
- **Database**: Neon Postgres hosts persistent data. Use the direct connection string for migrations/admin tasks, and the pooled connection string for long-running app instances.
- **Object storage**: Cloudflare R2 bucket stores binary assets. Strapi uses the `aws-s3` upload provider pointed at the R2 S3-compatible endpoint.
- **CDN**: Cloudflare (or custom domain) fronts the R2 bucket so public URLs use a stable CDN base.
- **Client integrations**: The `lofi-focus-ios` mobile app and the web app consume the Strapi API plus CDN URLs. Service tokens protect any privileged routes (e.g. uploads via proxy APIs).

## Environment & Secret Baseline
All environments (local, staging, production) must provide these variables. Generate cryptographic values once and keep them consistent per environment unless you are rotating secrets.

| Variable | Purpose | Generation / Notes |
| --- | --- | --- |
| `APP_KEYS` | Array of >=2 strings that Strapi uses to sign cookies and sessions. | Run `node -e "const c=require('crypto'); console.log(Array.from({length: 2}, () => c.randomBytes(32).toString('base64')).join(','))"` and paste the output. |
| `ADMIN_JWT_SECRET` | Signs Strapi admin JWT tokens. | `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `JWT_SECRET` | Signs public API JWT tokens (if enabled). | Generate separately from the admin secret using the same command. |
| `API_TOKEN_SALT` | Salt used when hashing Strapi API tokens. | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `TRANSFER_TOKEN_SALT` | Salt used for Strapi transfer archives. | Generate a unique value (same command as above). |
| `AWS_ACCESS_KEY_ID` | Access key for R2 bucket operations. | Obtain from a Cloudflare **Account API token** with R2 Edit scope. |
| `AWS_SECRET_ACCESS_KEY` | Secret half of the R2 credentials. | Shown once when creating the token; store securely. |
| `R2_ACCOUNT_TOKEN_BACKUP` (optional) | Stores the token value for reference. | Keep only in secret storage; Strapi does not read it. |
| `S3_ENDPOINT` | Base URL of the R2 S3 API (no bucket suffix). | Example: `https://<account-id>.r2.cloudflarestorage.com` in production, `http://minio:9000` in Docker. |
| `S3_BUCKET` | Bucket name that holds mentor media. | Example: `lofi-focus-mentor`. |
| `S3_REGION` | Region reported to the provider. | `auto` for R2; `us-east-1` (or any value) when using MinIO locally. |
| `CDN_BASE_URL` | Public base URL clients will use to load media. | Example: `https://cdn.lofifocus.com` in production, `http://localhost:9000/lofi-focus-mentor` when using MinIO. |
| `MENTOR_MEDIA_BASE_PATH` | Root folder inside the bucket that stores mentor assets. | Defaults to `mentor`. |
| `DATABASE_URL` | Connection string to Postgres. | Leave unset to fall back to SQLite for development. Use Neon strings in staging/production. |
| `DATABASE_SSL` | Enables SSL for Postgres connections. | `true` for Neon; omit/`false` for SQLite-only setups. |
| `HOST`, `PORT` | Network binding for Strapi. | `0.0.0.0` / `1337` locally. Render expects `0.0.0.0` / `10000`. |
| `STRAPI_TELEMETRY_DISABLED` | Optional opt-out from telemetry. | Set to `true` if privacy is required. |

## Storage & CDN Conventions
- Bucket structure should remain consistent across environments:
  - `mentor/master/{slug}_master.mp4`
  - `mentor/720/{slug}_720.mp4`
  - `mentor/poster/{slug}_poster.png`
- Keep filenames stable so cached URLs remain valid. Replacing media should upload a file with the same path unless you intend to invalidate client caches.
- When using a CDN domain, configure the origin to point at the R2 bucket or a Cloudflare Worker that proxies R2.

## Security & Operations Expectations
- Store secrets in a password manager or infrastructure secret store. Never commit secrets to Git.
- Rotate Strapi application keys (`APP_KEYS`, JWT secrets, salts) and R2 credentials quarterly or when a team member leaves.
- Restrict Cloudflare API tokens to the minimum scope (bucket Edit and Read). Use Account tokens for production so the credentials survive individual user changes.
- Back up Strapi content regularly using `npm run strapi export -- --no-encrypt` and archive the output in secure storage.
- Monitor Render logs and Neon dashboards for connection or performance issues; scale plans as needed.

## Integration Requirements
- **Next.js web app**: Reads mentor data via `STRAPI_API_URL` with a Strapi API token stored server-side. Generates signed uploads (if needed) through API routes, never exposing R2 credentials.
- **iOS app**: Fetches mentor groups/insights via the public Strapi endpoints and loads media from `CDN_BASE_URL`. The app should refresh metadata when timestamps change to invalidate caches.
- Any service performing uploads should proxy through trusted backend code that talks to Strapi or signs R2 requests; client apps must never embed R2 keys.

## Related Documents
- `docs/RUNBOOK.md` - step-by-step instructions for local Docker-based development and Render + Neon deployment.
