const express = require("express");
const router = express.Router();
const controller = require("./booking.controller");
const { z } = require("zod");
const { validateBody } = require("../../middlewares/validate");
const requireAuthApi = require("../../middlewares/requireAuthApi");

const checkoutSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email(),
  date: z.string().trim().min(1).max(32),
  time: z.string().trim().min(1).max(32),
});


// ✅ lecture admin protégée (401 JSON if unauthenticated)
router.get("/reservations", requireAuthApi, controller.listReservations);

// ✅ checkout public
router.post("/create-checkout-session", validateBody(checkoutSchema), controller.createCheckoutSession);

// Alias API "pro" (optionnels)
router.get("/api/bookings", requireAuthApi, controller.listReservations);
router.post("/api/bookings", validateBody(checkoutSchema), controller.createCheckoutSession);

module.exports = router;
