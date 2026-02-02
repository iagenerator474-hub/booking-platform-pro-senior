const express = require("express");
const router = express.Router();

const stripe = require("../../config/stripe");
const { STRIPE_WEBHOOK_SECRET } = require("../../config/env");

const bookingService = require("../booking/booking.service");
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
        // ✅ P0 hardening: DB idempotence now effectively works on stripeSessionId (@unique)
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
        if (req.log) {
          req.log.warn({
            module: "stripe",
            action: "stripe.webhook.duplicate_db_ignored",
            message:
              "Stripe webhook already processed for this stripeSessionId (DB idempotent skip)",
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
            message: result.bookingUpdated
              ? "Booking marked as paid"
              : "No matching booking found for stripeSessionId",
            stripeEventId: event.id,
            stripeEventType: event.type,
            stripeSessionId,
            bookingId: result.bookingId,
          });
        }
      }
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
  }

  return res.json({ received: true });
});

module.exports = router;
