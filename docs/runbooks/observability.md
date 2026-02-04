# Runbook — Observability (v2.2.0)

This runbook explains how to use the v2.2 structured logs to diagnose incidents.

## Key concepts

- Every HTTP request has a `requestId`.
- The server returns `x-request-id` in responses.
- All logs are JSON (one line per event).

## Quick grep recipes

### 1) Trace a single request end-to-end

```bash
# replace with a real requestId
RID="<requestId>"

grep "\"requestId\":\"${RID}\"" -n server.log
```

You should see (order may vary):
- `http.request.received`
- business actions (booking/stripe)
- `http.request.completed` OR `http.request.failed`

### 2) Trace a Stripe event

```bash
EID="<stripeEventId>"

grep "\"stripeEventId\":\"${EID}\"" -n server.log
```

Expected signals:
- `stripe.webhook.received`
- `stripe.webhook.duplicate_db_ignored` (if Stripe retried) OR
- `booking.payment_confirmed` / `stripe.webhook.acknowledged`
- `stripe.webhook.processing_failed` (if something broke)

### 3) Filter webhook logs by outcome

Every webhook path logs an **outcome**: `processed`, `duplicate`, or `rejected`.

```bash
# First-time processed
grep '"outcome":"processed"' -n server.log

# Duplicates (idempotence — normal on Stripe retries)
grep '"outcome":"duplicate"' -n server.log

# Rejected (invalid signature or processing error)
grep '"outcome":"rejected"' -n server.log
```

### 4) Find duplicate Stripe event processing

```bash
grep '"action":"stripe.webhook.duplicate_db_ignored"' -n server.log
```

This should be **normal** occasionally (Stripe retries), and indicates idempotence is working.

## Webhook counters (GET /admin/metrics)

Requires authentication (ADMIN or OPS). Response includes:

```json
{ "webhook": { "received": 42, "duplicates": 3, "errors": 0 } }
```

- **received**: webhooks with valid signature (since process start)
- **duplicates**: events already processed (idempotence)
- **errors**: invalid signature or processing failure

Counters are in-memory; they reset on process restart.

## Interpreting common log actions

| action | outcome | level | meaning | what to do |
|---|---|---|---:|---|
| `http.request.failed` | — | error | unhandled failure during request | look up `requestId` then fix root cause (DB, env, code) |
| `stripe.webhook.signature_invalid` | rejected | warn | invalid Stripe signature | check Stripe CLI secret / webhook secret |
| `stripe.webhook.processing_failed` | rejected | error | webhook processing failed | check DB availability, Prisma, and event ledger insert |
| `stripe.webhook.duplicate_db_ignored` | duplicate | warn | Stripe retry safely skipped | no action, unless too frequent |
| `booking.payment_confirmed` / `stripe.webhook.acknowledged` | processed | info | first-time processed or ack | normal |

## Notes

- Logs contain stack traces only when `NODE_ENV != production`.
- The goal is diagnosis and auditability without a vendor tool.
