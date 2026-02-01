const { hashPassword, verifyPassword } = require("./password");

test("hash + verify password", async () => {
  const password = "super-secret";
  const hash = await hashPassword(password);

  expect(hash).not.toBe(password);
  expect(await verifyPassword(password, hash)).toBe(true);
  expect(await verifyPassword("wrong", hash)).toBe(false);
});
