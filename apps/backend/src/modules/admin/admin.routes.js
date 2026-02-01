const express = require("express");
const router = express.Router();

const requireAuth = require("../auth/requireAuth");
const requireRole = require("../auth/requireRole");

const webhookCounters = require("../../infra/webhookCounters");

/**
 * GET /admin/metrics
 * Minimal observability snapshot – RBAC protected
 */
router.get("/metrics", requireAuth, requireRole("ADMIN", "OPS"), (req, res) => {
  res.json({ webhook: webhookCounters.snapshot() });
});

module.exports = router;

