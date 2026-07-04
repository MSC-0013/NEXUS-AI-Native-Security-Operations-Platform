# NEXUS Production Checklist

Status date: 2026-07-04

## Completed

- [x] Installed and configured Nitro for Vercel TanStack Start deployment.
- [x] Added `vercel.json` with TanStack Start framework preset and security headers.
- [x] Reworked `render.yaml` for Render Free Tier web service plus external Railway PostgreSQL.
- [x] Added `.env.production.example` with redacted production variables.
- [x] Protected `.env*` files in `.gitignore`.
- [x] Fixed CORS handling for exact production origins and Vercel preview wildcard origins.
- [x] Normalized frontend `VITE_API_URL` and `VITE_WS_URL`.
- [x] Fixed production auth status checks to match the database enum.
- [x] Fixed invalid incident status usage in SLA logic.
- [x] Fixed the index migration for fresh databases.
- [x] Added production bcrypt hashes for seeded showcase users.
- [x] Ran Railway migrations successfully.
- [x] Verified backend TypeScript build: `npm run build:api`.
- [x] Verified frontend production build: `npm run build`.
- [x] Verified targeted ESLint on changed executable source/config files.

## Railway-Backed API Smoke Tests

- [x] `/health`: 200
- [x] `/ready`: 200, database connected
- [x] `/v1/auth/login`: 200 with `amelia.lee@acme.federal`
- [x] `/v1/auth/me`: 200
- [x] `/v1/dashboard/stats`: 200
- [x] `/v1/dashboard/executive`: 200
- [x] `/v1/events`: 200, returned data
- [x] `/v1/alerts`: 200, returned data
- [x] `/v1/incidents`: 200, returned data
- [x] `/v1/reports`: 200, returned data
- [x] `/v1/reports/:id/download`: 200, CSV response
- [x] Case evidence create/delete metadata flow: 201 then 204

## Pending Platform Verification

- [ ] Push updated code to GitHub.
- [ ] Deploy backend to Render.
- [ ] Set Render env vars.
- [ ] Confirm Render `/health` and `/ready`.
- [ ] Deploy frontend to Vercel.
- [ ] Set Vercel env vars.
- [ ] Update Render `CORS_ORIGIN` with the final Vercel URL.
- [ ] Verify production login from browser.
- [ ] Verify production navigation across login, dashboard, incidents, alerts, cases, reports, copilot, and settings.
- [ ] Verify report download from production browser.
- [ ] Verify WebSocket route if the UI uses realtime event streaming.
- [ ] Capture final screenshots and screen recordings.

## Known Limits

- Live Vercel and Render URLs are pending account access.
- Binary uploads are not implemented; current evidence flows store metadata and storage URIs.
- Worker/Redis automation is not deployed on Render Free Tier.
- `npm install nitro` reported dependency audit findings; do not run forced upgrades without regression testing.
- Full-repo `npm run lint` is still blocked by pre-existing Prettier/style debt outside this deployment change set.
