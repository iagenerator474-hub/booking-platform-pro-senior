import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";
import { dbReset } from "../utils/db.js";

// IMPORTANT: utiliser require() pour récupérer EXACTEMENT la même instance que le code backend (CJS)
const require = createRequire(import.meta.url);
const stripeService = require("../../src/modules/payment/stripe.service");

// Spy + mock AVANT d'importer app (sinon le controller capture l'impl réelle)
vi.spyOn(stripeService, "createCheckoutSession").mockResolvedValue({
  url: "https://checkout.stripe.com/pay/cs_test_123",
  stripeSessionId: "cs_test_123",
});

// Import après le spy
const { default: app } = await import("../../src/app.js");

describe("POST /create-checkout-session", () => {
  beforeEach(async () => {
    await dbReset();
    vi.clearAllMocks(); // reset calls, garde le mockResolvedValue
  });

  it("returns { url, stripeSessionId } and calls stripeService with expected payload", async () => {
    const payload = {
      firstName: "John",
      lastName: "Doe",
      email: "john@doe.com",
      date: "2026-01-30",
      time: "10:00",
    };

    const res = await request(app)
      .post("/create-checkout-session")
      .send(payload)
      .expect(200);

    expect(res.body).toEqual({
      url: "https://checkout.stripe.com/pay/cs_test_123",
      stripeSessionId: "cs_test_123",
    });

    expect(stripeService.createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "john@doe.com",
        date: "2026-01-30",
        time: "10:00",
      })
    );
  });
});
