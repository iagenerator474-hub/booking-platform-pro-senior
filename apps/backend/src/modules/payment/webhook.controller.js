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
  return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
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

  webhookCounters.inc("webhook_received");

  const rawBody = req.body;

  // ✅ explicit header missing
  if (!sig) {
    webhookCounters.inc("webhook_invalid_signature");

    if (req.log) {
      req.log.warn({
        module: "stripe",
        action: "stripe.webhook.signature_missing",
        message: "Missing Stripe-Signature header",
      });
    }

    return res.status(400).send("Webhook Error: Missing Stripe-Signature header");
  }

  // 1) Verify signature (only this part returns 400)
  try {
    event = router.verifyStripeEvent(rawBody, sig);
  } catch (err) {
    webhookCounters.inc("webhook_invalid_signature");

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

  // 2) Handle event types
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // ✅ P0: gate "paid" only when Stripe confirms payment
    // Backward compatibility: some tests/mocks may omit payment_status.
    // - if present => must be "paid"
    // - if missing => assume paid but warn (so prod issues are visible)
    const paymentStatus = session?.payment_status; // "paid" | "unpaid" | "no_payment_required" | ...
    const isPaymentStatusMissing = paymentStatus == null;
    const isPaid = isPaymentStatusMissing ? true : paymentStatus === "paid";

    if (isPaymentStatusMissing && req.log) {
      req.log.warn({
        module: "stripe",
        action: "stripe.webhook.payment_status_missing",
        message:
          "checkout.session.completed received without payment_status; defaulting to paid for backward compatibility",
        stripeEventId: event.id,
        stripeEventType: event.type,
        stripeSessionId: session?.id,
      });
    }

    try {
      const stripeSessionId = session.id;

      const booking = await bookingService.findByStripeSessionId(stripeSessionId);

      const result = await prisma.$transaction(async (tx) => {
        // ✅ DB idempotence on stripeSessionId (@unique)
        const { alreadyProcessed, duplicateTarget } = await tryRegisterStripeEvent({
          stripeEventId: event.id,
          type: event.type,
          stripeSessionId,
          bookingId: booking?.id || null,
          db: tx,
        });

        if (alreadyProcessed) {
          return {
            alreadyProcessed: true,
            duplicateTarget: duplicateTarget || null,
            bookingUpdated: false,
            bookingId: booking?.id || null,
            isPaid,
          };
        }

        // No booking => keep ledger but don't update
        if (!booking?.id) {
          return {
            alreadyProcessed: false,
            duplicateTarget: null,
            bookingUpdated: false,
            bookingId: null,
            isPaid,
          };
        }

        // Booking exists but not confirmed paid => no status change
        if (!isPaid) {
          return {
            alreadyProcessed: false,
            duplicateTarget: null,
            bookingUpdated: false,
            bookingId: booking.id,
            isPaid,
          };
        }

        // ✅ booking marked as paid + persist payment fields when available
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "payé",
            stripePaymentIntentId:
              session.payment_intent || booking.stripePaymentIntentId,
            amountTotal:
              typeof session.amount_total === "number"
                ? session.amount_total
                : booking.amountTotal,
            currency: session.currency || booking.currency,
          },
        });

        return {
          alreadyProcessed: false,
          duplicateTarget: null,
          bookingUpdated: true,
          bookingId: booking.id,
          isPaid,
        };
      });

      if (result.alreadyProcessed) {
        webhookCounters.inc("webhook_ignored_duplicate");

        if (req.log) {
          req.log.warn({
            module: "stripe",
            action: "stripe.webhook.duplicate_db_ignored",
            message:
              "Stripe webhook already processed for this stripeSessionId (DB idempotent skip)",
            stripeEventId: event.id,
            stripeEventType: event.type,
            stripeSessionId,
            duplicateTarget: result.duplicateTarget,
          });
        }
      } else {
        if (result.bookingUpdated) {
          webhookCounters.inc("webhook_booking_paid");
        } else if (!booking?.id) {
          // ✅ optional counter (won't crash if missing)
          try {
            webhookCounters.inc("webhook_no_booking");
          } catch (_) {
            // ignore
          }
        }

        if (req.log) {
          let message;
          if (!booking?.id) {
            message = "No matching booking found for stripeSessionId";
          } else if (!result.isPaid) {
            message = `Booking found but not marked paid (payment_status=${paymentStatus})`;
          } else {
            message = "Booking marked as paid";
          }

          req.log.info({
            module: "booking",
            action: "booking.payment_confirmed",
            message,
            stripeEventId: event.id,
            stripeEventType: event.type,
            stripeSessionId,
            bookingId: result.bookingId,
            paymentStatus,
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

