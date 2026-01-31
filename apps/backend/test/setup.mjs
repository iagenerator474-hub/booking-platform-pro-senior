import { vi } from "vitest";

// Mock Stripe config AVANT tout import de l’app
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
      constructEvent: vi.fn(), // utile si jamais une suite l’utilise
    },
  },
}));
