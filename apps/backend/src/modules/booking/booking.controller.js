const bookingService = require("./booking.service");
const stripeService = require("../payment/stripe.service");

// helper: supporte JSON (sync) et DB (async)
const asPromise = (v) => Promise.resolve(v);

async function createCheckoutSession(req, res) {
  try {
    const { firstName, lastName, email, date, time } = req.body;

    if (req.log) {
      req.log.info({
        module: "booking",
        action: "booking.checkout_session.requested",
        message: "Checkout session requested",
        email,
        date,
        time,
      });
    }

    // 1) Create Stripe session first (source of truth: session.id)
    const { url, stripeSessionId } = await stripeService.createCheckoutSession({
      email,
      date,
      time,
    });

    // 2) Store Booking in DB with stripeSessionId (reliable linkage)
    // ✅ FIX CRITIQUE : en DB c'est async → il faut await
    const booking = await asPromise(
      bookingService.createPending({ firstName, lastName, email, date, time, stripeSessionId })
    );

    if (req.log) {
      req.log.info({
        module: "booking",
        action: "booking.pending_created",
        message: "Pending booking stored",
        bookingId: booking?.id,
        email: booking?.email,
        date: booking?.date,
        time: booking?.time,
        status: booking?.status,
      });
    }

    if (req.log) {
      req.log.info({
        module: "payment",
        action: "stripe.checkout_session.created",
        message: "Stripe Checkout session created",
        email,
        date,
        time,
        stripeSessionId,
      });
    }

    return res.json({ url, stripeSessionId });

  } catch (e) {
    if (req.log) {
      req.log.error({
        module: "booking",
        action: "booking.checkout_session.failed",
        message: "Failed to create checkout session",
        error: { message: e?.message, code: e?.code, stack: e?.stack },
      });
    }
    return res.status(e?.status || 500).json({
      error: "internal_error",
      message: e?.message || "Something went wrong",
      requestId: req.requestId,
    });
  }
}

async function listReservations(req, res) {
  try {
    // ✅ en DB c'est async
    const items = await asPromise(bookingService.list());
    return res.json({ items, meta: { count: items?.length ?? 0 } });
  } catch (e) {
    if (req.log) {
      req.log.error({
        module: "booking",
        action: "booking.list_failed",
        message: "Failed to list reservations",
        error: { message: e?.message, code: e?.code, stack: e?.stack },
      });
    }
    return res.status(500).json({
      error: "internal_error",
      message: "Something went wrong",
      requestId: req.requestId,
    });
  }
}

module.exports = { createCheckoutSession, listReservations };

