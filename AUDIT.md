# AUDIT — booking-platform-pro-senior

## Purpose
Reference backend project (not a product). Goal: demonstrate freelance-ready backend skills in critical zones:
- payments (Stripe Checkout + webhooks)
- security (sessions, RBAC, rate limiting)
- reliability (idempotence, DB ledger, tests)
- production readiness (simple deploy story, minimal observability)

Non-goals:
- no React
- no microservices / Kubernetes
- no SaaS roadmap

## Stack
- Node.js / Express
- Prisma + PostgreSQL
- Stripe Checkout + Webhooks
- Sessions (express-session)
- Tests (Vitest, integration tests, sequential where needed)
- Minimal static HTML frontend (admin pages)

## Architecture (high level)
- Modular Express app (routes/controllers/services)
- Prisma as DB access layer
- Stripe webhook endpoint uses raw body + signature verification
- Auth stored in session with minimal payload (`id`, `email`, `role`)

## Key capabilities
### Stripe payments
- Checkout session created server-side
- Webhook processes Stripe events
- Idempotence via DB (PaymentEvent ledger + uniqueness constraints)
- Strict ACK behavior (avoid repeated processing)
- Webhook observability: logs include outcome (`processed` / `duplicate` / `rejected`); in-memory counters (`received`, `duplicates`, `errors`) exposed at `GET /admin/metrics` (ADMIN|OPS)

### Auth / RBAC
- Login via DB users + password hashing
- Session regeneration on login (anti session fixation)
- RBAC middleware (`ADMIN`, `OPS`, `READONLY`)
- Protected admin endpoint:
  - `GET /admin/metrics` (ADMIN|OPS)

### Production hardening
- Session cookie settings are production-safe (secure in prod, sane defaults)
- Login rate limiting
- Structured logs / requestId (minimal, correlation-friendly)

## How to validate quickly
1) Install + configure env (see RUNBOOK.md)
2) Run tests: `npm test`
3) Run server: `npm run dev` (or equivalent)
4) Smoke checks:
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /admin/metrics` (requires ADMIN|OPS)

## Current baseline tags
- `v2.2.2-stripe-webhook-hardening`
- `v2.3.0-auth-rbac-admin`
- `v2.3.1-auth-prod-hardening`
