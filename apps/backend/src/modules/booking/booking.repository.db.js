const { prisma } = require("../../infra/prisma");

/**
 * List all bookings (DB)
 */
function list() {
  return prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create a pending booking (DB)
 * Same API as JSON repository
 */
function createPending({ firstName, lastName, email, date, time, stripeSessionId }) {
  return prisma.booking.create({
    data: {
      firstName,
      lastName,
      email,
      date,
      time,
      status: "en attente",

      // Stripe / payment fields (not used yet)
      stripeSessionId: stripeSessionId || null,
      stripePaymentIntentId: null,
      amountTotal: null,
      currency: null,
    },
  });
}

/**
 * Find booking by Stripe Checkout Session id (DB)
 * Recommended to keep stripeSessionId unique in schema.
 */
function findByStripeSessionId(stripeSessionId) {
  if (!stripeSessionId) return null;
  return prisma.booking.findFirst({
    where: { stripeSessionId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Mark booking as paid by id (DB)
 */
function markPaidById(id) {
  if (!id) return null;
  return prisma.booking.update({
    where: { id },
    data: { status: "payé" },
  });
}

/**
 * Mark booking as paid using metadata (DB)
 * Same logic as JSON repository
 */
async function markPaidByMetadata({ email, date, time }) {
  const found = await prisma.booking.findFirst({
    where: { email, date, time },
    orderBy: { createdAt: "desc" },
  });

  if (!found) return null;

  return prisma.booking.update({
    where: { id: found.id },
    data: { status: "payé" },
  });
}

module.exports = {
  list,
  createPending,
  markPaidByMetadata,
  findByStripeSessionId,
  markPaidById,
};
