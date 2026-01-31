import { vi } from "vitest";

// ✅ Mock du module stripe config utilisé par booking.controller / webhook.controller
vi.mock("../src/config/stripe", () => ({
  default: {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/pay/cs_test_123",
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));
