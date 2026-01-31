const { prisma } = require("../../infra/prisma");

/**
 * Insert idempotent d'un event Stripe (ledger).
 * Retourne { alreadyProcessed: true } si stripeEventId existe déjà.
 */
async function tryRegisterStripeEvent({
  stripeEventId,
  type,
  stripeSessionId,
  bookingId,
  db,
}) {
  const client = db || prisma;
  try {
    await client.paymentEvent.create({
      data: {
        stripeEventId,
        type,
        stripeSessionId: stripeSessionId || null,
        bookingId: bookingId || null,
      },
    });
    return { alreadyProcessed: false };
  } catch (err) {
    if (err && err.code === "P2002") return { alreadyProcessed: true };
    throw err;
  }
}

module.exports = { tryRegisterStripeEvent };
