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

describe("POST /webhook — no booking", () => {
  beforeEach(async () => {
    await dbReset();
    vi.restoreAllMocks();
  });

  it("creates a PaymentEvent with bookingId=null when no booking matches", async () => {
    const stripeSessionId = "cs_test_unknown";
    const stripeEventId = "evt_test_unknown";

    vi.spyOn(stripe.webhooks, "constructEvent").mockReturnValue(
      makeCheckoutCompletedEvent({ stripeEventId, stripeSessionId })
    );

    const payload = Buffer.from(JSON.stringify({ any: "raw" }));

    const r = await request(app)
      .post("/webhook")
      .set("stripe-signature", "t=1,v1=fake")
      .set("content-type", "application/json")
      .send(payload);

    expect(r.status).toBeGreaterThanOrEqual(200);
    expect(r.status).toBeLessThan(300);

    const evt = await prisma.paymentEvent.findUnique({
      where: { stripeEventId },
    });

    expect(evt).not.toBeNull();
    expect(evt.bookingId).toBeNull();
    expect(evt.stripeSessionId).toBe(stripeSessionId);
  });
});
