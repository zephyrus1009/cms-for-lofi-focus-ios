# cms-for-lofi-focus-ios

Strapi v4 project that powers mentor personas and insights for the Lofi Focus apps.

## Getting started

1. Copy the environment template and fill in secrets:
   ```bash
   cp .env.example .env
   ```
2. (Optional) point DATABASE_URL at Neon if you want to test against the real Postgres instance; otherwise the default SQLite file .tmp/data.db is used.
3. Install dependencies and run the dev server:
   ```bash
   npm install
   npm run develop
   ```
4. Open http://localhost:1337/admin to create the first admin account.

### Production-style build

```bash
# assumes .env has DATABASE_URL pointing at Neon (direct string)
npm install
npm run build
NODE_ENV=production npm run start
```

## Content architecture

- **Mentor Group** (mentor-group)
  - Fields: title, slug, description, order, domain, personaSlug, mediaMasterUrl, mediaFallback720Url, mediaPosterUrl.
  - Relation: one group has many mentor-insight entries.
- **Mentor Insight** (mentor-insight)
  - Fields: slug, order, mainIdea, shortExplanation, callToAction.
  - Relation: many insights belong to a single mentor group.

Both REST endpoints (`/api/mentor-groups`, `/api/mentor-insights`) are public for GET requests so the client apps can fetch without authentication.

## Useful scripts

- `npm run develop` – start Strapi in watch mode.
- `npm run build` – build the Strapi admin panel.
- `npm run start` – start Strapi in production mode.

See docs/RUNBOOK.md for Docker-based local development and Render deployment steps, and docs/PROJECT_REQUIREMENTS.md for overall project requirements.
