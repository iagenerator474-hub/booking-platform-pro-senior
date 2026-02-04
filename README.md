stripe-checkout-backend-reference

This repository demonstrates a **pragmatic and reliable Stripe Checkout integration**
(signed webhooks, database-level idempotence, correct ACK strategy)
built on a sober **Express + PostgreSQL** backend.

It is intentionally focused on:
- a single Express backend (no microservices),
- Stripe Checkout + webhooks signés,
- idempotence garantie au niveau base de données (`stripeSessionId`),
- sécurité pragmatique (sessions, RBAC, rate limiting),
- simplicité opérationnelle (Docker + Postgres).

The goal is to show how to build a backend that **handles payments correctly,
survives retries, and remains easy to operate in production**.

---

## Production notes

### Environment variables (minimum)

Backend (`apps/backend/.env`):

- `DATABASE_URL` – PostgreSQL connection string (prod DB).
- `SESSION_SECRET` – long random secret for sessions.
- `STRIPE_SECRET_KEY` – Stripe secret key (live or test).
- `STRIPE_WEBHOOK_SECRET` – Stripe webhook secret for the configured endpoint.
- `APP_URL` – public HTTPS URL of the backend (used for Stripe success/cancel URLs).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` – optional, used by the Prisma seed to create an ADMIN user.
- `APP_VERSION` – optional, used in `/admin/metrics.runtime.version`.

### Migrations workflow (production)

Schema changes are applied via **Prisma migrations**.

1. **Local/dev**:
   - Edit `prisma/schema.prisma`.
   - Run `npx prisma migrate dev` to create and apply a new migration.
   - Commit the generated migration files.

2. **Production**:
   - Build and start via Docker:

     ```bash
     docker compose up --build
     ```

   - The backend container runs:
     - `npx prisma generate`
     - `npx prisma migrate deploy`

   - This is the **only** path to apply migrations in production.  
     Do **not** use `prisma migrate dev` against a prod database.

### Sessions & auth

- Sessions are stored **in memory** in the Node.js process:
  - acceptable for single-instance deployments (users are logged out on restart),
  - not shared across instances (if you scale horizontally, you need a shared store).
- Session cookie `sid` is `httpOnly`, `secure` in production, with configurable `sameSite`.
- Login:
  - uses bcrypt hashing,
  - filters on `User.isActive = true`,
  - always returns a generic error message (`"Identifiants invalides"`) on failure.

### Stripe Checkout & webhooks

- Checkout:
  - creates a **pending Booking** in DB first,
  - uses `booking.id` as `client_reference_id`,
  - attaches `stripeSessionId` to the booking after session creation.
- Webhooks:
  - use the raw HTTP body + Stripe SDK signature verification,
  - are processed inside a DB transaction:
    - insert into `PaymentEvent` (ledger, idempotence via unique `stripeSessionId`),
    - update the `Booking` status to `"payé"` when applicable.
  - ACK policy:
    - invalid signature → `400`,
    - processing error → `500` (Stripe will retry),
    - already processed (idempotence) → `200` without re-applying side effects.

Observability:

- Logs are JSON, with `requestId`, `module`, `action`, and an `outcome` field for webhooks:
  - `processed` / `duplicate` / `rejected`.
- `/admin/metrics` (ADMIN/OPS) exposes:
  - `webhook` counters: `received`, `duplicates`, `errors`,
  - `runtime` info: `uptimeSeconds`, `http5xx`, `version` (`APP_VERSION`).
