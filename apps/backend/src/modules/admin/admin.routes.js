const express = require("express");
const router = express.Router();

const requireAuthApi = require("../../middlewares/requireAuthApi");
const requireRole = require("../auth/requireRole");

const webhookCounters = require("../../infra/webhookCounters");
const { snapshotRuntime } = require("../../infra/runtimeMetrics");
const { APP_VERSION } = require("../../config/env");

/**
 * GET /admin/metrics
 * Minimal observability snapshot – RBAC protected
 */
router.get("/metrics", requireAuthApi, requireRole("ADMIN", "OPS"), (req, res) => {
  res.json({
    webhook: webhookCounters.snapshot(),
    runtime: snapshotRuntime({ appVersion: APP_VERSION }),
  });
});

module.exports = router;

