const bcrypt = require("bcryptjs");

// In-memory users for Step 1 (no DB yet).
// ✅ Production note: move this to Prisma + SQL at Step 2, store only password hashes.
function getUsersFromEnv() {
  const adminEmail = process.env.AUTH_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.AUTH_ADMIN_PASSWORD || "admin1234";

  // If AUTH_ADMIN_PASSWORD is already a bcrypt hash, bcrypt.compare will work.
  // If it's plain text, we will compare as plain text in service (dev/portfolio only).
  return [
    {
      id: "u_admin",
      email: adminEmail,
      role: "admin",
      password: adminPassword,
    },
  ];
}

function findByEmail(email) {
  const users = getUsersFromEnv();
  return users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

async function verifyPassword(user, candidatePassword) {
  if (!user) return false;
  const stored = user.password;

  // bcrypt hash detection (starts with $2a/$2b/$2y)
  if (typeof stored === "string" && stored.startsWith("$2")) {
    return bcrypt.compare(String(candidatePassword), stored);
  }

  // Dev fallback (portfolio Step 1): plain text compare
  return String(candidatePassword) === String(stored);
}

module.exports = { findByEmail, verifyPassword };
