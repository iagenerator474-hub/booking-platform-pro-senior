# booking-platform-pro-senior

Backend de référence **prêt pour une mise en prod simple** : **Express + PostgreSQL + Prisma + Stripe Checkout**.

Ce dépôt n’est volontairement **pas un SaaS**. Il montre comment livrer un backend **fiable**, qui gère les paiements correctement, résiste aux retries Stripe, et reste **opérable** (logs, healthchecks, runbook).

---

## Ce que ce backend démontre

### Paiements Stripe robustes
- Stripe Checkout
- Webhooks **signés** (raw body + verification)
- **Idempotence en base** via `stripeSessionId` (pas de double traitement)
- Ledger `PaymentEvent` pour audit/debug
- Politique d’ACK claire (quand renvoyer 200 / 400 / 500)

### Backend fiable (scope freelance)
- PostgreSQL comme source de vérité
- Prisma (migrations + transactions)
- Validation d’input (Zod)
- Logs corrélables via `requestId`
- Endpoints `/health` et `/health/db`

### Sécurité pragmatique
- Rate limit sur login
- Rate limit sur webhook public
- Cookies de session “prod-safe” (httpOnly / secure / sameSite)
- Headers de sécurité (Helmet)

---

## Démarrage rapide (Docker + Postgres)

### 1) Préparer l’environnement
Copier `apps/backend/.env.example` en `apps/backend/.env` et remplir :
- `SESSION_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- (optionnel) `ADMIN_EMAIL`, `ADMIN_PASSWORD`

### 2) Lancer
```bash
docker compose up --build
