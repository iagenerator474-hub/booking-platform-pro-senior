const express = require("express");
const { z } = require("zod");

const controller = require("./auth.controller");
const { validateBody } = require("../../middlewares/validate");
const { loginLimiter } = require("../../middlewares/rateLimit");
const requireAuthApi = require("../../middlewares/requireAuthApi");

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

// Current session user (API-safe, 401 JSON if unauthenticated)
router.get("/me", requireAuthApi, controller.me);

module.exports = router;
