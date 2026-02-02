# TESTING

This repo uses fast integration tests to validate Stripe Checkout and webhook reliability.

## Run
- `npm test`

## What is covered
- Create Checkout Session endpoint (contract + payload)
- Webhook signature handling (reject invalid/missing signature with 400)
- Webhook ACK policy: 200 on success/duplicate, 500 on processing failure (Stripe retry)
- DB-level idempotence on `stripeSessionId` (duplicates do not create extra ledger rows)
- Ledger persistence even when no booking matches (audit trail, no infinite retries)

Reference tags: `v2.5.3-docs-final` (docs), `v2.5.4-hardening-final` (hardening), `v2.5.5-tests-green` (tests green).
