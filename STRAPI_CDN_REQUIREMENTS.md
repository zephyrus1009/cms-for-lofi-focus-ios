# Strapi + Cloudflare R2 CDN Requirements

This document consolidates requirements from the project planning notes for the dedicated Strapi/CDN handoff. Share it with the team maintaining the separate Strapi + storage repository so both apps stay aligned.

## 1. Architecture overview
- **Storage of record:** Cloudflare R2 (S3-compatible) is the canonical bucket for music tracks, ambient backgrounds, and Reflect journal attachments.【F:PLAN.md†L12-L17】【F:docs/ROADMAP.md†L34-L36】
- **Metadata + signing service:** A standalone Strapi CMS owns metadata (title, attribution, tags) and issues signed URLs for uploads or gated previews before handing back CDN-ready links to the apps.【F:PLAN.md†L12-L17】【F:docs/ROADMAP.md†L34-L36】
- **Delivery path:** Cloudflare CDN fronts the R2 bucket. Web and iOS clients consume CDN URLs after Strapi/Next.js finish any privileged work.【F:PLAN.md†L12-L17】【F:docs/ROADMAP.md†L66-L67】
- **Server-side proxy:** Next.js API routes proxy actions that require authentication (upload signing, private previews) so client apps never handle raw R2 credentials. During local development, teams can mock the same folder structure without R2 access.【F:PLAN.md†L12-L17】【F:PLAN.md†L58-L61】【F:docs/ROADMAP.md†L34-L36】

## 2. Environment configuration
### Core service endpoints
- `STRAPI_API_URL` – Base URL for the Strapi CMS instance that exposes metadata and signing endpoints referenced by the apps.【F:PLAN.md†L12-L17】
- `STRAPI_API_TOKEN` (or Strapi service token) – Server-side token used by Next.js or backend workers to call Strapi endpoints for metadata queries and upload signing without exposing secrets to clients.【F:PLAN.md†L58-L61】
- `CDN_BASE_URL` – Cloudflare CDN domain that serves published assets after Strapi returns metadata, used by both platforms when constructing playback/download URLs.【F:docs/KNOWLEDGE_LIBRARY.md†L75-L87】

### Cloudflare R2 credentials
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` – Credentials for the R2 bucket, stored only in trusted server environments.【F:docs/KNOWLEDGE_LIBRARY.md†L75-L87】
- `S3_ENDPOINT` – The R2 S3-compatible endpoint (e.g. `https://<account-id>.r2.cloudflarestorage.com`).【F:docs/KNOWLEDGE_LIBRARY.md†L75-L87】

### Local development notes
- Mirror production variable names in `.env.local` (Next.js) or secure local secrets for iOS builds. When R2 access is unavailable, stub uploads but keep the same folder structure so syncing to the real bucket is straightforward.【F:PLAN.md†L12-L17】【F:docs/KNOWLEDGE_LIBRARY.md†L82-L87】

## 3. Bucket structure conventions
Keep the folder hierarchy consistent across environments:
- `tracks/` – mastered audio files for the music player.【F:docs/KNOWLEDGE_LIBRARY.md†L79-L84】
- `backgrounds/` – static imagery/video loops tied to ambient scenes.【F:docs/KNOWLEDGE_LIBRARY.md†L79-L84】
- `journals/{userId}/` – per-user attachments created from Reflect journal entries.【F:docs/KNOWLEDGE_LIBRARY.md†L79-L84】

## 4. API tokens & auth responsibilities
- Strapi should expose only the metadata and signing endpoints; server-side callers (Next.js routes, background jobs) authenticate with Strapi tokens and never leak R2 credentials to browsers or the iOS app.【F:PLAN.md†L58-L61】
- Next.js proxy routes validate the signed upload intents, forward them to Strapi/R2, and return CDN URLs so clients only handle public links.【F:PLAN.md†L58-L61】【F:docs/ROADMAP.md†L34-L36】
- Client apps cache CDN URLs but must refresh metadata through Strapi when assets change to honor revocations or updated attribution.【F:docs/ROADMAP.md†L66-L67】

## 5. Security & QA checklist
- Verify all required env vars (`STRAPI_API_URL`, `STRAPI_API_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `CDN_BASE_URL`) are present per environment before deployment.【F:docs/KNOWLEDGE_LIBRARY.md†L75-L87】
- Confirm R2 credentials are never bundled into client builds; access flows solely through server-side proxies as noted in the plan.【F:PLAN.md†L58-L61】
- Ensure Strapi issues signed URLs or short-lived tokens for uploads and private previews before CDN publication, preventing direct writes to R2.【F:PLAN.md†L12-L17】【F:docs/ROADMAP.md†L34-L36】
- Exercise local mock storage paths to match the production folder hierarchy so QA covers pathing edge cases ahead of enabling R2 access.【F:PLAN.md†L12-L17】【F:docs/KNOWLEDGE_LIBRARY.md†L82-L87】
- When promoting new scenes/tracks/backgrounds, validate CDN cache invalidation and metadata updates through Strapi before shipping to mobile/web clients.【F:docs/ROADMAP.md†L66-L67】

## 6. Integration checklist (Web Next.js & iOS)
### Next.js web app
1. Populate `.env.local` with the variables above and restart the dev server to pick up Strapi + R2 endpoints.【F:docs/KNOWLEDGE_LIBRARY.md†L75-L87】
2. Implement server-side helpers that call `STRAPI_API_URL` with the Strapi token to fetch scene/track listings; store only CDN URLs in client state for playback.【F:PLAN.md†L12-L17】【F:docs/ROADMAP.md†L66-L67】
3. For journal attachments, expose an API route that validates the session, requests a signed upload from Strapi/R2, performs the upload, then persists metadata back to Strapi so clients receive the final CDN URL.【F:PLAN.md†L58-L61】【F:docs/ROADMAP.md†L34-L36】
4. Background synchronization should reuse the same metadata fetch helper to refresh available backgrounds and any associated color themes or prompts, falling back to local mocks if R2 access is unavailable in dev.【F:PLAN.md†L12-L17】【F:docs/ROADMAP.md†L66-L67】

### iOS app
1. Inject the same base endpoints (Strapi URL, CDN base) via configuration plist or build settings so the client knows where to request metadata and media.【F:PLAN.md†L12-L17】【F:docs/KNOWLEDGE_LIBRARY.md†L75-L87】
2. Fetch scenes/tracks and background metadata from Strapi, then stream assets from `CDN_BASE_URL`, keeping caches invalidated when metadata timestamps change.【F:docs/ROADMAP.md†L66-L67】
3. For journal uploads initiated on iOS, call the Next.js proxy (or a Strapi upload endpoint guarded by service tokens) to obtain a signed upload target; upload the file to R2 and report completion back to Strapi so metadata stays authoritative.【F:PLAN.md†L58-L61】【F:docs/ROADMAP.md†L34-L36】
4. During offline development or QA, mirror the mock storage paths to ensure parity with production once R2 access is granted.【F:PLAN.md†L12-L17】【F:docs/KNOWLEDGE_LIBRARY.md†L82-L87】

---
Use this package as the baseline when spinning up or auditing the separate Strapi/CDN infrastructure repo so its configuration aligns with the apps’ expectations.
