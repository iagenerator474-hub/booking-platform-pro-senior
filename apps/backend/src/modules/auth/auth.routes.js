const express = require("express");
const router = express.Router();
const controller = require("./auth.controller");
const { z } = require("zod");
const { validateBody } = require("../../middlewares/validate");
const { loginLimiter } = require("../../middlewares/rateLimit");
const requireAuth = require("../../middlewares/requireAuth");

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

router.post("/login", loginLimiter, validateBody(loginSchema), controller.login);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);

module.exports = router;
