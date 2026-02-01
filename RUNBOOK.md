# RUNBOOK

## Prereqs
- Node.js (LTS)
- PostgreSQL (local or Docker)
- Stripe CLI (optional but helpful for webhooks)

## Environment variables (high level)
See `.env.example` / docs in repo if present. At minimum:
- `DATABASE_URL`
- `SESSION_SECRET`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (and any required price/product ids)
- Optional admin seed:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`

## Install
- `npm install`
- DB migrations:
  - `npx prisma migrate deploy` (prod-like)
  - or `npx prisma migrate dev` (dev)
- Optional seed:
  - `node prisma/seed.js` (if used in this repo)

## Run
- `npm run dev` (or `npm start`)

## Tests
- `npm test`

## Useful endpoints
Auth:
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

Admin:
- `GET /admin/metrics` (ADMIN|OPS)

Stripe:
- Checkout creation endpoint (see booking/payment routes)
- Webhook endpoint (see webhook controller)

Frontend:
- `/login`
- `/dashboard`

## Common troubleshooting
### 401 on /auth/me
- You are not logged in (no session cookie)
- Cookie not persisted (check curl `-c` and `-b` flags)

### secure cookies behind reverse proxy
- Ensure `TRUST_PROXY=1` (or equivalent)
- Ensure TLS termination is correctly configured

### Webhook signature failures
- Ensure webhook uses raw body
- Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint secret used by Stripe/Stripe CLI
