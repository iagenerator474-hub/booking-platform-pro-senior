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
- `stripe.webhook.duplicate_ignored` (if Stripe retried) OR
- `booking.payment_confirmed`
- `stripe.webhook.processing_failed` (if something broke)

### 3) Find duplicate Stripe event processing

```bash
grep '"action":"stripe.webhook.duplicate_ignored"' -n server.log
```

This should be **normal** occasionally (Stripe retries), and indicates idempotence is working.

## Interpreting common log actions

| action | level | meaning | what to do |
|---|---:|---|---|
| `http.request.failed` | error | unhandled failure during request | look up `requestId` then fix root cause (DB, env, code) |
| `stripe.webhook.signature_invalid` | warn | invalid Stripe signature | check Stripe CLI secret / webhook secret |
| `stripe.webhook.processing_failed` | error | webhook processing failed | check DB availability, Prisma, and event ledger insert |
| `stripe.webhook.duplicate_ignored` | warn | Stripe retry safely skipped | no action, unless too frequent |
| `booking.payment_confirmed` | info | booking state updated to paid | normal |

## Notes

- Logs contain stack traces only when `NODE_ENV != production`.
- The goal is diagnosis and auditability without a vendor tool.
