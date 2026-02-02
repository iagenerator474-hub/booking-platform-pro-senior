import request from "supertest";
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app");

describe("POST /webhook — missing signature", () => {
  it("returns 400 when Stripe-Signature header is missing", async () => {
    const payload = Buffer.from(JSON.stringify({ any: "raw" }));

    const res = await request(app)
      .post("/webhook")
      .set("content-type", "application/json")
      .send(payload);

    expect(res.status).toBe(400);
  });
});
