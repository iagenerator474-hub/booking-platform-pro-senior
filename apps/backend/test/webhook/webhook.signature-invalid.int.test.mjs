import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const app = require("../../src/app");
const webhookController = require("../../src/modules/payment/webhook.controller");
const { prisma, dbReset } = require("../utils/db");

describe("POST /webhook — signature invalid", () => {
  beforeEach(async () => {
    await dbReset();
    vi.restoreAllMocks();
  });

  it("returns 400 and does not write any PaymentEvent when signature is invalid", async () => {
    vi.spyOn(webhookController, "verifyStripeEvent").mockImplementation(() => {
      throw new Error("Invalid signature (test)");
    });

    const payload = Buffer.from(JSON.stringify({ any: "raw" }));

    const res = await request(app)
      .post("/webhook")
      .set("stripe-signature", "t=1,v1=fake")
      .set("content-type", "application/json")
      .send(payload);

    expect(res.status).toBe(400);

    const events = await prisma.paymentEvent.findMany();
    expect(events.length).toBe(0);
  });
});

