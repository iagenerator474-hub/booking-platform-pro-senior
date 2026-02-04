import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const app = require("../../src/app");
const { prisma, dbReset } = require("../utils/db");
const { hashPassword } = require("../../src/auth/password");

describe("POST /auth/login — inactive user", () => {
  beforeEach(async () => {
    await dbReset();
    await prisma.user.deleteMany({});
  });

  it("returns 401 for a user with isActive=false (generic error message)", async () => {
    const email = "inactive@example.com";
    const password = "SuperSecret123";

    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "ADMIN",
        isActive: false,
      },
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ email, password })
      .expect(401);

    expect(res.body).toEqual({ error: "Identifiants invalides" });
  });
});

