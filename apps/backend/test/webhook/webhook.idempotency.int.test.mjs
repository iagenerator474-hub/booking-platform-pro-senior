import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ✅ mock Stripe module used by backend code
vi.mock("../../src/config/stripe", () => ({
  checkout: { sessions: { create: vi.fn() } },
  webhooks: { constructEvent: vi.fn() },
}));

const stripe = require("../../src/config/stripe");
const app = require("../../src/app");
const { prisma, dbReset } = require("../utils/db");
const { makeCheckoutCompletedEvent } = require("../utils/stripeMock");

describe("POST /webhook — idempotence", () => {
  beforeEach(async () => {
    await dbReset();
    vi.restoreAllMocks();
  });

  it("processes the same stripeEventId only once", async () => {
    const stripeSessionId = "cs_test_idempotent";
    const stripeEventId = "evt_test_once";

    await prisma.booking.create({
      data: {
        firstName: "John",
        lastName: "Doe",
        email: "john@doe.com",
        date: "2026-01-30", // ✅ schema expects String
        time: "10:00",
        status: "en attente",
        stripeSessionId,
        stripePaymentIntentId: "pi_test_1",
        amountTotal: 6000,
        currency: "eur",
      },
    });

    vi.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(
      makeCheckoutCompletedEvent({ stripeEventId, stripeSessionId })
    );

    const payload = Buffer.from(JSON.stringify({ any: "raw" }));

    const r1 = await request(app)
      .post("/webhook")
      .set("stripe-signature", "t=1,v1=fake")
      .set("content-type", "application/json")
      .send(payload);

    const r2 = await request(app)
      .post("/webhook")
      .set("stripe-signature", "t=1,v1=fake")
      .set("content-type", "application/json")
      .send(payload);

    expect(r1.status).toBeGreaterThanOrEqual(200);
    expect(r1.status).toBeLessThan(300);
    expect(r2.status).toBeGreaterThanOrEqual(200);
    expect(r2.status).toBeLessThan(300);

    const events = await prisma.paymentEvent.findMany({
      where: { stripeEventId },
    });
    expect(events.length).toBe(1);

    const bookingAfter = await prisma.booking.findFirst({
  where: { stripeSessionId },
});

expect(bookingAfter).not.toBeNull();
expect(bookingAfter.status).toBe("payé");
  });
});
