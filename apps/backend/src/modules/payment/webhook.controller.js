const express = require("express");
const router = express.Router();

const stripe = require("../../config/stripe");
const { STRIPE_WEBHOOK_SECRET } = require("../../config/env");

const { tryRegisterStripeEvent } = require("./payment-event.repository.db");
const { prisma } = require("../../infra/prisma");

/**
 * ✅ Signature verification isolated & injectable (mockable)
 */
function verifyStripeEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}

// ✅ expose on router so tests can spy/mock it
router.verifyStripeEvent = verifyStripeEvent;

router.post("/", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const rawBody = req.body;

  if (req.log) {
    req.log.info({
      module: "stripe",
      action: "stripe.webhook.http_received",
      message: "Stripe webhook HTTP request received",
    });
  }

  // 1) Verify signature (only this part returns 400)
  let event;
  try {
    event = router.verifyStripeEvent(rawBody, sig);
  } catch (err) {
    if (req.log) {
      req.log.warn({
        module: "stripe",
        action: "stripe.webhook.signature_invalid",
        message: "Invalid Stripe webhook signature",
        error: { message: err.message },
      });
    }
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (req.log) {
    req.log.info({
      module: "stripe",
      action: "stripe.webhook.received",
      message: "Stripe webhook verified",
      stripeEventId: event.id,
      stripeEventType: event.type,
    });
  }

  // Only handle the event(s) we care about; ACK 200 for the rest
  if (event.type !== "checkout.session.completed") {
    return res.json({ received: true });
  }

  const session = event.data.object;

  try {
    const stripeSessionId = session.id;

    const result = await prisma.$transaction(async (tx) => {
      // ✅ Business-level idempotency: booking is the source of truth via stripeSessionId
      const booking = await tx.booking.findUnique({
        where: { stripeSessionId },
      });

      // ✅ Option A: If no booking => ACK 200 + log, do NOT create PaymentEvent
      if (!booking) {
        return { noBooking: true, bookingId: null };
      }

      // ✅ Business-level duplicate: already paid => no-op, do NOT create PaymentEvent
      if (booking.status === "payé") {
        return { alreadyPaid: true, bookingId: booking.id };
      }

      // Now that we know the booking exists and isn't already paid,
      // we can register the Stripe event idempotently (event-level).
      const { alreadyProcessed } = await tryRegisterStripeEvent({
        stripeEventId: event.id,
        type: event.type,
        stripeSessionId,
        bookingId: booking.id,
        db: tx,
      });

      if (alreadyProcessed) {
        return { alreadyProcessed: true, bookingId: booking.id };
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "payé",
          // Keep DB enriched with Stripe info when available
          stripePaymentIntentId: session.payment_intent ?? null,
          amountTotal: session.amount_total ?? null,
          currency: session.currency ?? null,
        },
      });

      return { bookingUpdated: true, bookingId: booking.id };
    });

    // Logging outcomes
    if (result.noBooking) {
      if (req.log) {
        req.log.info({
          module: "stripe",
          action: "stripe.webhook.no_booking",
          message: "No matching booking found for stripeSessionId (ack, no DB write)",
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeSessionId,
        });
      }
      return res.json({ received: true });
    }

    if (result.alreadyPaid) {
      if (req.log) {
        req.log.warn({
          module: "stripe",
          action: "stripe.webhook.duplicate_business_ignored",
          message: "Booking already paid (business idempotent skip)",
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeSessionId,
          bookingId: result.bookingId,
        });
      }
      return res.json({ received: true });
    }

    if (result.alreadyProcessed) {
      if (req.log) {
        req.log.warn({
          module: "stripe",
          action: "stripe.webhook.duplicate_ignored",
          message: "Stripe event already processed (event idempotent skip)",
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeSessionId,
          bookingId: result.bookingId,
        });
      }
      return res.json({ received: true });
    }

    if (req.log) {
      req.log.info({
        module: "booking",
        action: "booking.payment_confirmed",
        message: "Booking marked as paid",
        stripeEventId: event.id,
        stripeEventType: event.type,
        stripeSessionId,
        bookingId: result.bookingId,
      });
    }

    return res.json({ received: true });
  } catch (error) {
    // ✅ Strict ACK policy: 500 => Stripe retries
    if (req.log) {
      req.log.error({
        module: "stripe",
        action: "stripe.webhook.processing_failed",
        message: "Stripe webhook processing failed",
        stripeEventId: event.id,
        stripeEventType: event.type,
        error: { message: error.message, code: error.code },
      });
    } else {
      console.error("Stripe webhook processing error:", error);
    }

    return res.status(500).send("Webhook processing failed");
  }
});

module.exports = router;

