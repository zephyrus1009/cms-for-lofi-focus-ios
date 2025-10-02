# cms-for-lofi-focus-ios Runbook

This runbook covers two workflows:
1. Running the CMS locally inside Docker (with MinIO providing an S3-compatible endpoint).
2. Deploying the CMS to Render with Neon Postgres and Cloudflare R2.

Use the same repository root for both workflows. Keep secrets in `.env` variants and never commit them.

## Part 1. Offline development with Docker

### 1. Prerequisites
- Docker Desktop or Docker Engine 24+ with Docker Compose v2.
- Optional: Node.js 20+ if you want to run Strapi CLI commands on the host (not required when using Docker only).

### 2. Prepare an offline `.env`
Create `./.env.offline` with values dedicated to Docker. Example skeleton:

```
NODE_ENV=development
HOST=0.0.0.0
PORT=1337
APP_KEYS=<comma-separated base64 strings>
ADMIN_JWT_SECRET=<base64 string>
JWT_SECRET=<base64 string>
API_TOKEN_SALT=<base64 string>
TRANSFER_TOKEN_SALT=<base64 string>

# MinIO S3-compatible credentials
AWS_ACCESS_KEY_ID=devaccesskey
AWS_SECRET_ACCESS_KEY=devsecretkey
S3_ENDPOINT=http://minio:9000
S3_BUCKET=lofi-focus-mentor
S3_REGION=us-east-1
CDN_BASE_URL=http://localhost:9000/lofi-focus-mentor
MENTOR_MEDIA_BASE_PATH=mentor
STRAPI_TELEMETRY_DISABLED=true
```

Tips:
- Generate base64 secrets with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- Leave `DATABASE_URL` unset so Strapi falls back to SQLite (`data.db`).
- All MinIO values stay inside Docker; external callers will use `http://localhost:9000`.

### 3. Create a compose file
Save the following as `docker-compose.offline.yml` at the project root:

```
version: "3.8"
services:
  cms:
    image: node:20
    working_dir: /srv/app
    volumes:
      - ./:/srv/app
      - cms-node-modules:/srv/app/node_modules
      - cms-sqlite:/srv/app/.tmp
    env_file:
      - .env.offline
    environment:
      DATABASE_FILENAME: /srv/app/.tmp/data.db
    command: sh -c "npm install && npm run develop"
    ports:
      - "1337:1337"
    depends_on:
      - minio

  minio:
    image: minio/minio:RELEASE.2024-09-27T00-00-00Z
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: devaccesskey
      MINIO_ROOT_PASSWORD: devsecretkey
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data

volumes:
  cms-node-modules:
  cms-sqlite:
  minio-data:
```

Key notes:
- Strapi installs dependencies inside the container so the host does not need Node.js.
- `cms-sqlite` persists the SQLite database between runs.
- The MinIO console is available at `http://localhost:9001` for bucket management.

### 4. Start the stack

```
docker compose -f docker-compose.offline.yml up --build
```

The first run downloads images, installs dependencies, and brings Strapi up in development mode on <http://localhost:1337>. Watch the logs until you see `Starting your Strapi app...`.

### 5. Create the MinIO bucket
1. Open `http://localhost:9001` and log in with `devaccesskey` / `devsecretkey`.
2. Create a bucket named `lofi-focus-mentor` (or the value from `S3_BUCKET`).
3. Optional: create folders `mentor/master`, `mentor/720`, `mentor/poster` for organisation.

### 6. Onboard Strapi
- Visit `http://localhost:1337/admin` to create the first admin user.
- Import or create Mentor Groups/Insights. Uploaded media will write into the MinIO bucket via the S3 provider.

### 7. Shut down and clean up
- Stop the stack with `Ctrl+C`, then run `docker compose -f docker-compose.offline.yml down`.
- To reset data, remove the named volumes: `docker volume rm cms-node-modules cms-sqlite minio-data`.

## Part 2. Online deployment (Render + Neon + Cloudflare R2)

### 1. Prerequisites
- Render account with permission to create Web Services (Node.js environment).
- Neon account for managed Postgres access.
- Cloudflare account with R2 enabled and a domain for CDN (or a Worker proxy).
- Access to the production secrets listed in `docs/PROJECT_REQUIREMENTS.md`.
- Local machine with Node.js 20.x if you plan to run migrations before deployment.

### 2. Prepare environment values
Reuse your offline `.env` as a base, then adjust the values listed below before uploading them to Render and Neon.

| Variable | Offline (Docker) | Production (Render) | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | `production` | Render sets `NODE_ENV` automatically but keep the value for consistency. |
| `HOST` / `PORT` | `0.0.0.0` / `1337` | `0.0.0.0` / `10000` | Render listens on port 10000. |
| `DATABASE_URL` | _unset_ (uses SQLite) | Neon **pooled** connection string | Keep a separate copy of the direct string locally for migrations. |
| `DATABASE_SSL` | optional | `true` | Required by Neon. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | MinIO dev credentials | Cloudflare R2 **Account API token** credentials | Store in Render secrets and any CI/CD vault. |
| `S3_ENDPOINT` | `http://minio:9000` | `https://<account-id>.r2.cloudflarestorage.com` | Omit the bucket suffix in production. |
| `S3_BUCKET` | `lofi-focus-mentor` (MinIO bucket) | Your R2 bucket name | Should match across environments for predictable paths. |
| `S3_REGION` | `us-east-1` (arbitrary) | `auto` | Cloudflare ignores the value but `auto` is conventional. |
| `CDN_BASE_URL` | `http://localhost:9000/lofi-focus-mentor` | `https://cdn.lofifocus.com` (or your domain) | Clients rely on this value for media URLs. |
| `R2_ACCOUNT_TOKEN_BACKUP` | optional | optional | Keep only in secret storage; Render does not need it. |
| `APP_KEYS`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT` | Same values as offline | Same | Do not regenerate between environments unless you intend to rotate secrets. |

### 3. Configure Neon
1. Create a Neon project (e.g. `lofi-focus-cms`) and a production branch with a `strapi` database.
2. Add a role (e.g. `strapi_prod`) with a strong password and grant full access to the branch/database.
3. Record both connection strings:
   - **Pooled** string (`...-pooler.neon.tech`): use in Render.
   - **Direct** string: use locally to run migrations or maintenance commands.
4. Before the first deploy, run Strapi locally with the direct string to initialise the schema:
   ```
   export DATABASE_URL="<neon-direct-string>?sslmode=require"
   NODE_ENV=production npm install
   NODE_ENV=production npm run build
   NODE_ENV=production npm run strapi migrations:run
   NODE_ENV=production npm run start
   ```
5. After verifying, switch `DATABASE_URL` back to the SQLite (unset) or development value to avoid touching production data during local coding.

### 4. Configure Cloudflare R2 and CDN
1. Create (or verify) the R2 bucket that mirrors your offline bucket structure.
2. Create an **Account API token** with the R2 Edit template scoped to the bucket. Record the Access Key ID, Secret Access Key, and token value.
3. Note the S3 API URL shown in the bucket settings (omit the trailing `/bucket-name` when filling `S3_ENDPOINT`).
4. Configure a CDN-facing domain (Cloudflare custom domain or Worker) that maps to the bucket; this becomes `CDN_BASE_URL`.

### 5. Deploy to Render
1. In Render, create a new **Web Service** pointing at this repository.
2. Set the environment to **Node** and choose the region closest to your Neon database.
3. Build command: `npm install && npm run build`
4. Start command: `npm run strapi migrations:run && npm run start`
5. Add all environment variables from the table above (use the pooled Neon string for `DATABASE_URL`).
6. Deploy the service. Render installs dependencies, builds the admin, runs migrations, and boots Strapi.
7. Once the service is live, open `https://<service>.onrender.com/admin` to complete the admin onboarding.

### 6. Post-deploy checklist
- Configure the upload provider inside the Strapi admin to confirm R2 credentials are valid.
- Import or create mentor content so external clients can read data.
- Generate a Strapi API token for the consumer apps and update their configuration.
- Verify the public API: `curl "https://<service>.onrender.com/api/mentor-groups?populate=insights"` should return mentor data with CDN URLs.

### 7. Maintenance
- Rotate Strapi secrets and Cloudflare credentials on a regular cadence (quarterly or during personnel changes) and redeploy.
- Run `npm run strapi export -- --no-encrypt` before major releases and store the backup securely (e.g. R2, S3, or encrypted storage).
- Monitor Render logs plus Neon metrics for connection pool saturation and upgrade plans when required.
- Keep the R2 bucket structure aligned with the expectations documented in `docs/PROJECT_REQUIREMENTS.md` to avoid broken media links.
