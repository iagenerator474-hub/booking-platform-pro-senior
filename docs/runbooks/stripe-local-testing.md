@'
# Runbook — Stripe local testing (Checkout + Webhook)

## Goal
Validate the full payment flow in local dev:
Checkout → Stripe → Webhook → DB update → Booking status = `payé`.

## Golden rule
If Stripe CLI is not running, webhooks will NOT reach your local server → bookings remain `en attente`.

## Start sequence (order matters)

### 1) Database (PostgreSQL)
From repo root:
```bash
docker compose up -d
docker compose ps

Expected: the DB container is Up and exposes port 5432.

2) Backend (Express)
cd apps/backend
npm install
npm run dev


Expected: Server running on port 4242

If you see EADDRINUSE (port already used), kill the existing process (Windows):

netstat -ano | findstr :4242
taskkill /PID <PID> /F

3) Stripe webhook forwarding (Stripe CLI)

Open a second terminal, then:

.\stripe listen --forward-to http://localhost:4242/webhook


Stripe CLI prints a webhook signing secret:
whsec_...

Copy it into:
apps/backend/.env

STRIPE_WEBHOOK_SECRET=whsec_...


Restart the backend after updating .env (stop with Ctrl+C, then npm run dev again).

Quick payment test

Create a booking via the UI/dashboard

Start Stripe Checkout

Pay with a Stripe test card (example: 4242 4242 4242 4242, any future date, any CVC)

Confirm:

Stripe CLI receives checkout.session.completed

the booking status becomes payé

Verification checklist

 docker compose ps shows DB container is Up

 Backend logs show Server running on port 4242

 Stripe CLI shows Ready! and prints whsec_...

 After payment, Stripe CLI receives checkout.session.completed

 Booking status becomes payé

Troubleshooting
Booking stuck in en attente

Most common causes:

Stripe CLI is not running → webhook never reaches local server

STRIPE_WEBHOOK_SECRET is outdated (Stripe secret changes each time you run stripe listen)

Backend receives the webhook but signature verification fails

What to check:

Stripe CLI terminal: do you see checkout.session.completed?

Backend terminal: do you see Webhook Error: ...?

Ensure .env uses the latest whsec_... from Stripe CLI, then restart backend.

Optional: DB inspection (Prisma Studio)

From repo root:

npx prisma studio --schema apps/backend/prisma/schema.prisma


Check:

Booking.status changed to payé

PaymentEvent contains an entry for the Stripe event (idempotency ledger)
'@ | Set-Content -Path "docs\runbooks\stripe-local-testing.md" -Encoding UTF8


---

## ✅ Vérifier que c’est bien créé
```powershell
dir docs\runbooks


Tu dois voir :
stripe-local-testing.md