# RUNBOOK — booking-platform-pro-senior

Ce runbook décrit les procédures opérationnelles (local/prod léger Docker) pour diagnostiquer et corriger rapidement les incidents.

- Backend: Node.js + Express
- DB: PostgreSQL 16
- ORM: Prisma
- Paiements: Stripe Checkout + webhooks signés + idempotence en base
- Observabilité minimale: requestId + logs + compteurs webhook
- Endpoints santé: `/health` et `/health/db`

> Objectif: remettre le service en état "OK" rapidement, sans bricolage.

---

## 0) Pré-requis

### Variables d’environnement critiques
- `DATABASE_URL` (Postgres)
- `SESSION_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STORAGE_DRIVER=db` (requis pour mode DB)

### Ports
- Backend: `3000`
- Postgres: `5432`

---

## 1) Commandes utiles

### État général Docker
```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f db




Vérification santé
curl -s http://localhost:3000/health
curl -s http://localhost:3000/health/db

Se connecter à Postgres (dans le container)
docker exec -it booking_platform_db psql -U booking -d booking_platform

Exécuter une migration (container backend)

En prod: prisma migrate deploy

docker exec -it booking_platform_backend sh -lc "npx prisma migrate deploy"

2) Healthchecks
/health

Doit répondre 200 si le backend tourne.

Si KO: vérifier logs backend + port + env.

/health/db

Doit répondre 200 si la DB est joignable.

Si KO: DB down, mauvais DATABASE_URL, réseau Docker.

3) Incidents — Stripe Webhooks
3.1 Webhook Stripe en retry / boucle

Symptôme

Stripe Dashboard montre des retries sur l’endpoint webhook

logs backend montrent des erreurs répétées sur webhook

Causes fréquentes

STRIPE_WEBHOOK_SECRET incorrect

raw body cassé (middleware JSON appliqué avant le webhook)

DB down -> impossibilité de créer le ledger/idempotence

exceptions non catchées

Actions

Vérifier logs backend autour des requêtes webhook

docker compose logs -f backend


Vérifier le secret

s’assurer que STRIPE_WEBHOOK_SECRET correspond exactement à celui du Dashboard (endpoint concerné)

Vérifier DB

curl -s http://localhost:3000/health/db


Interprétation des codes HTTP (règle)

200 : Stripe considère l’event traité

400 : Stripe ne retry pas (à utiliser seulement si l’event est invalide / signature invalide)

500 : Stripe retry (incident à corriger)

Politique recommandée: signature invalide => 400, erreur interne/DB => 500 (retry utile), succès/idempotent => 200.

3.2 Signature invalide (Stripe)

Symptôme

logs: "Invalid signature" ou équivalent

Stripe marque l’event failed (pas retry si 400)

Actions

Vérifier STRIPE_WEBHOOK_SECRET

Vérifier que l’endpoint configuré côté Stripe correspond au bon path

Vérifier que le serveur ne modifie pas le body avant vérification signature (raw body requis)

3.3 Event traité plusieurs fois (double paiement / double booking)

Symptôme

Le même event semble déclencher deux fois un effet métier

Attendu

Le système doit être idempotent via DB (stripeSessionId unique / ledger)

Actions

Vérifier que l’idempotence DB est active (mode DB)

STORAGE_DRIVER=db

Vérifier en DB l’existence du même stripeSessionId

SELECT stripeSessionId, COUNT(*)
FROM "Booking"
WHERE stripeSessionId IS NOT NULL
GROUP BY stripeSessionId
HAVING COUNT(*) > 1;


Vérifier le ledger des events

SELECT "stripeEventId", "type", "stripeSessionId", "processedAt"
FROM "PaymentEvent"
ORDER BY "processedAt" DESC
LIMIT 50;


Si des doublons apparaissent: incident P0 => corriger avant prod.

4) Incidents — Base de données
4.1 DB down / /health/db KO

Symptôme

/health OK mais /health/db KO

erreurs Prisma/pg dans les logs

Actions

Vérifier que Postgres tourne

docker compose ps
docker compose logs -f db


Vérifier DATABASE_URL (dans docker compose, le host doit être db)
Exemple:
postgres://booking:booking@db:5432/booking_platform

Redémarrer DB

docker compose restart db


Vérifier les migrations

docker exec -it booking_platform_backend sh -lc "npx prisma migrate deploy"

4.2 Migration cassée / Prisma error au démarrage

Symptôme

le backend ne démarre pas (ou crash) après migrate deploy

Actions

Lire l’erreur complète dans les logs backend

Si migration récente: rollback applicatif (revenir au tag précédent) est souvent plus rapide que “bricoler” la DB.

Rollback simple (revenir à un tag stable)

Checkout d’un tag stable

rebuild docker

git checkout v2.5.7-prod-hardening
docker compose down
docker compose up --build

5) Incidents — Auth / Sessions
5.1 Routes API renvoient une redirection /login

Symptôme

le client API reçoit 302 vers /login au lieu d’un 401 JSON

Attendu

API => 401 JSON

Pages => redirection /login

Fix

routes API utilisent requireAuthApi

pages utilisent requireAuthPage

middlewares/requireAuth.js doit pointer sur requireAuthApi

5.2 Cookies/sessions ne marchent pas en prod

Causes fréquentes

cookies secure mal configurés derrière proxy HTTPS

trust proxy non défini

Actions

vérifier NODE_ENV=production

vérifier configuration session/cookies (httpOnly/sameSite/secure)

si reverse-proxy: s’assurer que app.set("trust proxy", 1) est configuré (selon infra)

6) Observabilité / logs
requestId

Chaque requête a un requestId dans les logs.
Utiliser le requestId pour corréler une requête client et ses sous-actions (DB, webhook, etc).

Compteurs webhook

Si des compteurs existent (succès/duplicate/failed), les consulter pour identifier:

pics de retry

augmentations de duplicates (idempotence)

erreurs DB (corrélé à /health/db)

7) Checklist “prod léger” avant mise en ligne

 STORAGE_DRIVER=db

 /health OK

 /health/db OK

 STRIPE_WEBHOOK_SECRET configuré

 webhook endpoint configuré dans Stripe Dashboard

 rate limit activé sur login + webhook

 logs lisibles + requestId

 migrations Prisma appliquées (migrate deploy)

 test d’un paiement complet en mode test Stripe

8) Tests rapides post-déploiement

Healthchecks

curl -i https://<host>/health
curl -i https://<host>/health/db


Stripe test payment (mode test) -> vérifier:

session checkout OK

webhook reçu

booking/payment créé 1 seule fois

ledger PaymentEvent rempli


---

## Commit + tag RUNBOOK

Une fois collé :
```powershell
git add RUNBOOK.md
git commit -m "docs: add operational runbook"
git push


Puis tag:

git tag v2.5.7-runbook
git push origin v2.5.7-runbook