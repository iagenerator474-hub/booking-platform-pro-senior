# SECURITY

## Threat model (pragmatic)
- Brute-force on login
- Session fixation
- Unauthorized access to admin routes
- Webhook replay / duplicate events
- Information leakage through errors

## Controls in place
### Authentication
- Password hashing
- Login validates body schema
- Session regeneration on login (anti session fixation)
- Session stores minimal user payload (id/email/role)

### Authorization (RBAC)
- `requireAuth` returns 401 JSON for API routes
- `requireRole` enforces role access (ADMIN/OPS/READONLY)
- Admin metrics endpoint protected

### Rate limiting
- Login rate limited (brute-force protection)
- Webhook rate limited (abuse protection, allow Stripe retry bursts)

### Stripe webhook safety
- Raw body + signature verification
- DB ledger for event processing (idempotence via unique keys)
- Strict ACK semantics

### Cookies / sessions
- httpOnly cookies
- secure cookies in production
- sane sameSite default
- trust proxy supported for TLS termination setups

## What we intentionally do NOT do (yet)
- CSRF tokens (evaluate if same-site cookies are insufficient for the deployment context)
- MFA (out of scope for this reference backend)
- Complex WAF rules (kept lightweight by design)

## Security checklist for deployment
- Set strong `SESSION_SECRET`
- Use HTTPS in production
- Ensure `TRUST_PROXY` is correctly set behind a reverse proxy
- Ensure Stripe secrets are not logged
- Run `npm test` and DB migrations before deploy

