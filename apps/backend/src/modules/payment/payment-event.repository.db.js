const { prisma } = require("../../infra/prisma");

/**
 * Insert idempotent d'un event Stripe (ledger).
 *
 * ✅ P0 hardening: on privilégie l'idempotence par stripeSessionId (checkout session)
 * pour se protéger des doublons concurrentiels / crash / multi-instances.
 *
 * Retourne { alreadyProcessed: true } si l'unicité DB (stripeSessionId ou stripeEventId)
 * est violée.
 */
async function tryRegisterStripeEvent({
  stripeEventId,
  type,
  stripeSessionId,
  bookingId,
  db,
}) {
  const client = db || prisma;

  // Pour checkout.session.completed, stripeSessionId est la clé métier.
  // Si on ne l'a pas, on ne peut pas garantir l'idempotence attendue.
  // On laisse remonter l'erreur et la policy ACK (500) gère le retry.
  if (!stripeSessionId) {
    const err = new Error("stripeSessionId missing");
    err.code = "STRIPE_SESSION_ID_MISSING";
    throw err;
  }

  try {
    await client.paymentEvent.create({
      data: {
        stripeEventId,
        type,
        stripeSessionId,
        bookingId: bookingId || null,
      },
    });

    return { alreadyProcessed: false, duplicateTarget: null };
  } catch (err) {
    // Prisma unique constraint violation
    if (err && err.code === "P2002") {
      // err.meta.target peut indiquer quel champ unique a déclenché (ex: ["stripeSessionId"])
      const duplicateTarget = err?.meta?.target || null;
      return { alreadyProcessed: true, duplicateTarget };
    }
    throw err;
  }
}

module.exports = { tryRegisterStripeEvent };
