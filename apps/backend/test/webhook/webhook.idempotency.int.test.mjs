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
const webhookCounters = require("../../src/infra/webhookCounters");
const { prisma, dbReset } = require("../utils/db");
const { makeCheckoutCompletedEvent } = require("../utils/stripeMock");

describe("POST /webhook — idempotence", () => {
  beforeEach(async () => {
    await dbReset();
    vi.restoreAllMocks();
  });

  it("processes the same stripeSessionId only once (DB idempotence)", async () => {
    const stripeSessionId = "cs_test_idempotent";
    const stripeEventId1 = "evt_test_once_1";
    const stripeEventId2 = "evt_test_once_2";

    await prisma.booking.create({
      data: {
        firstName: "John",
        lastName: "Doe",
        email: "john@doe.com",
        date: "2026-01-30",
        time: "10:00",
        status: "en attente",
        stripeSessionId,
        stripePaymentIntentId: "pi_test_1",
        amountTotal: 6000,
        currency: "eur",
      },
    });

    // 1st webhook: eventId #1
    vi.spyOn(stripe.webhooks, "constructEvent").mockReturnValueOnce(
      makeCheckoutCompletedEvent({ stripeEventId: stripeEventId1, stripeSessionId })
    );

    // 2nd webhook: eventId #2 (Stripe can retry with a new event id depending on scenario)
    stripe.webhooks.constructEvent.mockReturnValueOnce(
      makeCheckoutCompletedEvent({ stripeEventId: stripeEventId2, stripeSessionId })
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

    // ✅ With P0 hardening, DB enforces one processed event per stripeSessionId
    const events = await prisma.paymentEvent.findMany({
      where: { stripeSessionId },
    });
    expect(events.length).toBe(1);
    expect(events[0].stripeSessionId).toBe(stripeSessionId);

    const bookingAfter = await prisma.booking.findFirst({
      where: { stripeSessionId },
    });

    expect(bookingAfter).not.toBeNull();
    expect(bookingAfter.status).toBe("payé");

    const counters = webhookCounters.snapshot();
    expect(counters.duplicates).toBe(1);
  });
});

