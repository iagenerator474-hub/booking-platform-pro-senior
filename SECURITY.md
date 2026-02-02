# Security Policy

This repository is a **frozen production reference**.

It demonstrates **pragmatic, real-world security choices** for a payment backend,
not a comprehensive security framework or a compliance product.

---

## Supported Versions

Only tagged versions are considered supported.

| Version | Status |
|-------|--------|
| `v2.5.x` | ✅ Supported |
| `< v2.5.0` | ❌ Not supported |

If a security issue is addressed, it will be released as a **new tag**.
Earlier versions are not maintained.

---

## Reporting a Vulnerability

If you discover a security issue, please report it **responsibly**.

### How to report

- **Do not open a public issue**
- Contact the maintainer privately with:
  - A clear description of the issue
  - Steps to reproduce (if applicable)
  - Impact assessment
  - Suggested fix (optional)

Reports will be acknowledged within a reasonable timeframe.

---

## Security Design Principles

This backend follows **scope-driven, pragmatic security principles**.

Security decisions are guided by:
- realistic threat models
- minimal attack surface
- operational simplicity

### Intentional scope limits

This project deliberately avoids:
- microservices
- background workers
- client-side secrets
- custom cryptography

Reducing complexity is a **security decision**.

---

## Authentication & Access Control

- Passwords are **hashed**, never stored in clear text
- Login endpoints use **strict rate limiting** (anti brute-force)
- Session-based authentication
- Role-based access enforced where required

---

## Stripe & Payment Security

### Webhook signature verification

- All Stripe webhooks are verified using Stripe’s official SDK
- Invalid signatures receive an immediate **`400` response**
- Raw request body is used for verification

### Database-level idempotence (critical)

- Payment processing is idempotent **at the database level**
- `stripeSessionId` is enforced as **unique**
- Duplicate webhook deliveries cannot trigger double processing

### Ledger-first design

- All valid Stripe events are persisted, even if no business entity matches
- This enables:
  - full auditability
  - replay protection
  - post-incident analysis

---

## Rate Limiting

Rate limiting is applied selectively:

| Endpoint | Purpose |
|--------|--------|
| Login | Anti brute-force |
| Stripe webhooks | Public endpoint protection |

Webhook limits remain permissive to avoid blocking legitimate Stripe retries.

---

## Input Validation & Error Handling

- Input validation at API boundaries
- Explicit error handling
- Internal errors are never leaked to clients
- Structured logs for traceability and debugging

---

## Secrets Management

- Secrets are provided via environment variables
- Secrets are never committed
- Secrets are never logged
- Required variables are documented in `.env.example`

---

## Transport & Headers

- HTTPS termination is assumed upstream (reverse proxy / load balancer)
- Security headers are applied at the application level
- Cookies use appropriate production flags

---

## Known Limitations

This repository does **not** aim to provide:
- advanced threat modeling
- penetration testing
- compliance frameworks (PCI, SOC2, ISO)

It is a **production-ready backend reference**, not a security product.

---

## Philosophy

Security is treated as:
- a **design constraint**
- not a feature
- not a marketing argument

The goal is to be **correct, boring, and reliable**.
