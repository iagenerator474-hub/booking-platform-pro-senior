const express = require("express");
const router = express.Router();

const stripe = require("../../config/stripe");
const { STRIPE_WEBHOOK_SECRET } = require("../../config/env");

const bookingService = require("../booking/booking.service");
const { tryRegisterStripeEvent } = require("./payment-event.repository.db");
const { prisma } = require("../../infra/prisma");

// ✅ reuse existing rateLimit middleware (CJS-consistent)
const { stripeWebhookLimiter } = require("../../middlewares/rateLimit");
const webhookCounters = require("../../infra/webhookCounters");

/**
 * ✅ Signature verification isolated & injectable (mockable)
 */
function verifyStripeEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    STRIPE_WEBHOOK_SECRET
  );
}

// ✅ expose on router so tests can spy/mock it
router.verifyStripeEvent = verifyStripeEvent;

// 🔒 Rate-limited Stripe webhook (permissive)
router.post("/", stripeWebhookLimiter, async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  if (req.log) {
    req.log.info({
      module: "stripe",
      action: "stripe.webhook.http_received",
      message: "Stripe webhook HTTP request received",
    });
  }

  const rawBody = req.body;

  // 1) Verify signature (only this part returns 400)
  try {
    event = router.verifyStripeEvent(rawBody, sig);
  } catch (err) {
    webhookCounters.inc("errors");
    if (req.log) {
      req.log.warn({
        module: "stripe",
        action: "stripe.webhook.signature_invalid",
        outcome: "rejected",
        message: "Stripe webhook rejected: invalid signature",
        error: err,
      });
    }
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  webhookCounters.inc("received");

  if (req.log) {
    req.log.info({
      module: "stripe",
      action: "stripe.webhook.received",
      message: "Stripe webhook verified",
      stripeEventId: event.id,
      stripeEventType: event.type,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      const stripeSessionId = session.id;

      const booking = await Promise.resolve(
        bookingService.findByStripeSessionId
          ? bookingService.findByStripeSessionId(stripeSessionId)
          : null
      );

      const result = await prisma.$transaction(async (tx) => {
        // ✅ P0 hardening: DB idempotence on stripeSessionId (@unique)
        const { alreadyProcessed } = await tryRegisterStripeEvent({
          stripeEventId: event.id,
          type: event.type,
          stripeSessionId,
          bookingId: booking?.id || null,
          db: tx,
        });

        if (alreadyProcessed) {
          return {
            alreadyProcessed: true,
            bookingUpdated: false,
            bookingId: booking?.id || null,
          };
        }

        let bookingUpdated = false;
        if (booking?.id) {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: "payé" },
          });
          bookingUpdated = true;
        }

        return {
          alreadyProcessed: false,
          bookingUpdated,
          bookingId: booking?.id || null,
        };
      });

      if (result.alreadyProcessed) {
        webhookCounters.inc("duplicates");
        if (req.log) {
          req.log.warn({
            module: "stripe",
            action: "stripe.webhook.duplicate_db_ignored",
            outcome: "duplicate",
            message: "Stripe webhook already processed (idempotence)",
            stripeEventId: event.id,
            stripeEventType: event.type,
            stripeSessionId,
          });
        }
      } else {
        if (req.log) {
          req.log.info({
            module: "booking",
            action: "booking.payment_confirmed",
            outcome: "processed",
            message: "Stripe webhook processed for the first time",
            stripeEventId: event.id,
            stripeEventType: event.type,
            stripeSessionId,
            bookingId: result.bookingId,
            bookingUpdated: result.bookingUpdated,
          });
        }
      }
    } catch (error) {
      webhookCounters.inc("errors");
      // ✅ Strict ACK policy: 500 => Stripe retries
      if (req.log) {
        req.log.error({
          module: "stripe",
          action: "stripe.webhook.processing_failed",
          outcome: "rejected",
          message: "Stripe webhook rejected: processing error",
          stripeEventId: event.id,
          stripeEventType: event.type,
          error,
        });
      } else {
        console.error("Stripe webhook processing error:", error);
      }

      return res.status(500).send("Webhook processing failed");
    }
  }

  if (req.log) {
    req.log.info({
      module: "stripe",
      action: "stripe.webhook.acknowledged",
      outcome: "processed",
      message: "Stripe webhook acknowledged (event type not handled)",
      stripeEventId: event.id,
      stripeEventType: event.type,
    });
  }
  return res.json({ received: true });
});

module.exports = router;
