# ADR-0002 — Observability & audit-ready backend (v2.2.0)

**Status**: Accepted  
**Target version**: `v2.2.0-observability`  
**Related**: ADR-0001 (Stripe idempotent webhook)

## Context

`booking-platform-pro-senior` now runs with a production-like runtime (`v2.1.1-runtime-stable`) and handles:

- Stripe Checkout + Webhook processing
- Idempotence using a DB ledger (`PaymentEvent`)
- Booking state changes as a business source of truth

This creates *real* operational expectations:

- Incident diagnosis without reading code
- Traceability for financial events (audit & support)
- Fast correlation between HTTP requests, Stripe events, and booking updates

## Problem

When something goes wrong (webhook retries, booking mismatch, DB issues), the system must answer:

- what happened?
- in which order?
- for which request / event?
- what business entities were impacted?

Without standardized logs, diagnosis becomes slow, error-prone, and dependent on the original developer.

## Decision

Implement a minimal but professional observability layer, native to the Express runtime:

1. **Structured JSON logs** with consistent fields
2. **`requestId` correlation** for every HTTP request
3. **Centralized error handling** with safe client responses and rich server logs
4. **Audit logs** for critical business flows (Stripe webhook & booking/payment)

## Scope (in v2.2.0)

### Included

- request-scoped logger attached to `req.log`
- `x-request-id` propagation (in/out)
- HTTP access logs (received / completed)
- 404 logs
- central error handler middleware
- explicit audit logs for:
  - `stripe.webhook.received`
  - `stripe.webhook.duplicate_ignored`
  - `stripe.webhook.processing_failed`
  - `booking.payment_confirmed`
  - `booking.checkout_session.*`

### Excluded (non-goals)

- OpenTelemetry / distributed tracing
- metrics / dashboards (Prometheus/Grafana)
- log aggregation stacks (ELK/Loki/Datadog)
- alerting

These can come later once a clean baseline exists.

## Consequences

### Positive

- Faster incident resolution
- Auditability for payments and booking state changes
- Better freelance/production credibility (operations-minded)
- Foundation for future monitoring

### Tradeoffs

- Slight runtime overhead (logging)
- Requires discipline: actions should be logged intentionally and consistently

## Acceptance criteria

- Every HTTP request has a `requestId`
- A Stripe event can be traced through logs end-to-end
- Duplicate Stripe events are visible (warn) and do not change business state twice
- Server errors return a safe response containing `requestId`
- No change to business behavior (no regressions)
