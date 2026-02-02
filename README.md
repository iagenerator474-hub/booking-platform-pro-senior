# booking-platform-pro-senior

**Production-ready backend reference** built with **Express, PostgreSQL, Prisma, and Stripe Checkout**, designed for **short freelance missions** focused on **reliability, payments, and operational clarity**.

This project is intentionally **not a SaaS** and not an over-engineered showcase. It demonstrates how to build and deliver a **calm, dependable backend** that handles payments correctly, survives retries, and is easy to operate in production.

---

## Who this is for

This backend is a good fit if you need:

* A **reliable Stripe Checkout integration** (with webhooks done properly)
* A backend that **never double-processes payments**
* A clear, auditable payment flow
* A simple Docker-based production setup
* A developer who prioritizes **correctness over speed**

Typical use cases:

* Booking or reservation platforms
* Paid access to services or resources
* Stripe webhook reliability audits
* Stabilization of an existing backend

---

## What this backend delivers

### Stripe payments you can trust

* Stripe Checkout integration
* Signed webhooks
* **Database-level idempotence** (no duplicate payment processing)
* Clear ACK policy (Stripe retries only when appropriate)
* Persistent payment ledger for audit and debugging

### Backend reliability

* PostgreSQL as the single source of truth
* Prisma ORM with migrations
* Transactional payment handling
* Explicit error handling and logging

### Security (pragmatic, not theoretical)

* Rate limiting on login (anti brute-force)
* Rate limiting on Stripe webhooks (public endpoint protection)
* Secure headers
* Input validation
* Password hashing

### Production readiness

* Dockerized backend
* Docker Compose setup with PostgreSQL
* Automatic Prisma client generation and migrations
* `/health` endpoint for monitoring
* Minimal, readable configuration

---

## Stripe reliability – design choices

### Why idempotence matters

Stripe may deliver the same event multiple times due to retries, network issues, or crashes. A production backend must guarantee that **business logic runs exactly once**.

### Key decision: `stripeSessionId`

* ❌ Stripe `event.id` changes on retries
* ✅ `checkout.session.id` represents the actual payment transaction

This backend uses `stripeSessionId` as the **idempotency boundary**, enforced at the database level.

### How it works

* Every valid webhook attempts to insert a `PaymentEvent`
* `stripeSessionId` is **unique** in the database
* If insertion fails due to a duplicate, the event is safely ignored
* Stripe receives `200 OK` for already-processed events

This approach is:

* Safe under concurrent delivery
* Safe across server restarts
* Easy to audit

### Ledger-first approach

Even if no booking matches a payment, the webhook event is still recorded.

Benefits:

* Full audit trail
* Easier debugging
* Protection against replay attacks

---

## Acknowledgement (ACK) policy

| Situation                      | HTTP response          |
| ------------------------------ | ---------------------- |
| Invalid Stripe signature       | `400` (no retry)       |
| Successful processing          | `200`                  |
| Already processed (idempotent) | `200`                  |
| Processing error               | `500` (Stripe retries) |

---

## Running the project (Docker)

### Requirements

* Docker Desktop

### Start

```bash
docker compose up --build
```

Backend runs on:

```
http://localhost:3000
```

### Health check

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{ "status": "ok" }
```

---

## Configuration

Environment variables are loaded from `apps/backend/.env` (via Docker Compose).

Key variables:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...

STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> Secrets must never be committed to the repository.

---

## Project scope (intentional limitations)

This repository deliberately does **not** include:

* A React frontend
* Microservices
* Kubernetes or cloud-specific infrastructure
* Advanced Stripe features (subscriptions, billing portal, etc.)

The focus is on **doing a small number of things extremely well**.

---

## What I can deliver using this reference

* Stripe Checkout integration from scratch
* Stripe webhook hardening and idempotence fixes
* Backend reliability audits
* Payment bug investigation and remediation
* Dockerization of existing Node.js backends

Typical engagement: **short, well-scoped missions (≈ 20–30 hours/week)**.

---

## Operations

See `RUNBOOK.md` for:

* Debugging Stripe webhooks
* Restarting services
* Database migrations
* Common operational checks
  n---

## Status

This project is **frozen** and used as a **production reference**.
It evolves only when required by real-world client work.
