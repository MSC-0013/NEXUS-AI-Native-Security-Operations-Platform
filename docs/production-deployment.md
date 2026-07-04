# NEXUS Production Deployment Guide

Status date: 2026-07-04

## Current Status

- Frontend target: Vercel, TanStack Start with Nitro.
- Backend target: Render Free Tier, single Docker web service.
- Database target: Railway PostgreSQL.
- Railway migration status: complete. Migration `019_production_demo_password_hashes.sql` was applied successfully.
- Live Vercel URL: pending Vercel access.
- Live Render URL: pending Render access.

## Production URLs

Replace these after deployment:

- Frontend: `https://YOUR_VERCEL_APP.vercel.app`
- Backend: `https://YOUR_RENDER_SERVICE.onrender.com`
- Database: Railway PostgreSQL, configured through `DATABASE_URL`
- GitHub: `https://github.com/MSC-0013/NEXUS-AI-Native-Security-Operations-Platform`

## Required Access

To finish the live deployment, provide one of the following:

- GitHub push access to `MSC-0013/NEXUS-AI-Native-Security-Operations-Platform`
- Vercel dashboard access or `VERCEL_TOKEN`
- Render dashboard access or Render API/CLI credentials
- Railway access only if the current database needs rotation, reset, or inspection
- Domain/DNS access only if a custom domain should be attached

## Environment Variables

Use `.env.production.example` as the source template. Do not commit real secrets.

Frontend, Vercel:

```env
VITE_API_URL=https://YOUR_RENDER_SERVICE.onrender.com
VITE_WS_URL=wss://YOUR_RENDER_SERVICE.onrender.com
```

Backend, Render:

```env
NODE_ENV=production
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:REDACTED@hayabusa.proxy.rlwy.net:37032/railway
CORS_ORIGIN=https://YOUR_VERCEL_APP.vercel.app,https://*.vercel.app
JWT_SECRET=<64+ random chars>
JWT_REFRESH_SECRET=<64+ random chars>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ENCRYPTION_KEY=<64 hex chars>
WEBHOOK_SIGNING_SECRET=<64+ random chars>
RATE_LIMIT_RPM_DEFAULT=300
LLM_PROVIDER=none
CHAT_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
```

Generate local candidate secrets with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Vercel Deployment

Vercel's current TanStack Start guidance requires Nitro. This repo now installs `nitro`, registers `nitro()` in `vite.config.ts`, and sets `framework: tanstack-start` in `vercel.json`.

Deployment steps:

1. Push the updated repo to GitHub.
2. In Vercel, import the GitHub repository.
3. Framework preset: TanStack Start.
4. Install command: `npm ci`.
5. Build command: `npm run build`.
6. Add `VITE_API_URL` and `VITE_WS_URL`.
7. Deploy production.

Expected build output:

- `.output/public`
- `.output/server/index.mjs`
- `.output/nitro.json`

## Render Deployment

`render.yaml` defines a single Free Tier Docker web service and uses Railway as an external database. It intentionally does not provision Render Postgres or Redis.

Deployment steps:

1. Create a Render Blueprint from this GitHub repo, or create a Docker web service manually.
2. Use `render.yaml`.
3. Add all `sync: false` environment variables from the Render dashboard.
4. Set `DATABASE_URL` to the Railway connection string.
5. Set `CORS_ORIGIN` after the Vercel production URL is known.
6. Deploy.

Render health endpoints:

- `/health`
- `/ready`

## Database Migration

Run migrations with:

```powershell
$env:DATABASE_URL="<Railway DATABASE_URL>"
npm run db:migrate
```

Completed on Railway:

- Existing migrations `001` through `018` and `099` were already applied.
- New migration `019_production_demo_password_hashes.sql` was applied.
- Production login for `amelia.lee@acme.federal` works with the seeded bcrypt hash.

## Important Implementation Notes

- Authentication uses JWT access/refresh tokens stored client-side, not cookies.
- CORS now supports exact origins and `https://*.vercel.app` preview origins.
- Frontend API and WebSocket base URLs are normalized to avoid trailing-slash failures.
- Binary file upload storage is not implemented in the current backend. Evidence endpoints store file metadata and storage URIs; S3 env vars are reserved for future binary evidence support.
- Render Free Tier deployment omits the worker/Redis process. Queue workers can be added later with a paid worker plus Redis provider.

## References

- Vercel TanStack Start docs: https://vercel.com/docs/frameworks/full-stack/tanstack-start
- Vercel TanStack Start deployment guide: https://vercel.com/kb/guide/deploy-a-tanstack-start-app-to-vercel
- Render Blueprint docs: https://render.com/docs/blueprint-spec
