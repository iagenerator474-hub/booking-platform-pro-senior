import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const app = require("../../src/app");
const webhookController = require("../../src/modules/payment/webhook.controller");
const { prisma, dbReset } = require("../utils/db");

describe("POST /webhook — ACK policy", () => {
  beforeEach(async () => {
    await dbReset();
    vi.restoreAllMocks();
  });

  it("returns 500 when webhook processing fails after signature verification", async () => {
    // ✅ signature OK
    vi.spyOn(webhookController, "verifyStripeEvent").mockReturnValue({
      id: "evt_ack_failure",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_ack" } },
    });

    // ❌ DB down after signature OK
    vi.spyOn(prisma, "$transaction").mockRejectedValue(new Error("DB down"));

    const res = await request(app)
      .post("/webhook")
      .set("stripe-signature", "t=1,v1=fake")
      .set("content-type", "application/json")
      .send(Buffer.from(JSON.stringify({ any: "raw" })));

    expect(res.status).toBe(500);
  });
});

