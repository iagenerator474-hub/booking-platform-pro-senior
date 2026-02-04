const express = require("express");
const router = express.Router();

const requireAuthApi = require("../../middlewares/requireAuthApi");
const requireRole = require("../auth/requireRole");

const webhookCounters = require("../../infra/webhookCounters");

/**
 * GET /admin/metrics
 * Minimal observability snapshot – RBAC protected
 */
router.get("/metrics", requireAuthApi, requireRole("ADMIN", "OPS"), (req, res) => {
  res.json({ webhook: webhookCounters.snapshot() });
});

module.exports = router;

