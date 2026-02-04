# RUNBOOK – booking-platform-pro-senior

This document describes how to **run, operate, monitor, and troubleshoot**
the `booking-platform-pro-senior` backend in a production-like environment.

It is written for:
- Developers
- Operators
- Technical clients
- Future maintainers

---

## Overview

This backend is a **Dockerized Express application** using:
- PostgreSQL 16
- Prisma ORM
- Stripe Checkout + signed webhooks

The system is intentionally simple:
- Single backend service
- Single database
- No external queues
- No background workers

Reliability is achieved through **database idempotence**, not infrastructure complexity.

---

## Services

Docker Compose starts two services:

| Service | Description |
|------|------------|
| `backend` | Express API server |
| `db` | PostgreSQL 16 |

---

## Starting the stack

From the repository root:

```bash
docker compose up --build


Expected result:

PostgreSQL starts

Prisma client is generated

Pending migrations are applied

Backend listens on port 3000

Stopping the stack
docker compose down


To also remove volumes (⚠ data loss):

docker compose down -v

Health check

The backend exposes a health endpoint:

GET /health


Example:

curl http://localhost:3000/health


Response:

{ "status": "ok" }


If this endpoint is reachable, the backend is running and responsive.

Logs
View logs
docker compose logs backend


Follow logs:

docker compose logs -f backend

What to look for

Normal startup logs include:

Prisma client generation

Migration status

Server running on port 3000

Stripe-related logs include:

Webhook received

Signature verification

Idempotent skip warnings (expected on retries)

Each webhook log includes an **outcome** field: `processed` (first-time), `duplicate` (idempotence), or `rejected` (invalid signature or processing error). Use `grep '"outcome":"duplicate"'` to see retries; see docs/runbooks/observability.md for details.

**Webhook counters (GET /admin/metrics)**

Requires auth (ADMIN or OPS). Response includes `webhook`: `{ received, duplicates, errors }` — in-memory counts since process start. Useful for quick visibility on retries and errors.

Stripe webhook behavior
Expected behavior

Stripe will retry webhooks

Duplicate deliveries are normal

The backend must not process the same payment twice

Idempotence mechanism

Idempotence is enforced at the database level

stripeSessionId is unique

Duplicate webhook deliveries result in:

No business logic re-execution

HTTP 200 OK response

This is expected and healthy behavior.

ACK policy summary
Situation	Response
Invalid Stripe signature	400
Successful processing	200
Already processed	200
Processing error	500 (Stripe retries)
Database operations
Access the database container
docker compose exec db psql -U postgres -d booking_platform

Useful checks

List payment events:

SELECT * FROM "PaymentEvent" ORDER BY "createdAt" DESC;


Check bookings:

SELECT id, status, "stripeSessionId" FROM "Booking";

Prisma migrations
Apply migrations (automatic)

Migrations are applied automatically on container startup.

Manual migration (advanced)
docker compose exec backend npx prisma migrate deploy

Common issues & resolutions
Backend fails on startup with Prisma error

Cause:

Database not reachable

Invalid DATABASE_URL

Action:

Check database container logs

Verify environment variables in docker-compose.yml

Stripe webhook returns 500

Cause:

Application error during processing

Action:

Check backend logs

Stripe will retry automatically

Do not manually replay unless debugging

Stripe retries seen as warnings

This is normal.

Stripe retries are expected and handled safely via DB idempotence.

Login endpoint blocked

Cause:

Rate limiting (anti brute-force)

Action:

Wait for rate limit window to reset

This is expected security behavior

Security notes (operational)

Webhooks are rate-limited but permissive

Login endpoints are strictly rate-limited

Secrets must never be logged

HTTPS termination is assumed to be handled upstream (reverse proxy)

What this system does NOT do

No background jobs

No async workers

No message queues

No frontend rendering in production image

These are intentional design decisions.

Resetting the environment (local)

⚠ This deletes all data

docker compose down -v
docker compose up --build

Ownership & scope

This backend is designed to:

Be easy to reason about

Be easy to debug

Be safe under failure

It prioritizes correctness and clarity over scalability tricks.