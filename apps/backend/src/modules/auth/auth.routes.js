const express = require("express");
const { z } = require("zod");

const controller = require("./auth.controller");
const { validateBody } = require("../../middlewares/validate");
const { loginLimiter } = require("../../middlewares/rateLimit");
const requireAuth = require("../../middlewares/requireAuth"); // API-friendly (401 JSON)

const router = express.Router();

/**
 * ------------------------------------------------------------
 * Schemas
 * ------------------------------------------------------------
 */
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

/**
 * ------------------------------------------------------------
 * Routes
 * ------------------------------------------------------------
 */

// Login (rate-limited + validated)
router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  controller.login
);

// Logout (session destroy)
router.post("/logout", controller.logout);

// Current session user (API-safe)
router.get("/me", requireAuth, controller.me);

module.exports = router;
