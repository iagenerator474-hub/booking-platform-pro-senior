# Security Policy

## Supported Versions

This repository is a **frozen production reference**.

Only tagged versions are considered supported.

| Version | Status |
|--------|--------|
| `v2.5.x` | ✅ Supported |
| `< v2.5.0` | ❌ Not supported |

Security fixes, if any, will be released as new tags.

---

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

### How to report

- **Do not open a public issue**
- Send a report by email with:
  - A clear description of the issue
  - Steps to reproduce (if possible)
  - Impact assessment
  - Suggested fix (optional)

You will receive an acknowledgment within a reasonable timeframe.

---

## Security Design Principles

This backend follows **pragmatic security principles**, focused on real-world risks.

### Scope-driven security
The project intentionally avoids unnecessary complexity:
- No microservices
- No background workers
- No client-side secrets
- No custom crypto

This reduces the attack surface.

---

## Authentication & Access

- Passwords are hashed (never stored in clear text)
- Login endpoints are protected by **strict rate limiting**
- Session-based authentication is used
- Role-based access is enforced where required

---

## Stripe & Payment Security

### Webhook signature verification
- All Stripe webhooks are verified using Stripe’s official SDK
- Invalid signatures result in immediate `400` responses

### Idempotence (critical)
- Payment processing is **idempotent at the database level**
- `stripeSessionId` is enforced as unique
- Duplicate webhook deliveries cannot trigger double processing

### Ledger-first approach
- All valid Stripe events are persisted, even if no business entity matches
- This ensures:
  - Auditability
  - Replay protection
  - Post-incident analysis

---

## Rate Limiting

Rate limiting is applied intentionally and selectively:

| Endpoint | Purpose |
|--------|--------|
| Login | Anti brute-force |
| Stripe webhooks | Public endpoint protection |

Stripe webhooks remain permissive to avoid blocking legitimate retries.

---

## Input Validation & Error Handling

- Inputs are validated at the API boundary
- Errors are handled explicitly
- Internal errors are never leaked to clients
- Structured logs are used for traceability

---

## Secrets Management

- Secrets are provided via environment variables
- Secrets are never committed
- Secrets are never logged
- `.env.example` documents required variables

---

## Transport Security

- HTTPS is assumed to be terminated upstream (reverse proxy / load balancer)
- Security headers are applied at the application level
- Cookie flags are set appropriately for production usage

---

## Known Limitations

This project does **not** aim to cover:
- Advanced threat modeling
- Penetration testing
- Compliance frameworks (PCI, SOC2, ISO)

It is designed as a **solid, honest backend reference**, not a security product.

---

## Philosophy

Security is treated as:
- A **design constraint**
- Not a feature
- Not marketing

The goal is to be **correct, boring, and reliable**.

---
✔️ Ce que tu as maintenant

README client-facing

RUNBOOK exploitation

SECURITY.md GitHub-compatible

Docker + healthcheck

Stripe robuste et auditable
