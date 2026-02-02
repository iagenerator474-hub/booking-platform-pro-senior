# Booking Platform — Backend Reference (Stripe Checkout)

This repository is a **reference backend project** focused on **Stripe Checkout with signed webhooks and strict idempotence**.

It is **not** a SaaS, template generator, or full product.
The goal is to demonstrate a **reliable, explainable, and auditable** payment flow with a **simple Express backend**.

---

## 🎯 Scope & Intent

* Backend-first, **DB as source of truth**
* Stripe Checkout (hosted UI)
* **Signed webhooks** as the only payment confirmation
* **Idempotence** at event and business levels
* Simple, readable Express architecture

**Out of scope (by design):**

* Custom Payment Intents flows
* Frontend frameworks
* Microservices / queues / cloud-specific infra
* “Senior-level” abstractions or patterns for their own sake

---

## 🔍 Feedback wanted

I’m sharing this repository to get **technical feedback**, especially on:

* Stripe Checkout **webhook flow** (signature verification, retries, idempotence)
* Express backend **structure & boundaries**
* **Prisma schema**, constraints, and transactions
* **Security hardening** (cookies, rate limiting, trust boundaries)

You **don’t need to run the project or open a PR**.
Comments and issues are more than enough.

---

## 🧭 Architecture overview

High-level flow:

1. Frontend triggers a checkout intent (order/booking id only)
2. Backend loads data from DB and computes the price
3. Backend creates a **Stripe Checkout Session**
4. User pays on Stripe-hosted page
5. Stripe sends a **signed webhook** (`checkout.session.completed`)
6. Backend verifies signature, ensures idempotence, and updates DB

**Key principles:**

* Frontend never validates payments
* Redirect URLs are UX-only
* Webhook is the single source of truth
* Database is the final authority

---

## 🔐 Stripe & Payments

* Stripe Checkout Sessions
* Signed webhooks (`rawBody` + `WEBHOOK_SECRET`)
* Event filtering (`checkout.session.completed` only)
* **Idempotence**:

  * `stripeEventId` (event-level)
  * `stripeSessionId` (business-level)
* Atomic updates via Prisma transactions

A `PaymentEvent` ledger is used for auditability and incident debugging.

---

## 🧪 Tests

Tests focus on **business-critical scenarios**, not coverage metrics:

* Valid payment confirmation
* Duplicate webhooks (Stripe retries)
* Already-paid bookings
* Error paths that must trigger Stripe retries

Their purpose is to **lock invariants** around money and prevent regressions.

---

## 🔐 Security

* No trust in frontend input
* Prices computed server-side only
* Rate limiting on sensitive routes
* Cookie/session hardening
* No secrets committed (env-based configuration)

See `SECURITY.md` for details.

---

## 📂 Repository structure

```
apps/
  backend/        # Express backend
  frontend/       # Minimal static frontend (demo only)
docs/             # ADRs, audit notes, runbook
prisma/           # Schema & migrations
scripts/          # Utilities
```

---

## 🚀 Running locally (minimal)

```bash
cd apps/backend
npm install
npm run dev
```

Stripe CLI is recommended for local webhook testing.
See `RUNBOOK.md` for step-by-step instructions.

---

## 🧾 How to give feedback

Please use **GitHub Issues**.

If possible, classify feedback as:

* **P0** – critical / dangerous
* **P1** – important improvement
* **P2** – nice to have

Pull requests are **not required**.

---

## 📄 License

MIT — this project is shared for learning, discussion, and reference.
