const express = require("express");
const router = express.Router();

const requireAuth = require("../../middlewares/requireAuth");
const requireRole = require("../auth/requireRole");
const { prisma } = require("../../infra/prisma");

/**
 * GET /payments
 * Ledger Stripe (PaymentEvent) – ADMIN/OPS
 */
router.get(
  "/payments",
  requireAuth,
  requireRole("ADMIN", "OPS"),
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit || "100", 10) || 100, 500);

      const events = await prisma.paymentEvent.findMany({
        orderBy: { processedAt: "desc" },
        take: limit,
      });

      const items = events.map((e) => ({
        id: e.id,
        stripeEventId: e.stripeEventId,
        type: e.type,
        stripeSessionId: e.stripeSessionId,
        bookingId: e.bookingId,
        processedAt: e.processedAt,
      }));

      res.json({ items, meta: { count: items.length } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
