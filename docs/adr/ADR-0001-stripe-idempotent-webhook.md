# ADR-0001 — Stripe Webhook Idempotency

## Status
Accepted

## Context
The application uses Stripe Checkout with webhooks to update booking payment status.
Stripe webhooks can be retried multiple times in case of network issues, timeouts, or temporary errors.

Without explicit idempotency guarantees, the same Stripe event or session could be processed multiple times,
leading to duplicated side effects (e.g. multiple state transitions, inconsistent payment state).

The current system identifies bookings using `stripeSessionId`, which is already stored and unique in the database.

## Decision
We implement a two-level idempotency strategy for Stripe webhooks:

1. **Event-level idempotency**
   - Each Stripe webhook event is identified by `stripeEventId`.
   - Each event is processed at most once.
   - Replayed events are acknowledged with HTTP 200 and ignored.

2. **Business-level idempotency**
   - A Stripe Checkout Session (`stripeSessionId`) can trigger a booking state transition only once.
   - If the booking is already in a final paid state, no additional side effects are applied.

The database is the single source of truth for idempotency decisions.

A minimal payment event ledger is introduced to ensure traceability and auditability.

## Consequences
- Webhook handlers become safe to replay an unlimited number of times.
- Payment state transitions are deterministic and exactly-once at the business level.
- Payment events can be audited and debugged using persisted records.
- No breaking changes to existing APIs or booking flows.

## Non-Goals
- Full financial reconciliation system.
- Refund or dispute management.
- Multi-currency accounting logic.

## Alternatives Considered
- Relying solely on Stripe retries without persistence (rejected: unsafe).
- In-memory idempotency (rejected: not resilient to restarts).
